# Multimodal RAG Studio — AI Document Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-orange.svg)](https://www.trychroma.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Multimodal Retrieval-Augmented Generation (Multimodal RAG)** engineering implementation and interactive demonstration system for document intelligence, visual inspection, and grounded context synthesis.

---

## 1. Overview & Architecture

Standard text-only RAG pipelines extract flat text from documents, stripping away formatting, layout hierarchy, table structures, and diagrams. Consequently, queries concerning balance sheets, complex comparisons, risk registers, or engineering matrices frequently fail or cause language models to hallucinate.

**Multimodal RAG Studio** couples visual representations (page-by-page 150-DPI renders) with fine-grained structured chunks (markdown tables, narrative prose, and metadata tags). Each generated answer is strictly grounded in retrieved evidence with clickable page citations and visual document inspection.

`
                              ┌────────────────────────────────────────┐
                              │       Uploaded Document (.pdf/.docx)    │
                              └───────────────────┬────────────────────┘
                                                  │
                         ┌────────────────────────┴────────────────────────┐
                         ▼                                                 ▼
           ┌────────────────────────────┐                    ┌────────────────────────────┐
           │   150-DPI Page Rendering   │                    │ Structure-Preserving Parse │
           │   (PyMuPDF / Pillow)       │                    │ (Tables, Sections, Text)   │
           └─────────────┬──────────────┘                    └─────────────┬──────────────┘
                         │                                                 │
                         ▼                                                 ▼
           ┌────────────────────────────┐                    ┌────────────────────────────┐
           │   Visual Page Store        │                    │ Context-Aware Chunking     │
           │   (Interactive Inspector)  │                    │ (Sentence & Table Chunker) │
           └────────────────────────────┘                    └─────────────┬──────────────┘
                                                                           │
                                                                           ▼
                                                             ┌────────────────────────────┐
                                                             │ Vector Embedding Engine    │
                                                             │ (Local / Gemini / OpenAI)  │
                                                             └─────────────┬──────────────┘
                                                                           │
                                                                           ▼
                                                             ┌────────────────────────────┐
                                                             │ ChromaDB Vector Database   │
                                                             │ (Persistent Collection)    │
                                                             └─────────────┬──────────────┘
                                                                           │
                                                                           ▼
┌──────────────────┐                                         ┌────────────────────────────┐
│   User Query     ├────────────────────────────────────────►│ Multi-Factor Hybrid        │
│   (Web / API)    │                                         │ Reranker & Evidence Filter │
└──────────────────┘                                         └─────────────┬──────────────┘
                                                                           │
                                                                           ▼
                                                             ┌────────────────────────────┐
                                                             │ Grounded Answer Generator  │
                                                             │ (Gemini / OpenAI / Local)  │
                                                             └─────────────┬──────────────┘
                                                                           │
                                                                           ▼
                                                             ┌────────────────────────────┐
                                                             │ Two-Tier Citation &        │
                                                             │ Hallucination Validator    │
                                                             └─────────────┬──────────────┘
                                                                           │
                                                                           ▼
                                                             ┌────────────────────────────┐
                                                             │ Verified Grounded Response │
                                                             │ + Visual Page Citations    │
                                                             └────────────────────────────┘
`

---

## 2. Key Features

- **Multimodal Document Ingestion**:
  - Full support for **PDF**, **DOCX**, **Images (PNG, JPG, JPEG)**, and **Plain Text**.
  - Renders each PDF page at **150 DPI** for visual inspection alongside answer generation.
  - Detects tables and extracts word-clipped grids, preserving column headers and row-level semantics.
- **Smart Chunking Strategy**:
  - Overlapping semantic narrative chunking with sentence-boundary preservation.
  - Dedicated table chunker retaining markdown headers, dividers, and row tuples (Row: Header: Value | ...).
  - Strict tagging distinguishing primary evidence from test questionnaires.
