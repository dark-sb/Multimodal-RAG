import os
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
from app.core.config import settings

def clean_cell_text(text: str) -> str:
    """Clean whitespace, split merged camelCase words, and normalize special symbols."""
    if not text:
        return ""
    s = str(text).strip().replace("\r\n", " ").replace("\n", " ")
    # Fix hyphens in IDs: RK01 - or RK - 01 -> RK-01, RE001 - -> RE-001
    s = re.sub(r'(RK|RE|AR)\s*-\s*(\d+)', r'\1-\2', s)
    s = re.sub(r'(RK|RE|AR)(\d+)\s*-', r'\1-\2', s)
    # Split camelCase / stuck words: Solarindex -> Solar index, Bioenergyindex -> Bioenergy index
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', s)
    s = re.sub(r'(?<=[a-zA-Z])(index|generation|capacity|delay|error|citation|interpretation|project|event|events|record|dataset|units|scores|check|checks)', r' \1', s, flags=re.IGNORECASE)
    # Normalize multiple spaces
    s = re.sub(r'\s{2,}', ' ', s)
    return s.strip()

def extract_table_grid(page: fitz.Page, table: fitz.Table) -> List[List[str]]:
    """Extract table cells using word-level clipping to guarantee natural spacing between words."""
    grid = []
    for row in table.rows:
        row_vals = []
        for c_bbox in row.cells:
            if c_bbox:
                # Add 1pt margin to capture text edges cleanly
                margin_rect = fitz.Rect(c_bbox[0] - 1, c_bbox[1] - 1, c_bbox[2] + 1, c_bbox[3] + 1)
                words = page.get_text("words", clip=margin_rect)
                words.sort(key=lambda w: (w[1], w[0]))
                cell_text = " ".join(w[4] for w in words).strip()
            else:
                cell_text = ""
            row_vals.append(clean_cell_text(cell_text))
        grid.append(row_vals)
    return grid

def extract_pdf_content(file_path: Path, document_id: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extract structured narrative text, detected tables, and page preview images from a PDF file.
    Maintains exact page boundaries, separates tables from prose, and builds row-by-row representations.
    Returns: (list_of_page_dicts, doc_metadata)
    """
    doc = fitz.open(str(file_path))
    pages_data = []
    total_pages = len(doc)
    
    doc_metadata = {
        "title": doc.metadata.get("title") or file_path.stem,
        "author": doc.metadata.get("author") or "Unknown",
        "subject": doc.metadata.get("subject") or "",
        "page_count": total_pages,
        "format": "PDF"
    }

    for page_num in range(1, total_pages + 1):
        page = doc.load_page(page_num - 1)
        raw_text = page.get_text("text").strip()
        
        # Check for images on this page
        image_list = page.get_images(full=True)
        has_images = len(image_list) > 0

        # Render 150-DPI page preview image for viewer and citations
        image_filename = f"{document_id}_p{page_num}.png"
        image_dest = settings.PAGES_DIR / image_filename
        pix = page.get_pixmap(dpi=150)
        pix.save(str(image_dest))

        # Check for tables
        tabs = page.find_tables()
        has_tables = len(tabs.tables) > 0
        table_bboxes = [fitz.Rect(t.bbox) for t in tabs.tables]

        # Extract narrative blocks outside table areas
        narrative_blocks = []
        for b in page.get_text("blocks"):
            b_rect = fitz.Rect(b[:4])
            overlaps_table = any(b_rect.intersects(t_rect) for t_rect in table_bboxes)
            text_block = b[4].strip()
            if not overlaps_table and text_block:
                narrative_blocks.append(text_block)

        # Detect section title / headings
        section_title = f"Page {page_num}"
        for b in narrative_blocks[:3]:
            first_line = b.splitlines()[0].strip()
            if re.match(r'^(\d+\.|\bSection\b|\bAppendix\b|\bCase Study\b).*', first_line, re.IGNORECASE):
                section_title = first_line
                break

        is_evaluation_section = bool(
            re.search(r'(evaluation questions|test dataset|question and answer key|expected answer)', section_title, re.IGNORECASE)
            or ("Evaluation Questions for RAG Testing" in raw_text)
        )

        # Process each table on the page
        tables_structured = []
        for t_idx, t in enumerate(tabs.tables):
            grid = extract_table_grid(page, t)
            if not grid or len(grid) < 2:
                continue

            headers = grid[0]
            # Check if header contains question/answer
            is_qa_table = any("question" in h.lower() for h in headers) and any("expected" in h.lower() or "answer" in h.lower() for h in headers)

            # Build row-by-row representations: "Column: Value | Column: Value"
            row_records = []
            for row in grid[1:]:
                # If row is non-empty
                if any(cell for cell in row):
                    # For capacity table on Page 6, ensure column names include capacity index
                    clean_row_pairs = []
                    for h, v in zip(headers, row):
                        if not h or not v:
                            continue
                        col_label = h
                        if "index" in h.lower() and "capacity" not in h.lower() and "generation" not in h.lower():
                            # E.g. "Solar index" -> "Solar capacity index" when section is Capacity Dataset
                            if "capacity" in section_title.lower() or "capacity" in raw_text.lower():
                                col_label = h.replace("index", "capacity index").replace("Index", "Capacity index")
                        clean_row_pairs.append(f"{col_label}: {v}")

                    row_str = " | ".join(clean_row_pairs)
                    if row_str:
                        row_records.append(row_str)

            # Build markdown representation
            header_line = " | ".join(headers)
            separator_line = " | ".join(["---"] * len(headers))
            md_rows = [" | ".join(row) for row in grid[1:] if any(row)]
            table_md = f"| {header_line} |\n| {separator_line} |\n" + "\n".join(f"| {r} |" for r in md_rows)

            tables_structured.append({
                "table_index": t_idx + 1,
                "headers": headers,
                "rows_raw": grid[1:],
                "row_records": row_records,
                "table_markdown": table_md,
                "is_qa_table": is_qa_table or is_evaluation_section
            })

        # Combine page text representation
        page_content_parts = []
        if narrative_blocks:
            page_content_parts.append("\n\n".join(narrative_blocks))
        for t in tables_structured:
            page_content_parts.append(f"\n[Table on Page {page_num}]\n" + t["table_markdown"])

        full_page_text = "\n\n".join(page_content_parts) if page_content_parts else raw_text

        is_scanned = (len(raw_text) < 40 and has_images)

        page_dict = {
            "id": f"{document_id}_p{page_num}",
            "document_id": document_id,
            "page_number": page_num,
            "text_content": full_page_text,
            "image_path": image_filename,
            "has_images": has_images,
            "has_tables": has_tables,
            "is_scanned": is_scanned,
            "section_title": section_title,
            "is_evaluation_section": is_evaluation_section,
            "narrative_blocks": narrative_blocks,
            "tables_structured": tables_structured,
            "metadata_json": {
                "image_count": len(image_list),
                "is_scanned": is_scanned,
                "has_tables": has_tables,
                "section_title": section_title,
                "is_evaluation_section": is_evaluation_section
            }
        }
        pages_data.append(page_dict)

    doc.close()
    return pages_data, doc_metadata
