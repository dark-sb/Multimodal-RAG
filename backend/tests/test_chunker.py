import pytest
from app.services.ingestion.chunker import chunk_text, clean_text

def test_clean_text():
    raw = "Hello   world!\r\n\r\n\n\nThis is a test.   "
    cleaned = clean_text(raw)
    assert "Hello world!" in cleaned
    assert "\n\n" in cleaned
    assert "  " not in cleaned

def test_chunk_text_short():
    text = "Short single sentence."
    chunks = chunk_text(text, document_id="doc1", page_number=1, chunk_size=500)
    assert len(chunks) == 1
    assert chunks[0]["document_id"] == "doc1"
    assert chunks[0]["page_number"] == 1
    assert text in chunks[0]["text_content"]
    assert "Page 1" in chunks[0]["text_content"]

def test_chunk_text_long_with_overlap():
    sentences = [f"This is sentence number {i} discussing academic multimodal RAG concepts." for i in range(30)]
    text = " ".join(sentences)
    chunks = chunk_text(text, document_id="doc2", page_number=2, chunk_size=200, overlap=50)
    assert len(chunks) > 1
    for c in chunks:
        assert c["document_id"] == "doc2"
        assert c["page_number"] == 2
        assert len(c["text_content"]) > 0
