from fastapi import APIRouter
from app.services.evaluation.rag_evaluator import get_rag_evaluator
from app.schemas.evaluation import EvaluationRunRequest, BenchmarkItem, BenchmarkReport

router = APIRouter(prefix="/evaluation", tags=["evaluation"])

@router.post("/run", response_model=BenchmarkItem)
def run_evaluation(req: EvaluationRunRequest):
    evaluator = get_rag_evaluator()
    return evaluator.run_benchmark(
        query=req.query,
        target_doc_id=req.target_document_id,
        expected_keywords=req.expected_answer_keywords
    )

@router.post("/run-suite", response_model=BenchmarkReport)
def run_evaluation_suite():
    evaluator = get_rag_evaluator()
    return evaluator.run_suite()

@router.get("/report", response_model=BenchmarkReport)
def get_evaluation_report():
    evaluator = get_rag_evaluator()
    return evaluator.get_report()
