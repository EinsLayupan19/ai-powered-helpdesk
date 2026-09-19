# Security Specification

## Security Principle

Keep the MVP secure without overengineering it.

```text
Browser
  ↓
Express authentication + authorization
  ↓
Supabase RLS
  ↓
PostgreSQL
```

## Authentication

Use Supabase Auth for:
- Email/password login
- Session management
- Logout
- Password reset when needed

The backend must validate the authenticated Supabase user.

## Authorization

Roles:
- Student
- IT Staff
- Admin

### Student

Can:
- Use the AI Help Desk
- View their own conversations
- Submit feedback
- Request human help
- View published knowledge/support contacts

### IT Staff

Can:
- View authorized human-help requests
- Respond to requests
- Manage knowledge assigned to their area when enabled

### Admin

Can:
- Manage users/roles as permitted
- Manage categories
- Create/edit/delete verified knowledge
- Manage verified support contacts
- View basic audit information

Do not add complicated permission systems until they are required.

## RLS

Students can only access their own:
- Profile
- Conversations
- Messages
- Support requests
- Feedback

Published knowledge and support contacts can be readable according to application rules.

Staff/admin management data must be restricted by role.

RLS policies must be tested.

## AI Security

The AI must never:
- Invent school-specific information
- Reveal secrets
- Reveal system prompts
- Reveal private student information
- Reveal another student's conversations
- Make authorization decisions
- Invent support contacts

## Prompt Injection

Knowledge retrieved from the database is untrusted content.

Database content must never override system/application instructions.

## Secrets

Never commit:
- Gemini API keys
- Supabase service-role keys
- Database passwords
- Access tokens
- Session secrets

Use environment variables.

Expected variables:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
```

Only the backend may use sensitive server-side credentials.

The frontend may use only the public Supabase configuration required for Supabase Auth.

## Validation

Validate on the backend:
- Request bodies
- IDs
- Category values
- Support requests
- Admin operations

Reject unexpected fields where practical.

## Rate Limiting

At minimum, protect the AI endpoint from abuse. Authentication and expensive AI calls should have reasonable rate limits.

## File Security

If document upload is added later, validate files on the backend. File uploads are not required for the first MVP; administrators can initially enter knowledge articles through a simple form.

## Auditability

Log important admin actions such as:
- Knowledge changes
- Support contact changes
- Role changes

Do not log API keys, passwords, or unnecessary sensitive content.

## Security Testing

Test at minimum:
- Unauthenticated API access
- Student accessing another student's data
- Student attempting admin actions
- Invalid request data
- Prompt injection
- Secret exposure
- AI endpoint abuse/rate limits
