import shutil
from pathlib import Path
from typing import List, Dict, Any, Tuple
from PIL import Image
from app.core.config import settings

def extract_image_content(file_path: Path, document_id: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Process standalone uploaded images (PNG, JPG, JPEG).
    Saves the rendered preview to PAGES_DIR, extracts dimensions, and provides initial visual metadata.
    """
    with Image.open(file_path) as img:
        width, height = img.size
        img_format = img.format or "PNG"
        mode = img.mode

        # Convert to RGB if needed (e.g. RGBA or Palette)
        if mode in ("RGBA", "P"):
            rgb_img = img.convert("RGB")
        else:
            rgb_img = img.copy()

        # Save standard preview in pages dir
        preview_filename = f"{document_id}_p1.png"
        preview_dest = settings.PAGES_DIR / preview_filename
        rgb_img.save(preview_dest, format="PNG")

    # Generate descriptive text context for the visual document
    visual_description = (
        f"Visual Document / Image: {file_path.name}\n"
        f"Resolution: {width}x{height} pixels, Format: {img_format}.\n"
        f"This document represents a graphical, chart, diagram, or photo asset uploaded for multimodal intelligence analysis."
    )

    page_dict = {
        "id": f"{document_id}_p1",
        "document_id": document_id,
        "page_number": 1,
        "text_content": visual_description,
        "image_path": preview_filename,
        "has_images": True,
        "has_tables": False,
        "is_scanned": False,
        "metadata_json": {
            "width": width,
            "height": height,
            "format": img_format,
            "content_type": "standalone_image"
        }
    }

    doc_metadata = {
        "title": file_path.stem,
        "format": img_format,
        "page_count": 1,
        "width": width,
        "height": height
    }

    return [page_dict], doc_metadata

def extract_txt_content(file_path: Path, document_id: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extract raw text from TXT or Markdown files and partition into pages.
    """
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    from app.services.ingestion.docx_extractor import _render_text_preview
    
    # Split into chunks of ~2500 chars for pages
    lines = content.splitlines()
    pages_data = []
    current_page_lines = []
    curr_len = 0
    page_num = 1

    for line in lines:
        current_page_lines.append(line)
        curr_len += len(line) + 1
        if curr_len >= 2500:
            page_text = "\n".join(current_page_lines)
            img_filename = _render_text_preview(page_text, document_id, page_num)
            pages_data.append({
                "id": f"{document_id}_p{page_num}",
                "document_id": document_id,
                "page_number": page_num,
                "text_content": page_text,
                "image_path": img_filename,
                "has_images": False,
                "has_tables": False,
                "is_scanned": False,
                "metadata_json": {"lines_count": len(current_page_lines)}
            })
            page_num += 1
            current_page_lines = []
            curr_len = 0

    if current_page_lines or not pages_data:
        page_text = "\n".join(current_page_lines) if current_page_lines else "Empty document."
        img_filename = _render_text_preview(page_text, document_id, page_num)
        pages_data.append({
            "id": f"{document_id}_p{page_num}",
            "document_id": document_id,
            "page_number": page_num,
            "text_content": page_text,
            "image_path": img_filename,
            "has_images": False,
            "has_tables": False,
            "is_scanned": False,
            "metadata_json": {"lines_count": len(current_page_lines)}
        })

    doc_metadata = {
        "title": file_path.stem,
        "format": "TXT",
        "page_count": len(pages_data),
        "total_lines": len(lines)
    }

    return pages_data, doc_metadata
