import uuid
import json
import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.database.connection import get_db
from app.services.retrieval.hybrid_retriever import get_retriever
from app.services.generation.answer_generator import get_answer_generator
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationResponse,
    MessageItem,
    CitationEvidence
)

router = APIRouter(prefix="", tags=["chat"])

@router.post("/chat", response_model=ChatResponse)
def chat_query(request: ChatRequest):
    retriever = get_retriever()
    generator = get_answer_generator()

    conv_id = request.conversation_id or str(uuid.uuid4())
    doc_scope = request.selected_document_ids if request.selected_document_ids else None

    # Load conversation history if existing
    history = []
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 6", (conv_id,))
        for r in cursor.fetchall():
            history.append({"role": r["role"], "content": r["content"]})

    # 1. Retrieve multimodal evidence
    ret_start = time.time()
    retrieved_sources = retriever.retrieve(
        query=request.question,
        top_k=5,
        document_ids=doc_scope
    )
    ret_latency = (time.time() - ret_start) * 1000

    # 2. Generate grounded answer
    answer, citations, gen_latency, grounding_status = generator.generate_answer(
        question=request.question,
        retrieved_sources=retrieved_sources,
        conversation_history=history,
        mode=request.mode or "general"
    )

    # 3. Persist conversation and messages to SQLite
    created_at = time.strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as db:
        cursor = db.cursor()
        # Ensure conversation exists
        cursor.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,))
        if not cursor.fetchone():
            # Derive title from first question
            title = request.question[:45] + ("..." if len(request.question) > 45 else "")
            cursor.execute(
                "INSERT INTO conversations (id, title, selected_docs, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (conv_id, title, json.dumps(doc_scope or []), created_at, created_at)
            )
        else:
            cursor.execute(
                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (conv_id,)
            )

        # Insert user message
        user_msg_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO messages (id, conversation_id, role, content, citations_json, created_at)
            VALUES (?, ?, 'user', ?, '[]', ?)
            """,
            (user_msg_id, conv_id, request.question, created_at)
        )

        # Insert assistant message
        asst_msg_id = str(uuid.uuid4())
        citations_json = json.dumps([c for c in citations])
        cursor.execute(
            """
            INSERT INTO messages (
                id, conversation_id, role, content, citations_json,
                retrieval_latency_ms, generation_latency_ms, grounding_status, created_at
            ) VALUES (?, ?, 'assistant', ?, ?, ?, ?, ?, ?)
            """,
            (
                asst_msg_id, conv_id, answer, citations_json,
                round(ret_latency, 2), round(gen_latency, 2), grounding_status, created_at
            )
        )

    citation_models = [CitationEvidence(**c) for c in citations]

    return ChatResponse(
        conversation_id=conv_id,
        message_id=asst_msg_id,
        question=request.question,
        answer=answer,
        citations=citation_models,
        retrieval_latency_ms=round(ret_latency, 2),
        generation_latency_ms=round(gen_latency, 2),
        grounding_status=grounding_status,
        created_at=created_at
    )

@router.get("/conversations", response_model=List[dict])
def list_conversations():
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("""
            SELECT c.id, c.title, c.selected_docs, c.created_at, c.updated_at,
                   COUNT(m.id) as message_count
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        """)
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "selected_docs": json.loads(r["selected_docs"]) if r["selected_docs"] else [],
                "message_count": r["message_count"],
                "created_at": str(r["created_at"]),
                "updated_at": str(r["updated_at"])
            }
            for r in cursor.fetchall()
        ]

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str):
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,))
        conv = cursor.fetchone()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        cursor.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conversation_id,))
        msg_rows = cursor.fetchall()

    messages = []
    for m in msg_rows:
        raw_cits = json.loads(m["citations_json"]) if m["citations_json"] else []
        citations = [CitationEvidence(**c) for c in raw_cits]
        messages.append(MessageItem(
            id=m["id"],
            conversation_id=m["conversation_id"],
            role=m["role"],
            content=m["content"],
            citations=citations,
            retrieval_latency_ms=m["retrieval_latency_ms"] or 0.0,
            generation_latency_ms=m["generation_latency_ms"] or 0.0,
            grounding_status=m["grounding_status"] or "grounded",
            created_at=str(m["created_at"])
        ))

    return ConversationResponse(
        id=conv["id"],
        title=conv["title"],
        selected_docs=json.loads(conv["selected_docs"]) if conv["selected_docs"] else [],
        created_at=str(conv["created_at"]),
        updated_at=str(conv["updated_at"]),
        messages=messages
    )

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    with get_db() as db:
        cursor = db.cursor()
        cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    return {"message": "Conversation deleted successfully"}
