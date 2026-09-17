# API Contract

## Purpose

Contract between Backend Claude and Frontend Claude.

**Backend implements. Frontend consumes.**

The current scope does **not** include ticket creation, ticket queues, ticket comments, or ticket assignment.

## Status Labels

- IMPLEMENTED
- AGREED
- MOCKED
- TODO

## API Conventions

- REST API
- JSON request/response bodies unless file upload requires multipart
- Supabase Auth session/token authentication
- Backend validates all incoming data
- Consistent error structure
- Sensitive authorization decisions happen on the backend

## Authentication

Supabase Auth handles:
- Sign up
- Email verification
- Login
- Password reset
- Session management
- Logout

## Chat

Planned:
```text
POST /api/chat
GET  /api/conversations
GET  /api/conversations/:id
POST /api/conversations
DELETE /api/conversations/:id
POST /api/messages/:id/feedback
```

A successful chat response conceptually contains:
- assistant answer
- source references when retrieval was used
- classification metadata only when safe/needed
- conversation/message identifiers
- feedback capability
- verified support-directory references when human assistance is appropriate

If verified information is insufficient, use:

> I don't have enough verified information to answer that accurately.

The frontend may then display appropriate verified support contacts.

## Categories

Planned:
```text
GET /api/categories
```

## Support Directory

Planned:
```text
GET /api/support-contacts
GET /api/support-contacts/:id
```

Only verified/published support information may be returned to students. The system must never manufacture contact information from AI output.

## Knowledge Base — Admin

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

GET  /api/admin/support-contacts
POST /api/admin/support-contacts
PATCH /api/admin/support-contacts/:id
DELETE /api/admin/support-contacts/:id
```

## Admin/Staff

Planned endpoint groups may include:
- staff management
- analytics
- notifications
- audit logs

Exact endpoints must be documented before frontend implementation.

## Errors

Use a consistent shape such as:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

## Contract Change Rule

If backend behavior changes:
1. Update this document.
2. Update backend implementation.
3. Update frontend types/integration.
4. Test the affected flow.

Never silently change an API consumed by the frontend.
