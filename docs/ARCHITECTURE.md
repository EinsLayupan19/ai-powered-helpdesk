# System Architecture

## Architectural Goal

Build a simple full-stack school IT helpdesk that is easy to understand, maintain, and demonstrate for an academic project.

The architecture has four main parts:
- Frontend
- Express backend
- Supabase database/authentication
- AI service

There is no complex ticketing architecture in the current MVP.

## High-Level Architecture

```text
Student
   |
   v
HTML + CSS + JavaScript
   |
   v
Node.js + Express.js API
   |
   +-------------------+
   |                   |
   v                   v
Supabase PostgreSQL   Gemini API
   |
   +-------------------+
   |
Verified Knowledge
Support Contacts
Users / Conversations
Support Requests
Feedback
```

## Simple Project Structure

```text
ai-powered-helpdesk/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── helpdesk.js
│   │   ├── conversations.js
│   │   └── admin.js
│   ├── services/
│   │   ├── ai.js
│   │   └── knowledge.js
│   ├── middleware/
│   │   └── auth.js
│   └── db/
│       └── supabase.js
│
├── database/
│   └── schema.sql
│
├── docs/
├── .env.example
└── README.md
```

The exact structure may grow as implementation progresses, but unnecessary layers should not be added just for abstraction.

## Request Lifecycle

### Normal IT Concern

```text
Question
  ↓
Authenticate
  ↓
Validate request
  ↓
AI classifies category
  ↓
Search verified knowledge
  ↓
Relevant knowledge found?
  ├── Yes → AI generates troubleshooting steps
  │          ↓
  │       Show answer + knowledge source
  │
  └── No → Explain limitation
             ↓
          Offer verified IT support
```

### Human Help Request

```text
Student cannot solve problem
        ↓
Request human help
        ↓
Create simple support_request record
        ↓
Authorized IT staff can view/respond
```

This is intentionally simpler than a full ticketing system.

## AI Service

Keep Gemini-specific code inside one backend service.

```text
services/ai.js
├── classifyProblem()
└── generateTroubleshootingAnswer()
```

The frontend never calls the Gemini API directly.

## Knowledge Retrieval

The MVP uses simple database retrieval.

Example:

```text
Student: "The classroom Wi-Fi keeps disconnecting."
              ↓
AI category: Network
              ↓
Backend searches verified knowledge
              ↓
Matching articles / troubleshooting steps
              ↓
Gemini receives only the relevant content
              ↓
Grounded answer
```

Possible search fields:
- category
- title
- keywords
- problem description
- troubleshooting content

If simple search becomes insufficient, vector search can be added later without changing the student-facing flow.

## Security Boundary

```text
Browser
  ↓
Express authentication/authorization
  ↓
Supabase
  ↓
Database
```

The browser is never trusted with service-role credentials or the Gemini API key.

## Design Principles

- Keep the stack simple
- Separate frontend and backend
- Keep AI calls on the backend
- Use verified knowledge
- Never invent school information
- Avoid unnecessary abstractions
- Do not build ticketing unless scope changes
- Build and test one feature at a time
