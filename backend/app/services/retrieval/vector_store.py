import chromadb
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.services.embeddings import get_embedding_provider

class ChromaVectorStore:
    def __init__(self):
        # Persistent storage in private app directory
        self.client = chromadb.PersistentClient(path=str(settings.CHROMA_DIR))
        self.collection_name = "multimodal_rag_docs"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "Multimodal RAG Studio document chunks and visual context"}
        )

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        if not chunks:
            return

        embedding_provider = get_embedding_provider()
        texts = [c["text_content"] for c in chunks]
        embeddings = embedding_provider.embed_documents(texts)
        
        ids = [c["id"] for c in chunks]
        metadatas = [
            {
                "document_id": c["document_id"],
                "page_number": int(c["page_number"]),
                "chunk_index": int(c["chunk_index"]),
                "content_type": c.get("content_type", "text"),
                "is_evaluation": 1 if (
                    (isinstance(c.get("metadata_json"), dict) and c["metadata_json"].get("is_evaluation"))
                    or c.get("content_type") == "evaluation_question"
                ) else 0
            }
            for c in chunks
        ]

        # Chroma upsert ensures idempotency
        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=texts
        )

    def delete_document_chunks(self, document_id: str):
        """Remove all chunks associated with a deleted document."""
        try:
            self.collection.delete(where={"document_id": document_id})
        except Exception:
            pass

    def search(
        self,
        query: str,
        top_k: int = 5,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for top_k relevant chunks with optional document ID filtering.
        """
        embedding_provider = get_embedding_provider()
        query_vec = embedding_provider.embed_query(query)

        where_filter = None
        if document_ids:
            if len(document_ids) == 1:
                where_filter = {"document_id": document_ids[0]}
            else:
                where_filter = {"document_id": {"$in": document_ids}}

        total_in_db = self.collection.count()
        if total_in_db == 0:
            return []

        actual_k = min(top_k, total_in_db)

        results = self.collection.query(
            query_embeddings=[query_vec],
            n_results=actual_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        ranked = []
        if results and results.get("ids") and results["ids"][0]:
            count = len(results["ids"][0])
            for i in range(count):
                chunk_id = results["ids"][0][i]
                doc_text = results["documents"][0][i] if results.get("documents") else ""
                meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                distance = results["distances"][0][i] if results.get("distances") else 1.0
                
                # Convert distance (L2 or cosine) to a standardized normalized relevance score (0.0 to 1.0)
                relevance_score = max(0.0, min(1.0, 1.0 / (1.0 + float(distance))))
                
                is_eval = meta.get("is_evaluation", 0)
                ranked.append({
                    "id": chunk_id,
                    "document_id": meta.get("document_id", ""),
                    "page_number": meta.get("page_number", 1),
                    "chunk_index": meta.get("chunk_index", 0),
                    "content_type": meta.get("content_type", "text"),
                    "is_evaluation": is_eval,
                    "text_content": doc_text,
                    "relevance_score": round(relevance_score, 4),
                    "raw_distance": round(float(distance), 4)
                })

        return ranked

    def count(self) -> int:
        return self.collection.count()

_vector_store_instance = None

def get_vector_store() -> ChromaVectorStore:
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = ChromaVectorStore()
    return _vector_store_instance
