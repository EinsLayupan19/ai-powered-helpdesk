# Database Design

## Database

Use **Supabase PostgreSQL**.

The MVP does not require pgvector or a vector database. Knowledge retrieval starts with normal PostgreSQL filtering/search.

## Core Tables

```text
profiles
categories
knowledge_articles
support_contacts

conversations
messages

support_requests
feedback

audit_logs
```

Supabase Auth manages authentication identities separately.

## Relationships

```text
auth.users
    ↓
profiles
    ↓
categories / departments as needed

categories
    ↓
knowledge_articles

profiles
    ↓
conversations
    ↓
messages

profiles
    ↓
support_requests

messages
    ↓
feedback
```

## Profiles

Possible fields:
- id / user_id
- full_name
- student_number
- program
- section
- role
- created_at
- updated_at

Roles should be controlled by the backend/database. Students must not be able to change their own role.

## Categories

Categories are database-driven.

Initial values:
- Network
- Hardware
- Software
- Printer
- Account / Login
- Storage / Files
- General IT
- Other

The frontend should load categories from the database instead of duplicating the list in several files.

## Knowledge Articles

A knowledge article represents a verified troubleshooting guide.

Possible fields:
- id
- category_id
- title
- keywords
- problem_description
- troubleshooting_steps
- source
- published
- created_by
- created_at
- updated_at

Only published and verified articles should be used for normal AI answers.

For the MVP, one article can contain its troubleshooting steps directly. Do not create document chunks or embeddings unless they become necessary later.

## Support Contacts

Stores verified IT/school support information.

Possible fields:
- id
- name
- department
- description
- location
- contact_information
- office_hours
- published
- created_at
- updated_at

The AI must never invent support contacts. Only active verified records may be shown.

## Conversations

A conversation belongs to one authenticated user.

Possible fields:
- id
- user_id
- title
- created_at
- updated_at

## Messages

Possible fields:
- id
- conversation_id
- role
- content
- category
- created_at

Roles can be:
- user
- ai

Keep the recent conversation context limited when sending messages to the AI.

## Support Requests

This is a simple human-help record, not a full ticketing system.

Possible fields:
- id
- user_id
- conversation_id
- problem_summary
- category_id
- status
- staff_response
- created_at
- updated_at

For the MVP, status can remain simple:
- pending
- responded
- closed

Do not add ticket queues, priorities, SLAs, ticket comments, or assignment logic unless scope changes.

## Feedback

Possible fields:
- id
- message_id
- user_id
- rating
- comment
- created_at

Feedback should belong to the authenticated user and relevant AI response.

## Audit Logs

Use for important administrative actions such as:
- knowledge article changes
- support contact changes
- role changes

Do not log sensitive secrets or unnecessary personal information.

## Row-Level Security

Students should only access their own:
- profiles
- conversations
- messages
- support requests
- feedback

Students may read published knowledge articles and published support contacts.

Staff/admin access must be restricted by role.

RLS should be enabled and tested before production use.

## Database Rules

- Never expose the Supabase service-role key to the frontend.
- Use SQL migrations/schema files for repeatable database setup.
- Keep business rules in the backend/database, not only in JavaScript.
- Do not store unnecessary sensitive student information.
- Do not add pgvector just because the system uses AI.
- Keep the database small enough for the academic MVP.
