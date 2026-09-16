# API Contract

## Purpose

This document is the contract between the Backend Claude and Frontend Claude.

**Backend implements. Frontend consumes.**

Do not invent endpoints or fields outside this document.

## Current Status

This contract starts as a design contract. Exact request/response schemas should be finalized by the backend before frontend integration.

Use these labels:
- IMPLEMENTED
- AGREED
- MOCKED
- TODO

## API Conventions

- REST API
- JSON request/response bodies unless file upload requires multipart
- Authentication via Supabase Auth session/token
- Backend validates all incoming data
- Errors use a consistent structure
- Sensitive authorization decisions happen on the backend

## Planned Endpoint Groups

### Authentication

Supabase Auth handles:
- Sign up
- Email verification
- Login
- Password reset
- Session management
- Logout

The frontend should use the agreed Supabase Auth integration rather than implementing its own password system.

### Chat

Planned:
```text
POST /api/chat
GET  /api/conversations
GET  /api/conversations/:id
POST /api/conversations
DELETE /api/conversations/:id
POST /api/messages/:id/feedback
```

### Tickets

Planned:
```text
POST /api/tickets
GET  /api/tickets
GET  /api/tickets/:id
POST /api/tickets/:id/comments
PATCH /api/tickets/:id
```

### Categories

Planned:
```text
GET /api/categories
```

### Knowledge Base — Admin

Planned:
```text
GET  /api/admin/documents
POST /api/admin/documents
PATCH /api/admin/documents/:id
POST /api/admin/documents/:id/publish
POST /api/admin/documents/:id/archive

GET  /api/admin/faqs
POST /api/admin/faqs
PATCH /api/admin/faqs/:id
DELETE /api/admin/faqs/:id
```

### Admin/Staff

Planned endpoint groups may include:
- ticket assignment
- staff management
- analytics
- notifications
- audit logs

Exact endpoints must be documented before frontend implementation.

## Chat Response Expectations

A successful chat response should conceptually contain:
- assistant answer
- source references when retrieval was used
- classification metadata only when safe/needed
- conversation/message identifiers
- feedback capability
- escalation/ticket capability when applicable

Exact TypeScript types are owned by the backend contract.

## Ticket Response Expectations

Tickets should expose only fields the requesting role is authorized to see.

AI-generated summaries must be clearly labeled as AI-generated.

## Error Contract

Use a consistent shape such as:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

The final implementation may extend this structure, but frontend and backend must agree before integration.

## Contract Change Rule

If backend behavior changes:
1. Update this document.
2. Update backend implementation.
3. Notify/update frontend types and integration.
4. Test the affected flow.

Never silently change an API consumed by the frontend.
