import re
from typing import List, Dict, Any, Optional
from app.services.retrieval.vector_store import get_vector_store
from app.database.connection import get_db

STOPWORDS = {
    "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
    "the", "and", "for", "with", "about", "are", "you", "can", "is", "in",
    "at", "by", "from", "to", "of", "on", "does", "did", "do", "this",
    "that", "these", "those", "according", "report", "document", "please", "tell", "me"
}

class HybridRetriever:
    def __init__(self):
        self.vector_store = get_vector_store()

    def retrieve(
        self,
        query: str,
        top_k: int = 5,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute hybrid search:
        1. Dense vector semantic retrieval with expanded candidate pool.
        2. Query entity recognition (identifiers, years, quarters, comparative metrics).
        3. Authoritative evidence reranking:
           - Prioritize primary data tables and core narrative over evaluation questionnaires.
           - Boost exact identifier matches (e.g., RK-07, RE-001).
           - Boost single-line entity + metric co-occurrence (e.g., Year 2025 + Solar capacity index).
        4. Near-duplicate deduplication.
        5. Metadata enrichment with document names and page image preview URLs.
        """
        # Step 1: Candidate retrieval with expanded pool
        candidate_k = min(40, max(top_k * 4, 20))
        vector_results = self.vector_store.search(
            query=query,
            top_k=candidate_k,
            document_ids=document_ids
        )

        if not vector_results:
            return []

        # Step 2: Extract query entities & keywords
        q_lower = query.lower()
        raw_tokens = re.findall(r'\b[a-zA-Z0-9_-]{2,}\b', q_lower)
        query_terms = [t for t in raw_tokens if t not in STOPWORDS]

        # Extract specific entity patterns
        ids_in_query = [i.upper() for i in re.findall(r'\b(RK-\d+|RE-\d+|AR-\d+|Table\s+\d+(?:\.\d+)?|Section\s+\d+)\b', query, re.IGNORECASE)]
        years_in_query = re.findall(r'\b(19\d\d|20\d\d)\b', query)
        quarters_in_query = [q.upper() for q in re.findall(r'\b(Q[1-4])\b', query, re.IGNORECASE)]
        has_quarter_intent = bool(quarters_in_query or "quarter" in q_lower)
        has_extrema_intent = bool(re.search(r'\b(lowest|highest|minimum|maximum|most|least)\b', q_lower))
        has_region_intent = bool(re.search(r'\b(region|regional|east|west|north|south)\b', q_lower))
        
        target_metrics = [m for m in [
            "solar", "wind", "hydro", "bioenergy", "capacity", "generation",
            "index", "mitigation", "risk", "delay", "growth", "grid"
        ] if m in q_lower]

        # Step 3: Fetch document names from DB for citations
        doc_names_map = {}
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT id, filename FROM documents")
            for row in cursor.fetchall():
                doc_names_map[row["id"]] = row["filename"]

        scored_candidates = []
        for r in vector_results:
            text = r["text_content"]
            text_lower = text.lower()
            lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

            # Determine whether this chunk is from an evaluation questionnaire section
            is_eval = bool(
                r.get("is_evaluation") == 1
                or r.get("content_type") == "evaluation_question"
                or "evaluation test reference" in text_lower
                or "evaluation questions for rag testing" in text_lower
                or "questionnaire / evaluation" in text_lower
            )

            # Base semantic score (calibrated 0.0 - 1.0)
            base_score = float(r.get("relevance_score", 0.5))

            # Lexical keyword overlap score
            term_matches = sum(1 for term in query_terms if term in text_lower)
            lexical_ratio = (term_matches / len(query_terms)) if query_terms else 0.0

            # Dynamic reranking score adjustments
            boost = 0.0

            # 1. Exact Identifier Matching (e.g. RK-07, Table 4.1)
            if ids_in_query:
                matched_id = any(eid.lower() in text_lower for eid in ids_in_query)
                if matched_id:
                    boost += 0.40
                else:
                    boost -= 0.15

            # 2. Year & Target Metric Co-occurrence
            if years_in_query:
                has_queried_year = any(yr in text for yr in years_in_query)
                if has_queried_year:
                    # Check if year and target metric co-occur in the same line or row
                    cooccur_line = False
                    for line in lines:
                        line_lower = line.lower()
                        if any(yr in line for yr in years_in_query) and any(m in line_lower for m in target_metrics):
                            cooccur_line = True
                            break
                    if cooccur_line:
                        boost += 0.35  # High-confidence structured tabular record
                    else:
                        boost += 0.10
                else:
                    # Query asked for a specific year, but chunk doesn't have it
                    boost -= 0.20

            # 3. Quarter Breakdown Matching
            if has_quarter_intent:
                has_quarter_data = bool(re.search(r'\b(Q1|Q2|Q3|Q4)\b', text, re.IGNORECASE))
                if has_quarter_data and any(m in text_lower for m in ["generation", "solar", "wind"]):
                    boost += 0.30

            # 4. Regional & Extrema Matching
            if has_region_intent or has_extrema_intent:
                has_regional_table = any(reg in text_lower for reg in ["north", "south", "east", "west"]) and "region" in text_lower
                if has_regional_table:
                    if r.get("content_type") == "table":
                        boost += 0.35  # Structured table for regional comparison
                    else:
                        boost += 0.15

            # 5. Authoritative Primary Evidence vs Synthetic Questionnaire
            if is_eval:
                # Evaluation questions section should not supersede authoritative primary data tables
                boost -= 0.25
            else:
                if r.get("content_type") == "table":
                    boost += 0.20  # Primary structured table
                else:
                    boost += 0.10  # Primary narrative text

            # Final calibrated score
            final_score = max(0.05, min(0.99, (base_score * 0.45) + (lexical_ratio * 0.20) + boost))

            doc_id = r["document_id"]
            page_num = r["page_number"]
            doc_name = doc_names_map.get(doc_id, f"Document-{doc_id[:6]}")
            image_url = f"/api/documents/{doc_id}/pages/{page_num}/image"

            scored_candidates.append({
                "document_id": doc_id,
                "document_name": doc_name,
                "page_number": page_num,
                "chunk_index": r["chunk_index"],
                "content_type": r["content_type"],
                "is_evaluation": is_eval,
                "excerpt": text,
                "relevance_score": round(final_score, 4),
                "image_url": image_url
            })

        # Step 4: Sort candidates by reranked score
        scored_candidates.sort(key=lambda x: x["relevance_score"], reverse=True)

        # Step 5: Deduplication - Avoid returning duplicate near-identical chunks from same page
        deduped = []
        seen_keys = set()
        for cand in scored_candidates:
            # Key by (doc_id, page_number, content_type)
            key = (cand["document_id"], cand["page_number"], cand["content_type"])
            if key in seen_keys and len(deduped) >= 2:
                # Allow maximum 1 chunk per (page, content_type) unless candidate pool is small
                continue
            seen_keys.add(key)
            deduped.append(cand)

        return deduped[:top_k]

_retriever_instance = None

def get_retriever() -> HybridRetriever:
    global _retriever_instance
    if _retriever_instance is None:
        _retriever_instance = HybridRetriever()
    return _retriever_instance
