# API Contract

Source of truth for every request/response shape between frontend and
backend. Frontend builds against this even before an endpoint is
real (mock the shape). Backend implements to match this exactly.
Change something here → note it in DEVELOPMENT_STATUS.md so the other
lead sees it.

Base URL: `/api` (adjust once backend picks a mount path)
Auth: assume `Authorization: Bearer <supabase JWT>` on every route
below unless noted otherwise.

---

## Ask the helpdesk

`POST /api/ask`

Request
```json
{ "conversationId": "string | null", "question": "string" }
```

Response
```json
{
  "conversationId": "string",
  "answer": "string",
  "grounded": true,
  "sources": [ { "title": "string", "url": "string | null" } ],
  "escalated": false
}
```
- `grounded: false` + no sources → not enough verified info (fallback state)
- `escalated: true` → a support ticket was created; include `ticketId`

---

## Conversations

`GET /api/conversations` → list, most recent first
```json
[
  { "id": "string", "title": "string", "preview": "string", "updatedAt": "ISO8601" }
]
```

`GET /api/conversations/:id` → full message history
```json
{
  "id": "string",
  "title": "string",
  "messages": [
    { "role": "user" | "ai", "text": "string", "sources": ["string"], "createdAt": "ISO8601" }
  ]
}
```

`DELETE /api/conversations` → clears all history for the user (Settings → "Clear conversation history")

---

## Profile

`GET /api/profile`
```json
{
  "fullName": "string",
  "studentNumber": "string",
  "program": "string",
  "section": "string",
  "email": "string",
  "status": "active | inactive",
  "conversationsStarted": 0,
  "topicsAsked": ["string"]
}
```

`PATCH /api/profile` — editable fields only (TBD which fields are
user-editable vs. pulled from the school system; flag in status doc
once decided)

---

## Notifications

`GET /api/notifications`
```json
[
  { "id": "string", "type": "answer | conversation | announcement | system", "title": "string", "body": "string", "read": false, "createdAt": "ISO8601" }
]
```

`POST /api/notifications/read-all` → marks all as read, no body

---

## Settings

`GET /api/settings`
```json
{
  "theme": "light | dark",
  "notifications": { "answers": true, "announcements": true, "emailSummaries": false },
  "language": "en | fil"
}
```

`PATCH /api/settings` — partial update, same shape

---

## Open questions for Backend Claude

- Topic list on the dashboard ("Academic", "Enrollment", ... "View all
  topics") — static config or a DB table? Affects whether there's a
  `/api/topics` endpoint.
- Ticket escalation flow — what does the student see/receive once a
  ticket is created?
