"""
Multimodal RAG Studio - Sample Dataset Indexer & Seeder
Automatically initializes database and indexes benchmark datasets
for immediate out-of-the-box local testing and demonstration.
"""
import sys
import shutil
from pathlib import Path

# Add backend root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.database.connection import init_db, get_db
from app.services.ingestion.document_parser import DocumentIngestionService

def seed_sample_datasets():
    print("=" * 60)
    print("Multimodal RAG Studio - Seeding Sample Datasets")
    print("=" * 60)
    
    # 1. Initialize SQLite database tables
    print("[1/3] Initializing SQLite database schema...")
    init_db()

    # 2. Check sample documents folder
    sample_dir = BASE_DIR / "data" / "sample_documents"
    if not sample_dir.exists():
        print(f"Error: Sample directory not found at {sample_dir}")
        return

    ingestion_service = DocumentIngestionService()

    # Dataset 1: Regression Test Renewable Energy Report (Fixed ID for automated tests)
    renewable_pdf = sample_dir / "Multimodal_RAG_Test_Dataset_Renewable_Energy_Report.pdf"
    if renewable_pdf.exists():
        doc_id = "7a80392f-e357-4a91-87a0-97a613418669"
        filename = "Multimodal_RAG_Test_Dataset_Renewable_Energy_Report.pdf"
        dest_filename = f"{doc_id}_{filename}"
        dest_path = settings.STORAGE_DIR / dest_filename

        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT id, status FROM documents WHERE id = ?", (doc_id,))
            existing = cursor.fetchone()

        if not existing or existing["status"] != "completed":
            print(f"[2/3] Indexing benchmark report: {filename}...")
            shutil.copy2(renewable_pdf, dest_path)
            file_size = dest_path.stat().st_size

            with get_db() as db:
                cursor = db.cursor()
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO documents (id, filename, file_path, file_type, file_size, status)
                    VALUES (?, ?, ?, 'pdf', ?, 'pending')
                    """,
                    (doc_id, filename, str(dest_path), file_size)
                )

            ingestion_service.process_document(doc_id)
            print(f"      Successfully indexed {filename} (ID: {doc_id})")
        else:
            print(f"[2/3] Benchmark report already indexed ({doc_id})")
    else:
        print(f"Warning: {renewable_pdf.name} not found.")

    # Dataset 2: General Seminar Report
    seminar_pdf = sample_dir / "sample_multimodal_rag_seminar.pdf"
    if seminar_pdf.exists():
        doc_id = "c737dd5f-ea90-4c12-866c-fb3da5ae5a33"
        filename = "sample_multimodal_rag_seminar.pdf"
        dest_filename = f"{doc_id}_{filename}"
        dest_path = settings.STORAGE_DIR / dest_filename

        with get_db() as db:
            cursor = db.cursor()
            cursor.execute("SELECT id, status FROM documents WHERE id = ?", (doc_id,))
            existing = cursor.fetchone()

        if not existing or existing["status"] != "completed":
            print(f"[3/3] Indexing seminar sample: {filename}...")
            shutil.copy2(seminar_pdf, dest_path)
            file_size = dest_path.stat().st_size

            with get_db() as db:
                cursor = db.cursor()
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO documents (id, filename, file_path, file_type, file_size, status)
                    VALUES (?, ?, ?, 'pdf', ?, 'pending')
                    """,
                    (doc_id, filename, str(dest_path), file_size)
                )

            ingestion_service.process_document(doc_id)
            print(f"      Successfully indexed {filename} (ID: {doc_id})")
        else:
            print(f"[3/3] Seminar sample already indexed ({doc_id})")

    print("\nDatabase seeding and vector indexing complete!")
    print(f"Total vector chunks in ChromaDB: {ingestion_service.vector_store.count()}")

if __name__ == "__main__":
    seed_sample_datasets()
