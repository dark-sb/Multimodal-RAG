import sqlite3
from contextlib import contextmanager
from typing import Generator
from app.core.config import settings

def get_db_path() -> str:
    settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return str(settings.DATABASE_PATH)

def init_db():
    conn = sqlite3.connect(get_db_path())
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    with conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS documents (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            page_count INTEGER DEFAULT 0,
            chunk_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            error_message TEXT,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS document_pages (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            text_content TEXT,
            image_path TEXT,
            has_images BOOLEAN DEFAULT 0,
            has_tables BOOLEAN DEFAULT 0,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS document_chunks (
            id TEXT PRIMARY KEY,
            document_id TEXT NOT NULL,
            page_number INTEGER NOT NULL,
            chunk_index INTEGER NOT NULL,
            content_type TEXT NOT NULL,
            text_content TEXT NOT NULL,
            token_count INTEGER DEFAULT 0,
            metadata_json TEXT,
            FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            selected_docs TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations_json TEXT,
            retrieval_latency_ms REAL DEFAULT 0.0,
            generation_latency_ms REAL DEFAULT 0.0,
            grounding_status TEXT DEFAULT 'grounded',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS evaluation_benchmarks (
            id TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            target_document TEXT,
            expected_answer_keywords TEXT,
            retrieved_chunks_count INTEGER DEFAULT 0,
            retrieval_latency_ms REAL DEFAULT 0.0,
            generation_latency_ms REAL DEFAULT 0.0,
            citation_validity BOOLEAN DEFAULT 1,
            faithfulness_score REAL DEFAULT 1.0,
            status TEXT DEFAULT 'passed',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_doc_pages_doc_id ON document_pages(document_id);
        CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc_id ON document_chunks(document_id);
        CREATE INDEX IF NOT EXISTS idx_messages_conv_id ON messages(conversation_id);
        """)
    conn.close()

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = sqlite3.connect(get_db_path(), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
