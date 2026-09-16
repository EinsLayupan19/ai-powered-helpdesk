# System Architecture

## Architectural Goal

Build a maintainable full-stack school support system with strict separation between:
- Frontend presentation
- Backend business logic
- Database
- AI provider
- Retrieval system
- Security/authorization

## High-Level Architecture

```text
Student / Staff / Admin
        |
        v
React + TypeScript Frontend
        |
        v
REST API
        |
        +--------------------+
        |                    |
        v                    v
   Business Logic       Supabase Auth
        |
        +--------------------+
        |                    |
        v                    v
 PostgreSQL             AIService
 + pgvector                  |
        |                    v
        |              GeminiProvider
        |
        v
Knowledge Base
Documents → Chunks
FAQs
```

## Backend Layers

Recommended separation:

```text
backend/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── middleware/
│   ├── validators/
│   ├── lib/
│   ├── ai/
│   ├── rag/
│   └── types/
└── tests/
```

Responsibilities:
- Routes: endpoint registration
- Controllers: request/response handling
- Services: business logic
- Repositories: database access
- Middleware: auth, authorization, rate limits, errors
- Validators: request validation
- AI: provider abstraction
- RAG: embedding/retrieval/context construction

## Frontend Layers

Recommended structure:

```text
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── layouts/
│   ├── hooks/
│   ├── services/
│   ├── lib/
│   ├── types/
│   └── routes/
└── tests/
```

## AI Provider Abstraction

Do not scatter Gemini-specific code throughout the application.

Use:

```text
AIService
├── generateAnswer()
├── classifyIntent()
└── embed()

GeminiProvider implements AIService
```

Future providers should be possible without rewriting the rest of the application.

## Request Lifecycle

### School Question

```text
Request
→ Authenticate
→ Validate
→ Classify
→ Determine retrieval requirement
→ Retrieve verified chunks
→ Apply retrieval threshold
→ Build limited context
→ Generate grounded answer
→ Attach source references
→ Log retrieval/AI usage
→ Return response
```

### Escalation

```text
Question
→ Retrieval/classification
→ Cannot safely answer
→ Explain limitation
→ Student creates ticket
→ Backend validates ticket
→ AI may generate structured summary
→ Staff handles ticket
```

## Security Gates

Security should exist at multiple levels:

```text
Frontend route protection
        ↓
Backend authorization
        ↓
Supabase RLS
        ↓
Database
```

Frontend guards are UX, not the security boundary.

RLS is the database-level security source of truth.

## Knowledge Architecture

```text
Knowledge Base
├── Documents
│   └── Document Chunks
└── FAQs
```

Documents should support lifecycle/versioning and only verified/published knowledge should participate in normal production retrieval.

## Design Principles

- Separation of concerns
- Explicit contracts
- Minimal coupling
- Secure defaults
- Testability
- Observable AI behavior
- No fake production data
- Incremental development
