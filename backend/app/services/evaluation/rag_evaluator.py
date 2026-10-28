import time
import uuid
from typing import List, Dict, Any, Optional
from app.database.connection import get_db
from app.services.retrieval.hybrid_retriever import get_retriever
from app.services.generation.answer_generator import get_answer_generator
from app.schemas.evaluation import BenchmarkItem, BenchmarkReport

BENCHMARK_SCENARIOS = [
    {
        "query": "What are the core stages of the Multimodal RAG pipeline?",
        "expected_keywords": "retrieval, generation, embedding, ingestion, fusion",
        "notes": "Tests architectural pipeline retrieval and grounding"
    },
    {
        "query": "What metrics and evaluation criteria assess faithfulness and hallucination in RAG?",
        "expected_keywords": "citation, faithfulness, ground, latency",
        "notes": "Tests evaluation and validation evidence retrieval"
    },
    {
        "query": "Explain quantum teleportation through black hole event horizons in medieval Europe.",
        "expected_keywords": "insufficient evidence",
        "notes": "Tests negative constraint: proper reporting of ungrounded / insufficient evidence"
    }
]

class RAGEvaluator:
    def __init__(self):
        self.retriever = get_retriever()
        self.generator = get_answer_generator()

    def run_benchmark(
        self,
        query: str,
        target_doc_id: Optional[str] = None,
        expected_keywords: Optional[str] = None
    ) -> BenchmarkItem:
        bench_id = str(uuid.uuid4())
        
        # 1. Retrieval Latency & Chunks
        ret_start = time.time()
        doc_filter = [target_doc_id] if target_doc_id else None
        retrieved_sources = self.retriever.retrieve(query=query, top_k=4, document_ids=doc_filter)
        ret_latency = (time.time() - ret_start) * 1000

        # 2. Answer Generation & Citations
        answer, citations, gen_latency, grounding_status = self.generator.generate_answer(
            question=query,
            retrieved_sources=retrieved_sources
        )

        # 3. Citation Validity Check
        citation_validity = True
        for c in citations:
            if not c.get("document_name") or c.get("page_number", 0) <= 0:
                citation_validity = False
                break

        # 4. Keyword / Grounding Faithfulness Score
        faithfulness_score = 1.0
        status = "passed"
        notes = f"Grounding status: {grounding_status}."

        if expected_keywords:
            keywords = [k.strip().lower() for k in expected_keywords.split(",") if k.strip()]
            combined_text = (answer + " " + " ".join(c.get("excerpt", "") for c in citations)).lower()
            found = sum(1 for k in keywords if k in combined_text)
            faithfulness_score = round(found / len(keywords), 2) if keywords else 1.0
            if faithfulness_score < 0.5:
                status = "warning"
                notes += f" Expected keyword match: {found}/{len(keywords)}."

        # Persist to DB
        created_at = time.strftime("%Y-%m-%d %H:%M:%S")
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute(
                """
                INSERT INTO evaluation_benchmarks (
                    id, query, target_document, expected_answer_keywords,
                    retrieved_chunks_count, retrieval_latency_ms, generation_latency_ms,
                    citation_validity, faithfulness_score, status, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    bench_id, query, target_doc_id or "All Documents", expected_keywords or "",
                    len(retrieved_sources), round(ret_latency, 2), round(gen_latency, 2),
                    1 if citation_validity else 0, faithfulness_score, status, notes, created_at
                )
            )

        return BenchmarkItem(
            id=bench_id,
            query=query,
            target_document=target_doc_id or "All Documents",
            expected_answer_keywords=expected_keywords,
            retrieved_chunks_count=len(retrieved_sources),
            retrieval_latency_ms=round(ret_latency, 2),
            generation_latency_ms=round(gen_latency, 2),
            citation_validity=citation_validity,
            faithfulness_score=faithfulness_score,
            status=status,
            notes=notes,
            created_at=created_at
        )

    def run_suite(self) -> BenchmarkReport:
        for scenario in BENCHMARK_SCENARIOS:
            self.run_benchmark(
                query=scenario["query"],
                expected_keywords=scenario["expected_keywords"]
            )
        return self.get_report()

    def get_report(self) -> BenchmarkReport:
        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT * FROM evaluation_benchmarks ORDER BY created_at DESC LIMIT 25")
            rows = cursor.fetchall()

        if not rows:
            return BenchmarkReport(
                total_evaluations=0,
                passed_count=0,
                failed_count=0,
                avg_retrieval_latency_ms=0.0,
                avg_generation_latency_ms=0.0,
                citation_precision_rate=1.0,
                recent_runs=[]
            )

        items = []
        passed = 0
        failed = 0
        total_ret_lat = 0.0
        total_gen_lat = 0.0
        valid_citations_count = 0

        for r in rows:
            is_valid = bool(r["citation_validity"])
            if is_valid:
                valid_citations_count += 1
            if r["status"] == "passed":
                passed += 1
            else:
                failed += 1
            total_ret_lat += float(r["retrieval_latency_ms"] or 0)
            total_gen_lat += float(r["generation_latency_ms"] or 0)

            items.append(BenchmarkItem(
                id=r["id"],
                query=r["query"],
                target_document=r["target_document"],
                expected_answer_keywords=r["expected_answer_keywords"],
                retrieved_chunks_count=r["retrieved_chunks_count"],
                retrieval_latency_ms=r["retrieval_latency_ms"],
                generation_latency_ms=r["generation_latency_ms"],
                citation_validity=is_valid,
                faithfulness_score=r["faithfulness_score"],
                status=r["status"],
                notes=r["notes"],
                created_at=str(r["created_at"])
            ))

        n = len(rows)
        return BenchmarkReport(
            total_evaluations=n,
            passed_count=passed,
            failed_count=failed,
            avg_retrieval_latency_ms=round(total_ret_lat / n, 2),
            avg_generation_latency_ms=round(total_gen_lat / n, 2),
            citation_precision_rate=round(valid_citations_count / n, 2),
            recent_runs=items
        )

_evaluator_instance = None

def get_rag_evaluator() -> RAGEvaluator:
    global _evaluator_instance
    if _evaluator_instance is None:
        _evaluator_instance = RAGEvaluator()
    return _evaluator_instance
