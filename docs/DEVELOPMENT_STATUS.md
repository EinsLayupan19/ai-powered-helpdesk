# Development Status

> Shared progress board for Backend Claude and Frontend Claude.

## Current Phase

**Phase: 0 — Repository / Architecture Setup + UI Design**

Status: IN PROGRESS

The architecture has been revised to remove the ticketing workflow. UI design/prototyping may proceed before production frontend implementation.

## Scope Decision

**Ticketing system: REMOVED from current scope.**

Do not implement:
- Ticket creation
- Ticket queues
- Ticket comments
- Ticket assignment
- Ticket statuses/priorities

Human assistance is handled through verified school office/support contacts.

## Backend

- [ ] Backend project structure
- [ ] Environment configuration
- [ ] Supabase connection
- [ ] Database schema/migrations
- [ ] Supabase Auth integration
- [ ] RBAC middleware
- [ ] RLS policies
- [ ] API foundation
- [ ] AIService abstraction
- [ ] GeminiProvider
- [ ] RAG pipeline
- [ ] Chat endpoint
- [ ] Support-directory endpoints
- [ ] Validation
- [ ] Rate limiting
- [ ] Backend tests

## Frontend

- [ ] React/TypeScript setup
- [ ] Tailwind setup
- [ ] Design system
- [ ] Routing
- [ ] Authentication UI
- [ ] Minimal student dashboard
- [ ] AI Helpdesk chat interface
- [ ] Source references
- [ ] Feedback UI
- [ ] Conversation history
- [ ] Support directory
- [ ] Staff interface
- [ ] Admin interface
- [ ] Loading/error/empty states
- [ ] Responsive behavior
- [ ] Accessibility
- [ ] Frontend tests

## UI/UX Prototype

- [ ] Figma design system
- [ ] Student login design
- [ ] Minimal student dashboard design
- [ ] AI Helpdesk chat design
- [ ] Conversation history design
- [ ] Support directory design
- [ ] Admin knowledge-base screens
- [ ] Staff/admin screens
- [ ] Responsive/mobile designs

## Shared

- [ ] README
- [x] CLAUDE.md scope updated
- [x] Architecture documentation updated
- [x] API contract updated
- [x] Database documentation updated
- [x] Security documentation updated
- [x] AI/RAG documentation updated
- [ ] Evaluation dataset
- [ ] Deployment documentation

## Current API Contract Status

- Status: AGREED / TODO
- Backend implementation: TODO
- Frontend integration: TODO

## Current Database Status

- Schema design: TODO
- Migrations: TODO
- RLS: TODO
- Seed/config data: TODO
- Support directory design: TODO

## Current AI/RAG Status

- AIService: TODO
- GeminiProvider: TODO
- Embedding model: TODO
- Vector dimension: TODO
- Retrieval: TODO
- Threshold evaluation: TODO
- Groundedness evaluation: TODO
- Evaluation dataset: TODO

## Known Issues

- Final database schema is not implemented.
- Exact API request/response types are not finalized.
- Embedding model and vector dimension are not finalized.
- Verified school knowledge/contact data is not yet loaded.

## Blockers

None.

## Latest Backend Handoff

- Date:
- Completed:
- Files changed:
- DB changes:
- API changes:
- Tests:
- Known issues:
- Next step:

## Latest Frontend Handoff

- Date:
- Completed:
- Files changed:
- API changes consumed:
- Tests:
- Known issues:
- Next step:

## Next Recommended Step

Finish the minimalist student UI prototype in Figma, then build a small HTML/CSS/JS visual prototype if desired. After the visual design is approved, Frontend Claude can refactor/convert the prototype into the repository's React + TypeScript structure.

## Rules for Updating This File

After meaningful work, update:
1. completed checklist items
2. current phase
3. blockers/issues
4. latest handoff
5. next step

Never mark a feature complete unless it has actually been implemented and tested.
