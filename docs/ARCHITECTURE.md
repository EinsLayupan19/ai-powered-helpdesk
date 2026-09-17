# System Architecture

## Architectural Goal

Build a maintainable full-stack school helpdesk with strict separation between:
- Frontend presentation
- Backend business logic
- Database
- AI provider
- Retrieval system
- Security/authorization

The system is intentionally focused on answering student school concerns from verified information and guiding students to verified school support contacts when the AI cannot safely answer.

There is **no ticketing workflow in the current architecture**.

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
Support Directory
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

### Insufficient Information / Human Support

```text
Question
→ Retrieval/classification
→ Cannot safely answer
→ Explain limitation
→ Identify appropriate verified school office/support contact
→ Show contact information from trusted system data
```

The system must not invent a contact, office, schedule, or procedure. If no verified support information exists, it must say so clearly.

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
├── FAQs
└── Support Directory
```

Documents should support lifecycle/versioning and only verified/published knowledge should participate in normal production retrieval.

Support directory entries must also be verified before being shown as authoritative contact information.

## Student Experience Architecture

```text
Login
  ↓
Dashboard
  ↓
AI Helpdesk
  ↓
Question
  ↓
Grounded Answer + Sources
  │
  ├── Feedback
  │
  └── Insufficient Information
          ↓
      Support Directory
```

Conversation history is available separately and should not overload the dashboard.

## Design Principles

- Separation of concerns
- Explicit contracts
- Minimal coupling
- Secure defaults
- Testability
- Observable AI behavior
- No fake production data
- Incremental development
- Minimal student-facing UX
- Reliable information over feature quantity
