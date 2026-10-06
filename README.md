# RepoMind • AI-Powered Codebase Intelligence & Developer Assistant

> **"Understand your codebase before you change it."**  
> RepoMind is an intelligent developer assistant and architectural intelligence platform. Rather than merely chatting with code files, RepoMind ingests software repositories, performs Tree-sitter AST parsing, constructs a multi-layer NetworkX dependency graph, indexes semantic code vectors via Qdrant, and executes grounded reasoning with line citations before predicting the impact of changes.

---

## 1. System Architecture Pipeline

RepoMind enforces a 7-stage structural ingestion and reasoning pipeline:

```
GitHub Repository (or Demo Repository)
       ↓
Repository Ingestion & File Filtering
       ↓
Tree-sitter AST Parsing (Extracts functions, classes, interfaces, calls)
       ↓
Dependency Graph Construction (NetworkX multi-layer directed graph)
       ↓
Code Chunking & Dense Embeddings (Function & class semantic vectors)
       ↓
Qdrant Vector Database (In-process memory or remote cluster)
       ↓
Hybrid Retrieval & AST Metadata Filtering
       ↓
Context Assembly & Call-Chain Traversal
       ↓
LLM / Grounded AST Reasoning Engine
       ↓
Developer Assistant Response (Flow timelines + clickable line citations)
```

---

## 2. Core Capabilities

1. **Understand (AST + Semantic Retrieval):**
   - Distinguishes between function declarations, method calls, endpoint handlers, and variables.
   - Extracts cyclomatic complexity for every function and method.
2. **Navigate (Interactive Dependency Graph):**
   - React Flow visualizer rendering `Presentation → Service → Repository → Database` architectural tiers.
   - Interactive zoom, pan, node search, and upstream/downstream connection inspection.
3. **Diagnose (Bug Investigator):**
   - Formulates probabilistic root cause hypotheses from natural language issue descriptions.
   - Traces execution paths (e.g., clock skew tolerance in token verification during page reload).
4. **Predict (Change Impact Analysis):**
   - Traverses call graphs to calculate upstream blast radius, affected controllers, and affected test suites.
   - Assigns a calculated `HIGH`, `MEDIUM`, or `LOW` impact risk score.
5. **Assist (Generators & Security Smells):**
   - Generates repository-compatible unit tests (Jest/Pytest) covering normal, edge, boundary, and failure cases.
   - Synthesizes architectural documentation and defensive code refactors.
   - Audits code for SQL injection patterns, hardcoded credentials, and information disclosure.
6. **Codebase Health Score:**
   - Evaluates a 0–100 quality score derived from AST complexity, documentation ratios, security findings, and test coverage.

---

## 3. Technology Stack

- **Backend:**
  - Python 3.14+
  - FastAPI & Uvicorn
  - NetworkX 3.7 (Architectural Directed Graphs)
  - Tree-sitter 0.26 (AST Parsing)
  - Qdrant Client 1.19 (Vector Database - in-memory `:memory:` default or remote cluster)
  - scikit-learn & NumPy (Vector indexing & hybrid scoring)
  - Pydantic v2 (Data validation)
- **Frontend:**
  - React 19 + TypeScript
  - Tailwind CSS v4 + PostCSS
  - React Flow (`@xyflow/react`)
  - Monaco Code Editor (`@monaco-editor/react`)
  - Lucide React (Developer Tool Icons)
  - React Router DOM v7
  - Vite Bundler

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js v18+ (Node v24 recommended)
- Python 3.10+ (Python 3.14 verified)
- Git

### Backend Setup

1. Open a terminal in the root directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. (Optional) Configure environment variables:
   Copy `.env.example` to `.env` in the root folder:
   ```bash
   cp ../.env.example ../.env
   ```
   *Note: RepoMind comes with a built-in Grounded AST Reasoning Engine and in-memory Qdrant instance. External API keys are completely optional!*

4. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The backend will be live at `http://localhost:8000`. API documentation is available at `http://localhost:8000/docs`.

### Frontend Setup

