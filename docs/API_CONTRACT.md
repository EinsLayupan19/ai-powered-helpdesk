# API Contract

Source of truth for the frontend/backend request and response shapes.

Base URL: `/api`

Authentication:
`Authorization: Bearer <supabase JWT>`

## Student ID sign-in (implemented 2026-10-16)

`POST /api/auth/student-sign-in` (no bearer token). The login page signs in with a student ID and password through this
route, or with **Continue with Google** directly through Supabase Auth (`hd=neu.edu.ph`).

**NEU accounts only:** every authenticated route (`/api/me`, `/api/ask`) answers `403 NOT_NEU_ACCOUNT` ("Only New Era
University accounts (@neu.edu.ph) can use EagleDesk.") for a valid session whose email is not exactly `@neu.edu.ph`, and
the frontend signs such sessions out.

- Body: `{ "studentId": "12-34567-890", "password": string (1 to 200 chars) }`. The ID must match `NN-NNNNN-NNN`.
- Success: `200 { "session": { "access_token", "refresh_token", "expires_in", "token_type" } }`; the frontend stores it with `supabase.auth.setSession`.
- The backend looks up `profiles.student_number` with the service-role key, then signs in with Supabase Auth's normal
  password sign-in. It never returns the email, gives the same answer for an unknown ID and a wrong password, and makes
  every attempt take at least 0.7 s so timing does not reveal which IDs exist. Responses are `Cache-Control: no-store`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | ID not in `NN-NNNNN-NNN` format, or missing/too long password |
| 401 | `INVALID_CREDENTIALS` | Unknown student ID or wrong password (one message for both) |
| 403 | `EMAIL_NOT_CONFIRMED` | Right password, but the NEU email has not been confirmed yet |
| 429 | `RATE_LIMITED` | More than 10 attempts per device or 5 per student ID in 15 minutes (`Retry-After`), or Supabase's own limit |
| 503 | `STUDENT_SIGN_IN_UNAVAILABLE` | `SUPABASE_SERVICE_ROLE_KEY` is not set (or is not a service-role key); the message points to Continue with Google |
| 503 | `AUTH_UNAVAILABLE` | Supabase could not be reached |

`POST /api/auth/student-reset` with `{ "studentId": "12-34567-890" }` sends a password reset link to the account's university
email. It always answers `200 { "ok": true, "message": "If that student ID has an account, a password reset link is on its way
to its university email." }` (also for unknown IDs and non-NEU accounts, which get no email), or 400 / 429 / 503 as above.
Limited separately from sign-in, with the same limits; `no-store`.

`POST /api/auth/register` with `{ "fullName", "studentId": "12-34567-890", "email": "...@neu.edu.ph", "password" }` creates an
account. Supabase emails a confirmation link to the NEU address; the server links the student ID (students cannot write
`profiles.student_number` themselves). Success: `201 { "ok": true, "message": "Account created. Open the confirmation link we
sent to <email>, then sign in with your student ID." }`. Limited to 5 per device per hour; `no-store`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Bad ID format, non-NEU email, password under 8 or over 72 characters, missing name |
| 400 | `WEAK_PASSWORD` | Supabase rejected the password as too weak |
| 409 | `STUDENT_ID_TAKEN` | The ID belongs to a confirmed account |
| 409 | `STUDENT_ID_PENDING` | The ID was used for an unconfirmed sign-up less than an hour ago (older ones are released) |
| 409 | `EMAIL_TAKEN` | The NEU email already has an account |
| 429 | `RATE_LIMITED` | Too many attempts from this device, or Supabase's email limit |
| 503 | `REGISTRATION_UNAVAILABLE` | No service-role key, or sign-ups are turned off in Supabase |
| 503 | `AUTH_UNAVAILABLE` | Supabase could not be reached |

This route does reveal whether a student ID is already registered (needed to explain why it cannot be used); the
email of that account is never revealed.

## Ask the Help Desk

`POST /api/ask`

### Implemented today (2026-10-16)

The running backend (`backend/src/app.ts`) accepts a smaller request than the planned design below:

- Header: `Authorization: Bearer <Supabase access token>` (verified with Supabase Auth on every request).
- Body: `{ "message": string (1 to 4,000 chars), "history"?: [{ "role": "user" | "assistant", "content": string }] (max 6) }`. The frontend sends only `message`.
- Success: `{ "answer": string, "sources": [{ "id", "title", "category" }], "schedule"?: {...} }`.
- Errors are `{ "error": { "code", "message" } }`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Missing/empty/too long message, bad history, invalid JSON |
| 413 | `INVALID_REQUEST` | Request body over 100 KB |
| 401 | `UNAUTHENTICATED` | No token, or an invalid/expired one |
| 429 | `RATE_LIMITED` | More than 30 questions in 10 minutes from one student (`Retry-After` header in seconds) |
| 429 | `AI_RATE_LIMITED` | Gemini's own quota is exhausted |
| 503 | `AUTH_NOT_CONFIGURED` / `AUTH_UNAVAILABLE` | Supabase Auth not configured or unreachable |
| 503 | `KNOWLEDGE_UNAVAILABLE` | School question while knowledge retrieval failed |
| 503 | `AI_NOT_CONFIGURED` | No `GEMINI_API_KEY` on the server |
| 504 | `AI_TIMEOUT` | Gemini did not answer within 20 seconds (one retry included) |
| 502 | `AI_UNAVAILABLE` | Any other Gemini failure (details are never forwarded) |

### Planned design

Request:

```json
{
  "conversationId": "string | null",
  "question": "string"
}
```

Response:

```json
{
  "conversationId": "string",
  "category": "Network",
  "answer": "string",
  "sources": [
    {
      "id": "string",
      "title": "string"
    }
  ],
  "needsHumanHelp": false
}
```

If verified knowledge is insufficient:

```json
{
  "conversationId": "string",
  "category": "Other",
  "answer": "I don't have enough verified information to answer that accurately.",
  "sources": [],
  "needsHumanHelp": true
}
```

The backend must not return fabricated school-specific information.

## Conversations

`GET /api/conversations`

Returns the authenticated user's conversations, most recent first.

```json
[
  {
    "id": "string",
    "title": "string",
    "updatedAt": "ISO8601"
  }
]
```

`GET /api/conversations/:id`

```json
{
  "id": "string",
  "title": "string",
  "messages": [
    {
      "role": "user",
      "text": "string",
      "createdAt": "ISO8601"
    },
    {
      "role": "ai",
      "text": "string",
      "sources": [
        {
          "id": "string",
          "title": "string"
        }
      ],
      "createdAt": "ISO8601"
    }
  ]
}
```

`DELETE /api/conversations`

Clears conversation history for the authenticated user.

## Support Contacts

`GET /api/support-contacts`

Returns active verified support contacts.

## Human Help

`POST /api/support-requests`

Request:

```json
{
  "conversationId": "string",
  "problemSummary": "string",
  "category": "string"
}
```

Response:

```json
{
  "id": "string",
  "status": "pending",
  "createdAt": "ISO8601"
}
```

This is a simple support request. It is not a ticketing workflow.

## Feedback

`POST /api/feedback`

Request:

```json
{
  "messageId": "string",
  "rating": "helpful | not_helpful",
  "comment": "string | null"
}
```

## Profile

`GET /api/profile`

Returns the authenticated user's profile.

`PATCH /api/profile`

Updates only fields explicitly allowed by the backend.

## Admin Knowledge

`GET /api/admin/knowledge`

`POST /api/admin/knowledge`

`PATCH /api/admin/knowledge/:id`

`DELETE /api/admin/knowledge/:id`

Only authorized staff/admin users may use these routes.

## Admin Categories

`GET /api/categories`

Returns the database-driven category list.

## Error Shape

Use a consistent error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message"
  }
}
```

Do not expose stack traces, secrets, database credentials, or internal prompts.