- **Pluggable Vector Embedding Engine**:
  - **Local Semantic Embedder (Default)**: Deterministic 384-dimensional subword tri-gram feature-hashing with L2-normalized projections. Completely offline with zero external dependencies.
  - **Google Gemini**: Cloud embeddings via 	ext-embedding-004 (768-dimensional).
  - **OpenAI**: Cloud embeddings via 	ext-embedding-3-small (1536-dimensional).
- **Hybrid Multi-Factor Reranker**:
  - Candidate expansion retrieving top-$ dense semantic vectors from ChromaDB.
  - Lexical token co-occurrence scoring.
  - Entity & Identifier boosting (RK-xx, Table x.x).
  - Year-metric co-occurrence detection (e.g., Year 2025 + Solar Capacity Index).
  - Deduplication ensuring clean evidence diversity.
- **Grounded Answer Synthesis & Hallucination Prevention**:
  - Deterministic **Local Grounded Engine** capable of answering from structured records without API keys (ideal for offline college presentations and air-gapped deployments).
  - Optional cloud synthesis via **Google Gemini (gemini-1.5-flash)** or **OpenAI (gpt-4o-mini)**.
  - Negative boundary rejection: cleanly identifies when requested data is absent instead of hallucinating.
  - Two-tier citation validation ensuring every citation maps directly to authentic retrieved pages.
- **Modern React + TypeScript UI**:
  - **Dashboard**: Ingestion statistics, vector counts, latency indicators, and quick shortcuts.
  - **Document Ingestion**: Drag-and-drop file upload with live progress tracking.
  - **Visual Document Viewer**: High-resolution page inspector with side-by-side metadata and jump-to-chat.
  - **AI Chat Workspace**: Multi-document knowledge scoping, conversation history, and clickable visual citations.
  - **System & Health**: Live backend health, database counters, and runtime provider settings.
  - **Dark / Light Theme**: Dynamic Tailwind CSS v4 class-based toggle with localStorage persistence and zero FOUC (Flash of Unstyled Content).

---

## 3. Technology Stack

### Backend
- **Framework**: Python 3.10+, FastAPI, Uvicorn (ASGI)
- **Document Processing**: PyMuPDF (itz), python-docx, Pillow (PIL)
- **Vector Database**: ChromaDB (Persistent storage)
- **Metadata Database**: SQLite3 (with WAL mode and foreign key integrity)
- **HTTP Client**: HTTPX
- **Testing**: Pytest, AnyIO

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS v4 with custom class-based dark mode
- **Icons**: Lucide React
- **HTTP / API**: Fetch with typed REST contracts

---

## 4. Repository Structure

`
Multimodal-RAG/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints (documents, chat, health, settings)
│   │   ├── core/            # Configuration and settings via pydantic-settings
│   │   ├── database/        # SQLite connection, schema, and migrations
│   │   ├── models/          # Database and internal data models
│   │   ├── schemas/         # Pydantic request and response schemas
│   │   ├── services/
│   │   │   ├── embeddings/  # Local, Gemini, and OpenAI embedding providers
│   │   │   ├── evaluation/  # RAG benchmarking and test utilities
│   │   │   ├── generation/  # Answer generators, evidence validator, prompt templates
│   │   │   ├── ingestion/   # Document parser, PDF/DOCX/image extractors, chunker
│   │   │   └── retrieval/   # ChromaDB vector store and hybrid multi-factor retriever
│   │   └── main.py          # Application entrypoint & CORS middleware
│   ├── data/
│   │   └── sample_multimodal_rag_seminar.pdf  # Sample benchmark evaluation document
│   ├── tests/               # Pytest automated test suite (chunking, API, regression)
│   ├── requirements.txt     # Python backend dependencies
│   └── .env.example         # Backend environment configuration template
├── frontend/
│   ├── public/              # Static public assets, favicon, icons
│   ├── src/
│   │   ├── assets/          # Application logos and images
│   │   ├── components/      # Navbar, Sidebar, UploadModal, etc.
│   │   ├── context/         # ThemeContext (Dark/Light) and ToastContext
│   │   ├── pages/           # Dashboard, Documents, DocumentViewer, Chat, Settings, About
│   │   ├── services/        # Frontend API client
│   │   ├── types/           # TypeScript interfaces and types
│   │   ├── App.tsx          # Root application component and routing
│   │   ├── index.css        # Tailwind CSS entry with @custom-variant dark
│   │   └── main.tsx         # React DOM mounting
│   ├── package.json         # Node.js dependencies and scripts
│   ├── tsconfig.json        # TypeScript configuration
│   └── vite.config.ts       # Vite bundler configuration
├── .gitignore               # Comprehensive Git exclusion rules
├── .env.example             # Root environment configuration template
└── README.md                # Project documentation
`

