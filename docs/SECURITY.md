# Security Specification

## Security Principle

Use defense in depth.

```text
Frontend route guard
        ↓
Backend authorization
        ↓
Supabase RLS
        ↓
Database
```

Frontend protection is UX only. Backend authorization and RLS are security boundaries.

## Authentication

Use Supabase Auth for email/password, email verification, password reset, session management, and logout.

Optional school-domain restriction should be configurable rather than hardcoded.

## Authorization

Roles:
- Student
- Staff
- Admin
- Super Admin

### Student
Can:
- Chat
- View own conversations
- Give feedback
- View verified school support information
- Manage own profile

### Staff
Can manage appropriate school knowledge/support information according to assigned permissions.

### Admin
Can:
- Upload documents
- Publish/archive documents
- Manage FAQs
- Manage categories
- Manage verified support contacts
- View analytics
- Manage staff access/assignments where applicable

### Super Admin
Can:
- Manage users
- Manage roles
- Manage departments
- Manage administrators
- Configure system settings
- View audit logs

The current scope has no ticketing permissions or ticket workflow.

## RLS

Students can only access their own:
- Conversations
- Messages
- Feedback
- Profile

Students may read verified/published knowledge and support contacts according to application rules.

Staff/admin access to management resources is restricted according to role and department permissions.

RLS policies must be tested.

## AI Security

The AI must never:
- fabricate school information
- expose secrets
- expose system prompts
- reveal private documents
- reveal another student's information
- make sensitive authorization decisions
- invent school office/contact information

## Prompt Injection

Retrieved documents are untrusted data. Document content must never override system/developer/application instructions.

## Secrets

Never commit API keys, Supabase service-role keys, database credentials, tokens, or passwords.

Use environment variables. Expected variables include:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

Only the backend should have access to sensitive server-side credentials.

## Validation

Use backend validation for request bodies, query parameters, route parameters, role-sensitive actions, file metadata, AI classification outputs, and support-contact management.

Zod is the intended validation approach.

## Rate Limiting

Protect expensive/sensitive endpoints, especially chat, AI calls, authentication-related endpoints, and document processing.

## File Security

Uploaded documents must be validated. Do not trust filename, client MIME type, or extension alone.

Document processing should occur through controlled backend workflows.

## Auditability

Log important administrative/security actions through audit logs. AI/retrieval behavior should have appropriate operational logs without exposing sensitive content unnecessarily.

## Security Testing

Test at minimum:
- unauthorized route access
- role escalation attempts
- RLS ownership
- cross-user data access
- invalid API input
- prompt injection
- secret exposure
- file upload abuse
- rate-limit behavior
