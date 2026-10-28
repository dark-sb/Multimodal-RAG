from pathlib import Path
from typing import List, Dict, Any, Tuple
import docx
from PIL import Image, ImageDraw, ImageFont
from app.core.config import settings

def extract_docx_content(file_path: Path, document_id: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extract paragraphs and tables from a DOCX file.
    Partitions paragraphs into logical pages (~500 words per page) and generates page previews.
    """
    doc = docx.Document(str(file_path))
    full_paragraphs = []
    has_tables = len(doc.tables) > 0

    # Extract paragraphs
    for p in doc.paragraphs:
        txt = p.text.strip()
        if txt:
            full_paragraphs.append(txt)

    # Extract tables into markdown representation
    for t_idx, table in enumerate(doc.tables):
        rows_data = []
        for row in table.rows:
            row_cells = [cell.text.strip().replace('\n', ' ') for cell in row.cells]
            rows_data.append(" | ".join(row_cells))
        if rows_data:
            table_md = f"\n[Table {t_idx + 1}]\n" + "\n".join(rows_data)
            full_paragraphs.append(table_md)

    # Partition paragraphs into synthetic pages (~3000 chars per page)
    pages_data = []
    current_page_text = []
    current_char_count = 0
    page_num = 1

    for para in full_paragraphs:
        current_page_text.append(para)
        current_char_count += len(para)
        if current_char_count >= 2500:
            page_text = "\n\n".join(current_page_text)
            img_filename = _render_text_preview(page_text, document_id, page_num)
            pages_data.append({
                "id": f"{document_id}_p{page_num}",
                "document_id": document_id,
                "page_number": page_num,
                "text_content": page_text,
                "image_path": img_filename,
                "has_images": False,
                "has_tables": has_tables,
                "is_scanned": False,
                "metadata_json": {"paragraph_count": len(current_page_text)}
            })
            page_num += 1
            current_page_text = []
            current_char_count = 0

    if current_page_text or not pages_data:
        page_text = "\n\n".join(current_page_text) if current_page_text else "Empty document."
        img_filename = _render_text_preview(page_text, document_id, page_num)
        pages_data.append({
            "id": f"{document_id}_p{page_num}",
            "document_id": document_id,
            "page_number": page_num,
            "text_content": page_text,
            "image_path": img_filename,
            "has_images": False,
            "has_tables": has_tables,
            "is_scanned": False,
            "metadata_json": {"paragraph_count": len(current_page_text)}
        })

    doc_metadata = {
        "title": file_path.stem,
        "format": "DOCX",
        "page_count": len(pages_data),
        "total_paragraphs": len(doc.paragraphs),
        "total_tables": len(doc.tables)
    }

    return pages_data, doc_metadata

def _render_text_preview(text: str, document_id: str, page_num: int) -> str:
    """Render a clean preview card for text/docx documents for the viewer."""
    width, height = 800, 1050
    img = Image.new("RGB", (width, height), color=(252, 252, 254))
    draw = ImageDraw.Draw(img)
    
    # Draw simple header border
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(226, 232, 240), width=2)
    draw.rectangle([(30, 30), (width - 30, 80)], fill=(241, 245, 249))
    draw.text((45, 45), f"Document Page {page_num}", fill=(30, 41, 59))
    
    # Simple word wrap rendering
    lines = []
    for line in text.split("\n"):
        words = line.split(" ")
        curr = ""
        for w in words:
            if len(curr) + len(w) > 75:
                lines.append(curr)
                curr = w + " "
            else:
                curr += w + " "
        if curr:
            lines.append(curr)

    y = 100
    for l in lines[:45]:  # limit lines per preview
        draw.text((45, y), l, fill=(51, 65, 85))
        y += 20

    img_filename = f"{document_id}_p{page_num}.png"
    img.save(str(settings.PAGES_DIR / img_filename))
    return img_filename