1. Open another terminal in the root directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser at `http://localhost:5173`.

---

## 5. End-to-End Demo Flow

RepoMind includes a comprehensive **Demo Repository** (`ecommerce-platform`) that works out of the box with zero external configuration:

1. **Open RepoMind:**
   Navigate to `http://localhost:5173`. The landing page introduces the architectural intelligence system. Click **"Explore Demo"** or **"Launch Console"**.
2. **Repository Dashboard:**
   Inspect the metrics: 16 Files, Functions, Classes, Dependencies, Test Files, and the calculated **84/100 Codebase Health Score**.
3. **AI Codebase Assistant:**
   Navigate to **AI Assistant** in the sidebar. Click the prefilled inquiry:
   `"How does authentication work?"`
   RepoMind executes the 6-stage grounded reasoning pipeline, returns the **Execution Call Flow** (`AuthController -> AuthService -> TokenService -> UserRepository`), and lists verified source code references.
4. **Interactive Code Citations:**
   Click on the citation badge `src/auth/AuthService.ts Lines 18–48`. RepoMind immediately navigates to the **Code Explorer** and reveals line 18 in the Monaco Editor!
5. **Interactive Dependency Graph:**
   Navigate to **Dependency Graph**. Filter by `Presentation`, `Service`, `Repository`, or `Database`. Click on `AuthService` or `UserService` to inspect incoming callers and outgoing invocations. Click **"Run Impact Analysis"**.
6. **Change Impact Analysis:**
   Inspect the blast radius risk assessment for `AuthService.validateToken`. View affected controllers (`AuthController`, `UserController`, `OrderController`) and affected unit tests (`AuthService.test`).
7. **Bug Investigator:**
   Select the defect description: `"Users are getting logged out after refreshing the page"`. The system isolates `TokenService.verifyToken` as High Confidence (92%), identifies the lack of clock skew grace tolerance, and provides a remediation patch.
8. **Test & Doc Generators:**
   Generate a Jest/Pytest unit test suite covering nominal paths, boundary conditions, edge cases, and failure modes.
9. **Security Audit:**
   Inspect flagged items: hardcoded dev secrets, raw SQL query bypasses, and complexity hotspots with remediation tips.

---

## 6. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/repositories/analyze` | Initiates AST parsing, graph construction, and vector indexing |
| `GET` | `/api/repositories/{id}` | Fetches repository metrics and file hierarchy tree |
| `GET` | `/api/repositories/{id}/graph` | Retrieves NetworkX multi-layer dependency graph nodes & edges |
| `GET` | `/api/repositories/{id}/file-content` | Retrieves full file source, AST symbols, and dependencies |
| `POST` | `/api/search` | Performs hybrid code search (Qdrant vectors + AST exact boost) |
| `POST` | `/api/chat` | Grounded multi-turn conversational code reasoning |
| `POST` | `/api/chat/clear` | Clears session conversational memory |
| `POST` | `/api/bug-analysis` | Diagnoses defects and predicts candidate root causes |
| `POST` | `/api/impact-analysis` | Computes upstream blast radius and affected controllers/tests |
| `GET` | `/api/repositories/{id}/security` | Runs static AST security and code smell audit |
| `GET` | `/api/repositories/{id}/health` | Retrieves multidimensional codebase health breakdown |
| `POST` | `/api/generate-tests` | Synthesizes framework-compatible test suites |
| `POST` | `/api/generate-documentation` | Generates architectural markdown documentation |
| `POST` | `/api/code-suggestion` | Synthesizes repository-contextual code refactorings |
| `GET` | `/api/health` | Service health status |

---

## 7. Environment Variables

Create `.env` based on `.env.example`:

```env
# Optional Remote LLM Synthesis (RepoMind runs offline in Grounded Mode by default)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Optional GitHub Token (for private repos and high rate limits)
GITHUB_TOKEN=

# Vector Database (Default: in-process memory)
QDRANT_URL=:memory:
QDRANT_API_KEY=

DEBUG=true
DEMO_MODE=true
```
