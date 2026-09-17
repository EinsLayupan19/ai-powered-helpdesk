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
support_contacts

conversations
messages
message_sources

feedback
notifications
audit_logs
retrieval_logs
ai_usage_logs
system_settings
```

The previous ticketing tables are intentionally removed from the current scope:
- `tickets`
- `ticket_comments`

Do not recreate them unless the project scope is explicitly changed.

## Important Relationships

```text
auth.users → profiles
profiles → roles
profiles → departments

documents → document_chunks

conversations → messages
messages → message_sources

categories → support_contacts
```

Exact foreign-key relationships should be finalized by backend migrations.

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

Categories must be database-driven and configurable.

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

## FAQs

FAQs are curated school knowledge that can be retrieved as verified information.

They should support appropriate publication/activation controls so only approved content is used in normal answering.

## Support Contacts

The support directory stores verified school office/support information that students can use when the AI cannot safely answer.

Possible fields:
- id
- name
- category_id or department_id
- description
- location
- contact information
- office hours when verified
- active/published status
- created_at
- updated_at

Do not expose unverified or unpublished contacts as authoritative information.

Do not allow the AI to invent support contacts.

## Conversations

A conversation contains messages.

Messages may have source references.

Use a controlled recent-message window for AI context. Never send unlimited history.

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
- Feedback
- Profile

Students may read publicly available verified knowledge/support information according to application rules.

Staff/admin access to knowledge-management resources should follow role and department permissions.

Admins should access administrative resources according to role.

RLS policies must be tested.

## Database Rules

- Never expose service-role credentials to the frontend.
- Use migrations for schema changes.
- Avoid duplicated business rules.
- Keep foreign-key relationships explicit.
- Validate sensitive operations on the backend.
- Do not trust client-provided role/ownership fields.
- Do not store unnecessary sensitive student information.
- Do not recreate ticket tables for the current MVP.
