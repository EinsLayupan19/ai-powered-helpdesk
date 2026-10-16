# API Contract

Source of truth for the frontend/backend request and response shapes.

Base URL: `/api`

Authentication:
`Authorization: Bearer <supabase JWT>`

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