---

## 5. Getting Started

### Prerequisites
- **Python**: Version 3.10, 3.11, 3.12, 3.13, or 3.14
- **Node.js**: Version 18.x, 20.x, or 22.x
- **Git**

---

### Step 1: Clone the Repository

`ash
git clone https://github.com/dark-sb/Multimodal-RAG.git
cd Multimodal-RAG
`

---

### Step 2: Backend Setup

1. **Navigate to the backend directory**:
   `ash
   cd backend
   `

2. **Create and activate a virtual environment**:
   - **Windows (PowerShell)**:
     `powershell
     python -m venv .venv
     .venv\Scripts\Activate.ps1
     `
   - **macOS / Linux**:
     `ash
     python3 -m venv .venv
     source .venv/bin/activate
     `

3. **Install dependencies**:
   `ash
   pip install -r requirements.txt
   `

4. **Configure environment variables**:
   `ash
   cp .env.example .env
   `
   *(The default configuration uses the built-in local engine; cloud API keys are completely optional).*

5. **Start the FastAPI backend server**:
   `ash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   `
   The backend API will be live at http://127.0.0.1:8000.
   Interactive Swagger documentation is available at http://127.0.0.1:8000/docs.

---

### Step 3: Frontend Setup

1. **Open a new terminal and navigate to the frontend directory**:
   `ash
   cd frontend
   `

2. **Install Node dependencies**:
   `ash
   npm install
   `

3. **Start the Vite development server**:
   `ash
   npm run dev
   `
   The web application will be live at http://127.0.0.1:5173.

---

## 6. Environment Configuration

All environment variables can be set in ackend/.env:

| Variable | Default Value | Description |
|---|---|---|
| LLM_PROVIDER | local_extractive | LLM generation engine (local_extractive, gemini, openai) |
| EMBEDDING_PROVIDER | local | Vector embedding model (local, gemini, openai) |
| GEMINI_API_KEY | *(empty)* | Optional Google Gemini API Key |
| OPENAI_API_KEY | *(empty)* | Optional OpenAI API Key |
| GEMINI_MODEL | gemini-1.5-flash | Gemini model name |
| OPENAI_MODEL | gpt-4o-mini | OpenAI model name |
| MAX_FILE_SIZE_MB | 50 | Maximum file upload size in MB |
| CHUNK_SIZE | 500 | Target chunk size in characters |
| CHUNK_OVERLAP | 100 | Target overlap between consecutive chunks |
| TOP_K_RETRIEVAL | 5 | Default number of candidate chunks returned |

---

## 7. Running the Automated Test Suite

### Backend Regression Tests
Run the complete Pytest suite validating API health, chunking boundaries, and RAG regression tests:
`ash
cd backend
python -m pytest tests/ -v
`
*(All 12 regression tests pass with 100% success).*

### Frontend Production Build Test
Verify TypeScript compilation and Vite bundling:
`ash
cd frontend
npm run build
`

---

## 8. Academic Seminar Report & Presentation Details

- **Topic**: Multimodal Retrieval-Augmented Generation (Multimodal RAG)
- **Objective**: Overcoming the information loss of text-only RAG by embedding visual document representations and maintaining exact table structures.
- **Key Contributions**:
  1. Structure-preserving word-clipped table extraction.
  2. Multi-factor hybrid reranking with entity and temporal co-occurrence boosting.
  3. Two-tier citation validation guaranteeing authentic source grounding.
  4. 100% offline demonstration capability via zero-external-dependency local semantic embedder.

---

## 9. License

This project is licensed under the [MIT License](LICENSE).
