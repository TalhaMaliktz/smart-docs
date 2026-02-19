# 🚀 SmartDocs

**SmartDocs** is an AI-powered Developer Experience (DevEx) platform designed to ingest, index, and query technical documentation using Agentic RAG.

---

## 🗺️ Implementation Roadmap

We are building this platform in distinct phases to simulate an Enterprise software lifecycle.

- [x] **Phase 1: The Foundation** (Monorepo Setup, Next.js + NestJS, CORS).
- [x] **Phase 2: The Data Layer** (Dockerized Postgres, Prisma v7, Strict Validation).
- [x] **Phase 3: Ingestion Engine** (Async file processing, BullMQ, PDF Parsing).
- [x] **Phase 4: Memory Layer** (Persisting parsed results and state machine to Postgres).
- [ ] **Phase 5: Intelligence** (Vector Embeddings, RAG Pipeline).
- [ ] **Phase 6: Agentic Workflow** (LangGraph, Reasoning).

> **Current Status:** ✅ Phase 4 Complete (Memory Layer & State Machine Online).

---

## 🏗️ Architecture

This project simulates a "Customer Zero" Enterprise environment, moving beyond simple tutorials to handle real-world constraints.

![SmartDocs Architecture Diagram](./docs/Architecture-C4-Container-Level.png)

| Service      | Tech Stack              | Port   | Description                                                  |
| :----------- | :---------------------- | :----- | :----------------------------------------------------------- |
| **Frontend** | Next.js 14 (App Router) | `3001` | Client-side UI, connects to Backend via HTTP.                |
| **Backend**  | NestJS (v10)            | `3000` | API Gateway, Validation, and Business Logic.                 |
| **Queue**    | Redis + BullMQ          | `6379` | Async Job Queue for decoupling ingestion tasks.              |
| **Database** | PostgreSQL + pgvector   | `5432` | Dockerized DB. Stores Users, Documents, & Vector Embeddings. |

---

## ⚙️ Design Decisions & Constraints

This project adopts specific architectural patterns to demonstrate **Solutions Engineering**

- **Dockerized Persistence:** Uses `ankane/pgvector` image for local AI vector support instead of managed cloud services.
- **Strict Validation:** Global DTO validation pipes to sanitize inputs.
- **Configuration:** 12-Factor App principles using `@nestjs/config`.
- **Prisma v7 Adapter:** Manually configured connection pool to handle the latest Prisma breaking changes (Enterprise Pattern).
- **Event-Driven Architecture:** Decouples high-volume file uploads from CPU-intensive parsing using **Redis & BullMQ**.
- **Defensive Parsing:** Implements **"Magic Byte" inspection** to validate file integrity (preventing "fake PDF" crashes) before processing.
- **Sovereign State Machine:** Manages the document lifecycle (`PENDING` -> `PROCESSING` -> `COMPLETED`) entirely within a local Postgres database to guarantee data privacy and job recovery.

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** v20+ (Required for Next.js 14)
- **Docker Desktop** (Must be running)

### 2. Installation

```bash
# Clone the repo
git clone [https://github.com/YOUR_USERNAME/smart-docs.git](https://github.com/YOUR_USERNAME/smart-docs.git)
cd smart-docs

# Install Backend dependencies
cd backend
npm install

# Install Frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Setup

Create a `.env` file in the `backend/` root directory:

```env
# backend/.env
PORT=3000
# Connection string for local Docker container
DATABASE_URL="postgresql://postgres:password@localhost:5432/smartdocs"

# Redis Connection (Required for Queues)
REDIS_HOST="localhost"
REDIS_PORT=6379
```

### 4. Infrastructure & Database

Start the database and run the schema migrations.

```bash
# 1. Start Docker Containers (Run from root 'smart-docs' folder)
docker compose up -d

# 2. Run Prisma Migrations (Run from 'backend' folder)
cd backend
npx prisma migrate dev --name init
```

### 5. Running the App

Open two terminal tabs:

**Terminal 1 (Backend):**

```bash
cd backend
npm run start:dev
```

**Terminal 2 (Frontend):**

```bash
cd frontend
# Note: We force port 3001 to avoid conflict with Backend
npm run dev -- -p 3001
```

---

## 🧪 Verification (Phase 2)

To verify the **API <-> Database** connection is working, run this curl command:

```bash
curl -X POST http://localhost:3000/users \
   -H "Content-Type: application/json" \
   -d '{"email": "demo@smartdocs.ai", "name": "Phase 2 Reviewer"}'
```

**Expected Output:**

```json
{
  "id": "uuid-string-here",
  "email": "demo@smartdocs.ai",
  "name": "Phase 2 Reviewer",
  "createdAt": "2026-02-10T..."
}
```

## 🧪 Verification (Phase 4: Memory Layer)

To verify the **Event-Driven Ingestion Pipeline** (Upload -> Postgres PENDING -> Redis Worker -> Postgres COMPLETED), upload a PDF:

```bash
curl -X POST http://localhost:3000/ingestion/upload \
  -F "file=@./path/to/your/test.pdf" \
  -H "Content-Type: multipart/form-data"
```

**Expected Output:**

```JSON
{
  "status":"queued",
  "jobId":"30",
  "documentId":"263b4134-6511-44d8-8653-fcca93f100c8",
  "message":"File accepted for processing. Check status later."
}
```

**Worker Logs (Background):**

```bash
[Nest] 42174  - 02/19/2026, 8:20:39 PM     LOG [IngestionProcessor] --- [WORKER START] Job 30 ---
[Nest] 42174  - 02/19/2026, 8:20:39 PM     LOG [IngestionService] Received buffer size: 583199 bytes
[Nest] 42174  - 02/19/2026, 8:20:40 PM     LOG [IngestionService] Successfully parsed PDF. Length: 12823
[Nest] 42174  - 02/19/2026, 8:20:40 PM     LOG [IngestionProcessor] Extracted Text from Doc 263b4134-6511-44d8-8653-fcca93f100c8: pdf-parse
2.4.5 • Public • Published 4 months ago
...
[Nest] 42174  - 02/19/2026, 8:20:40 PM     LOG [IngestionProcessor] --- [WORKER COMPLETED] Document safely stored! ---
```

**Verify Persistence:**

Run Prisma Studio to view the securely stored document and its COMPLETED status:

```bash
npx prisma studio
```

---

_A Reference Implementation for Modern AI Architectures (NestJS + RAG)._
