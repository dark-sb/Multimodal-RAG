import re
from typing import List, Dict, Any, Optional

def clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    if not text:
        return ""
    text = re.sub(r'\r\n|\r', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

def chunk_narrative(
    paragraphs: List[str],
    document_id: str,
    page_number: int,
    section_title: str = "",
    is_evaluation: bool = False,
    chunk_size: int = 500,
    overlap: int = 100,
    start_chunk_idx: int = 0
) -> List[Dict[str, Any]]:
    """
    Split narrative paragraphs into overlapping semantic chunks with sentence boundary preservation.
    Prepends section context when available.
    """
    if not paragraphs:
        return []

    full_text = "\n\n".join(paragraphs).strip()
    if not full_text:
        return []

    # Sentence boundary splitting
    sentence_delimiters = r'(?<=[.!?])\s+'
    sentences = [s.strip() for s in re.split(sentence_delimiters, full_text) if s.strip()]
    if not sentences:
        sentences = [full_text]

    chunks = []
    current_sentences = []
    current_length = 0
    chunk_idx = start_chunk_idx
    content_type = "evaluation_question" if is_evaluation else "text"

    prefix = f"[{section_title} - Page {page_number}]\n" if section_title else f"[Page {page_number}]\n"

    for sentence in sentences:
        s_len = len(sentence)
        if current_length + s_len > chunk_size and current_sentences:
            body = " ".join(current_sentences).strip()
            chunk_content = f"{prefix}{body}"
            chunks.append({
                "id": f"{document_id}_p{page_number}_c{chunk_idx}",
                "document_id": document_id,
                "page_number": page_number,
                "chunk_index": chunk_idx,
                "content_type": content_type,
                "text_content": chunk_content,
                "token_count": len(chunk_content.split()),
                "metadata_json": {
                    "section_title": section_title,
                    "is_evaluation": is_evaluation,
                    "content_type": content_type
                }
            })
            chunk_idx += 1

            # Keep overlap sentences from end of previous chunk
            overlap_sentences = []
            overlap_len = 0
            for prev_s in reversed(current_sentences):
                if overlap_len + len(prev_s) <= overlap:
                    overlap_sentences.insert(0, prev_s)
                    overlap_len += len(prev_s)
                else:
                    break
            current_sentences = overlap_sentences
            current_length = sum(len(s) for s in current_sentences)

        current_sentences.append(sentence)
        current_length += s_len

    if current_sentences:
        body = " ".join(current_sentences).strip()
        chunk_content = f"{prefix}{body}"
        chunks.append({
            "id": f"{document_id}_p{page_number}_c{chunk_idx}",
            "document_id": document_id,
            "page_number": page_number,
            "chunk_index": chunk_idx,
            "content_type": content_type,
            "text_content": chunk_content,
            "token_count": len(chunk_content.split()),
            "metadata_json": {
                "section_title": section_title,
                "is_evaluation": is_evaluation,
                "content_type": content_type
            }
        })

    return chunks

def chunk_table(
    table_data: Dict[str, Any],
    document_id: str,
    page_number: int,
    section_title: str = "",
    start_chunk_idx: int = 0
) -> List[Dict[str, Any]]:
    """
    Chunk table data preserving headers, column labels, and structured row-by-row representations.
    Separates evaluation test question tables from primary evidence tables.
    """
    headers = table_data.get("headers", [])
    raw_rows = table_data.get("rows_raw", [])
    row_records = table_data.get("row_records", [])
    is_qa_table = table_data.get("is_qa_table", False)
    content_type = "evaluation_question" if is_qa_table else "table"

    if not headers or not raw_rows:
        return []

    header_line = " | ".join(headers)
    divider_line = " | ".join(["---"] * len(headers))
    title_prefix = f"[Table on Page {page_number}: {section_title}]\n" if section_title else f"[Table on Page {page_number}]\n"

    chunks = []
    chunk_idx = start_chunk_idx

    # If table is QA questionnaire (Page 28), chunk each question or small group of 2 questions
    # to avoid chunks that combine many unrelated questions and answers.
    if is_qa_table:
        batch_size = 2
        for i in range(0, len(row_records), batch_size):
            batch_records = row_records[i : i + batch_size]
            batch_raw = raw_rows[i : i + batch_size]
            
            md_rows = "\n".join(f"| {' | '.join(r)} |" for r in batch_raw)
            rec_text = "\n".join(batch_records)

            chunk_text = (
                f"{title_prefix}"
                f"Questionnaire / Evaluation Test Reference:\n"
                f"{rec_text}\n\n"
                f"| {header_line} |\n| {divider_line} |\n{md_rows}"
            )

            chunks.append({
                "id": f"{document_id}_p{page_number}_c{chunk_idx}",
                "document_id": document_id,
                "page_number": page_number,
                "chunk_index": chunk_idx,
                "content_type": content_type,
                "text_content": chunk_text,
                "token_count": len(chunk_text.split()),
                "metadata_json": {
                    "section_title": section_title,
                    "is_evaluation": True,
                    "content_type": content_type
                }
            })
            chunk_idx += 1
        return chunks

    # For primary data tables (Page 6, 7, 8, 11, 13):
    # If table is reasonably sized (up to 12 rows), keep it in a single intact chunk so the full table context is intact!
    if len(raw_rows) <= 12:
        md_table = f"| {header_line} |\n| {divider_line} |\n" + "\n".join(f"| {' | '.join(r)} |" for r in raw_rows)
        searchable_records = "\n".join(f"Row: {rec}" for rec in row_records)

        full_table_chunk = (
            f"{title_prefix}"
            f"Columns: {header_line}\n"
            f"Searchable Records:\n{searchable_records}\n\n"
            f"Table View:\n{md_table}"
        )

        chunks.append({
            "id": f"{document_id}_p{page_number}_c{chunk_idx}",
            "document_id": document_id,
            "page_number": page_number,
            "chunk_index": chunk_idx,
            "content_type": content_type,
            "text_content": full_table_chunk,
            "token_count": len(full_table_chunk.split()),
            "metadata_json": {
                "section_title": section_title,
                "is_evaluation": False,
                "content_type": content_type
            }
        })
        return chunks

    # For larger tables (e.g. Project Register with 25 rows):
    # Chunk into batches of 6 rows, repeating header in every chunk
    batch_size = 6
    for i in range(0, len(row_records), batch_size):
        batch_records = row_records[i : i + batch_size]
        batch_raw = raw_rows[i : i + batch_size]
        
        md_table = f"| {header_line} |\n| {divider_line} |\n" + "\n".join(f"| {' | '.join(r)} |" for r in batch_raw)
        searchable_records = "\n".join(f"Row: {rec}" for rec in batch_records)

        chunk_text = (
            f"{title_prefix}"
            f"Columns: {header_line}\n"
            f"Searchable Records (Rows {i+1} to {i+len(batch_records)} of {len(row_records)}):\n"
            f"{searchable_records}\n\n"
            f"Table View:\n{md_table}"
        )

        chunks.append({
            "id": f"{document_id}_p{page_number}_c{chunk_idx}",
            "document_id": document_id,
            "page_number": page_number,
            "chunk_index": chunk_idx,
            "content_type": content_type,
            "text_content": chunk_text,
            "token_count": len(chunk_text.split()),
            "metadata_json": {
                "section_title": section_title,
                "is_evaluation": False,
                "content_type": content_type
            }
        })
        chunk_idx += 1

    return chunks

def chunk_text(
    text: str,
    document_id: str,
    page_number: int,
    chunk_size: int = 500,
    overlap: int = 100,
    content_type: str = "text",
    start_chunk_idx: int = 0
) -> List[Dict[str, Any]]:
    """General text chunker fallback for raw text documents (DOCX, TXT)."""
    return chunk_narrative(
        paragraphs=[text],
        document_id=document_id,
        page_number=page_number,
        chunk_size=chunk_size,
        overlap=overlap,
        start_chunk_idx=start_chunk_idx
    )
