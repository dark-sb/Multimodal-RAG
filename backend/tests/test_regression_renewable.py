import pytest
from app.services.retrieval.hybrid_retriever import get_retriever
from app.services.generation.answer_generator import get_answer_generator
from app.database.connection import get_db

DOC_ID = "7a80392f-e357-4a91-87a0-97a613418669"

@pytest.fixture(scope="module")
def retriever():
    return get_retriever()

@pytest.fixture(scope="module")
def generator():
    return get_answer_generator()

def test_query_1_solar_capacity_index_2025(retriever, generator):
    """1. What is the solar capacity index for 2025? Expected: 108."""
    query = "What is the solar capacity index for 2025?"
    sources = retriever.retrieve(query=query, top_k=5, document_ids=[DOC_ID])
    
    assert len(sources) > 0, "No sources retrieved"
    # Ensure Page 6 (primary Table 4.1) is retrieved as the top evidence, NOT Page 28
    assert sources[0]["page_number"] == 6, f"Expected top source Page 6, got Page {sources[0]['page_number']}"
    assert sources[0]["content_type"] == "table"
    assert "108" in sources[0]["excerpt"]

    answer, citations, latency, status = generator.generate_answer(query, sources)
    assert "108" in answer, f"Expected 108 in answer, got: {answer}"
    assert "Page 6" in answer or any(c["page_number"] == 6 for c in citations)
    assert status == "grounded"
    # Check that unrelated questions from page 28 are NOT dumped
    assert "What is the 2025 wind capacity index?" not in answer

def test_query_2_wind_capacity_index_2025(retriever, generator):
    """2. What is the wind capacity index for 2025? Expected: 51."""
    query = "What is the wind capacity index for 2025?"
    sources = retriever.retrieve(query=query, top_k=5, document_ids=[DOC_ID])
    
    assert len(sources) > 0, "No sources retrieved"
    assert sources[0]["page_number"] == 6, f"Expected Page 6, got Page {sources[0]['page_number']}"
    assert "51" in sources[0]["excerpt"]

    answer, citations, latency, status = generator.generate_answer(query, sources)
    assert "51" in answer, f"Expected 51 in answer, got: {answer}"
    assert status == "grounded"
    assert any(c["page_number"] == 6 for c in citations)

def test_query_3_lowest_capacity_index_region(retriever, generator):
    """3. Which region has the lowest capacity index? Expected: East, 39."""
    query = "Which region has the lowest capacity index?"
    sources = retriever.retrieve(query=query, top_k=5, document_ids=[DOC_ID])
    
    assert len(sources) > 0, "No sources retrieved"
    assert sources[0]["page_number"] == 7, f"Expected Page 7, got Page {sources[0]['page_number']}"
    assert "East" in sources[0]["excerpt"]

    answer, citations, latency, status = generator.generate_answer(query, sources)
    assert "East" in answer, f"Expected 'East' in answer, got: {answer}"
    assert "39" in answer, f"Expected '39' in answer, got: {answer}"
    assert status == "grounded"
    assert any(c["page_number"] == 7 for c in citations)

def test_query_4_solar_exceeds_wind_quarter(retriever, generator):
    """4. In which quarter does solar generation exceed wind generation? Expected: Q3, solar 188 and wind 139."""
    query = "In which quarter does solar generation exceed wind generation?"
    sources = retriever.retrieve(query=query, top_k=5, document_ids=[DOC_ID])
    
    assert len(sources) > 0, "No sources retrieved"
    assert sources[0]["page_number"] == 8, f"Expected Page 8, got Page {sources[0]['page_number']}"
    assert "Q3" in sources[0]["excerpt"]

    answer, citations, latency, status = generator.generate_answer(query, sources)
    assert "Q3" in answer, f"Expected 'Q3' in answer, got: {answer}"
    assert "188" in answer, f"Expected '188' in answer, got: {answer}"
    assert "139" in answer, f"Expected '139' in answer, got: {answer}"
    assert status == "grounded"
    assert any(c["page_number"] == 8 for c in citations)

def test_query_5_mitigation_rk07(retriever, generator):
    """5. What is the mitigation for risk RK-07? Expected: Validate citations against retrieval IDs."""
    query = "What is the mitigation for risk RK-07?"
    sources = retriever.retrieve(query=query, top_k=5, document_ids=[DOC_ID])
    
    assert len(sources) > 0, "No sources retrieved"
    assert sources[0]["page_number"] == 13, f"Expected Page 13, got Page {sources[0]['page_number']}"
    assert "RK-07" in sources[0]["excerpt"]

    answer, citations, latency, status = generator.generate_answer(query, sources)
    assert "Validate citations against retrieval IDs" in answer or "validate citations against retrieval ids" in answer.lower(), f"Expected mitigation in answer, got: {answer}"
    assert status == "grounded"
    assert any(c["page_number"] == 13 for c in citations)

def test_query_6_india_actual_production_unsupported(retriever, generator):
    """6. What is India's actual renewable electricity production in 2025 according to this report? Expected: The report does not provide actual national production figures."""
    query = "What is India's actual renewable electricity production in 2025 according to this report?"
    sources = retriever.retrieve(query=query, top_k=5, document_ids=[DOC_ID])
    
    answer, citations, latency, status = generator.generate_answer(query, sources)
    assert status == "insufficient_evidence", f"Expected insufficient_evidence status, got {status}"
    assert (
        "does not provide" in answer.lower()
        or "insufficient evidence" in answer.lower()
    ), f"Expected abstention message, got: {answer}"
