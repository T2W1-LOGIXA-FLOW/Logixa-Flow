# Logixa Flow

> **Autonomous multi-agent workflow orchestration — design, execute, and observe AI-powered workflows.**

Logixa Flow is a software platform for coordinating AI agents and multi-step workflows. The project brings together a web-based command interface, an asynchronous API backend, model-provider routing, retrieval-augmented generation (RAG), and background task infrastructure.

<p align="center">
  <a href="https://logixa-flow.vercel.app">Live application</a> ·
  <a href="https://logixa-flow.onrender.com">Backend service</a> ·
  <a href="https://github.com/logixaflow">GitHub profile</a>
</p>

## Project at a glance

| Area | Technology |
| --- | --- |
| Web application | Next.js 15 |
| API and orchestration | Python 3.12, FastAPI |
| Database and vector search | Supabase, PostgreSQL, pgvector |
| Model integration | Gemini, Groq, OpenRouter |
| Background processing | Celery, Upstash Redis / QStash |
| Deployment | Vercel (web), Render (API) |
| File and media infrastructure | Cloudinary, Backblaze B2 |
| Monitoring | Sentry, Axiom |

> Technology references describe the project's documented stack. Availability and production health of external services may change.

## Core capabilities

- **Multi-agent orchestration** — coordinate agent steps across multi-stage workflows.
- **Model-provider routing** — integrate multiple LLM providers and configure fallback paths.
- **RAG and semantic retrieval** — use vector embeddings and pgvector-backed retrieval for knowledge-assisted tasks.
- **Asynchronous execution** — offload longer-running work to background queues.
- **Workflow visibility** — inspect workflow progress through the visual interface and execution tracing.
- **Operational integrations** — connect automation and status notifications with Telegram.
- **Security-oriented controls** — project documentation includes role-based access control, webhook signature verification, and audit logging.

## Architecture

At a high level, the system is organized into three layers:

1. **Experience layer** — the Next.js web application provides the workflow design and operations interface.
2. **Orchestration layer** — the FastAPI service coordinates API requests, agent execution, model routing, and retrieval.
3. **Data and execution layer** — PostgreSQL/pgvector stores application and vector data; Redis-backed services support asynchronous work; object storage and observability services support operations.

```text
Web UI (Next.js)
      |
      v
API & Orchestration (FastAPI)
      |
      +---- Model providers (Gemini / Groq / OpenRouter)
      |
      +---- Retrieval (Supabase PostgreSQL + pgvector)
      |
      +---- Background jobs (Celery + Upstash)
      |
      +---- Storage / Monitoring integrations
```

## Repository layout

The application setup documented for this repository uses:

- `apps/web-platform/backend` — Python API and backend services
- `apps/web-platform/frontend` — Next.js web application

Other directories may contain supporting services, deployment configuration, and project tooling.

## Getting started

### Prerequisites

- Python 3.12
- Node.js compatible with the frontend dependencies
- pnpm
- Access to the external services required by the features you intend to run

### Backend

```bash
cd apps/web-platform/backend
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
# .venv\\Scripts\\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

Open a second terminal:

```bash
cd apps/web-platform/frontend
pnpm install
pnpm dev
```

The frontend and backend may require environment variables and credentials for database, model-provider, queue, storage, and monitoring integrations. Configure them using the variable names and examples defined in the relevant project configuration; never commit real secrets.

## Configuration and secrets

Before running integrations, review the repository's environment templates and deployment configuration. Typical credentials for this documented stack may include database access, model-provider API keys, queue credentials, storage credentials, and monitoring DSNs.

- Keep secrets in local environment files or the deployment platform's secret manager.
- Do not commit `.env` files containing real credentials.
- Use separate credentials for development and production.
- Rotate any credential that has been exposed.

## Security

Security is part of the engineering approach for this project. The README documents controls such as:

- Role-based access control (RBAC)
- HMAC-based webhook signature verification
- Audit logging
- Database row-level security guardrails

These statements describe documented design elements; they are not a substitute for an independent security assessment. Report suspected vulnerabilities privately to the repository maintainers rather than publishing exploit details in an issue.

## Deployment

The documented deployment targets are:

- **Frontend:** Vercel
- **Backend:** Render

Set production environment variables through the respective platform's secret-management settings. Confirm health checks, database connectivity, queue processing, and provider credentials after deployment.

## Contributing

Contributions should be focused and reviewable.

1. Create a feature branch.
2. Keep changes scoped and document configuration changes.
3. Add or update tests for behavior changes.
4. Run relevant checks before opening a pull request.
5. Include a concise description, rationale, and verification notes.

Do not include credentials, customer data, or other sensitive information in commits, issues, or pull requests.

## License

The project currently declares a **Private Enterprise License — All Rights Reserved**. No permission to use, modify, or redistribute the software is granted beyond the terms provided by the repository owner.
