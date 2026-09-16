# Database Design

## Database

Use **Supabase PostgreSQL + pgvector**.

Choose the embedding model before finalizing the vector column dimension.

Use a suitable vector index such as HNSW when supported and justified.

## Identity

Supabase Auth owns authentication identity.

```text
auth.users
    ↓
profiles
    ↓
roles
departments
```

Do not duplicate authentication credentials in application tables.

## Core Tables

```text
auth.users
profiles
roles
departments
categories

documents
document_chunks
faqs

conversations
messages
message_sources

tickets
ticket_comments

feedback
notifications
audit_logs
retrieval_logs
ai_usage_logs
system_settings
```

## Important Relationships

```text
auth.users → profiles
profiles → roles
profiles → departments

documents → document_chunks

conversations → messages
messages → message_sources

tickets → ticket_comments
```

## Profiles

Possible profile fields:
- user_id
- full_name
- student_number
- department_id
- role_id

Students must not be able to change their own role.

Role changes belong to authorized administrators.

## Categories

Categories must be database-driven/configurable.

Do not hardcode the initial category list throughout frontend/backend code.

## Documents

Documents should support:
- Upload
- Processing
- Chunking
- Embedding
- Versioning
- Publishing
- Archiving

Only appropriate verified/published content should be used for normal retrieval.

## Document Chunks

Chunks should retain enough metadata to trace an answer back to its source document.

The exact schema should be finalized by the backend implementation before frontend integration.

## Conversations

A conversation contains messages.

Messages may have source references.

Use a controlled recent-message window for AI context. Never send unlimited history.

## Tickets

Core ticket fields:
- id
- ticket_number
- student_id
- subject
- description
- category_id
- department_id
- priority
- status
- assigned_to
- created_at
- updated_at
- resolved_at
- ai_summary

## Ticket Comments

Support student/staff communication without exposing internal notes to unauthorized users.

## Feedback

Students can provide feedback on AI answers.

Feedback should be associated with the relevant message/answer.

## Logs

### retrieval_logs
Track retrieval behavior and quality-related data.

### ai_usage_logs
Track AI usage needed for monitoring/evaluation.

### audit_logs
Track important administrative/security actions.

## RLS

Students should only access their own:
- Conversations
- Messages
- Tickets
- Feedback
- Profile

Staff should access permitted department/assigned tickets.

Admins should access administrative resources according to role.

RLS policies must be tested.

## Database Rules

- Never expose service-role credentials to the frontend.
- Use migrations for schema changes.
- Avoid duplicated business rules.
- Keep foreign-key relationships explicit.
- Validate sensitive operations on the backend.
- Do not trust client-provided role/ownership fields.
