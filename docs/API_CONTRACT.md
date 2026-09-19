# API Contract

Source of truth for the frontend/backend request and response shapes.

Base URL: `/api`

Authentication:
`Authorization: Bearer <supabase JWT>`

## Ask the Help Desk

`POST /api/ask`

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
