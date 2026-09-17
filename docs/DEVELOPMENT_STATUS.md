# Development Status

Read top-to-bottom before starting a session. Add a new entry at the
top after every session — don't edit past entries.

---

## [DATE] — Frontend — prototype complete

- Static HTML/CSS/JS prototype built for all core screens: dashboard
  (ask bar + popular topics), AI Helpdesk chat, Conversations,
  Profile, Notifications, Settings. Files: `index.html`, `style.css`,
  `script.js` (not yet the real React app).
- Visual direction locked in: navy anchor color, blue→violet gradient
  used on page background / sidebar / active nav / hero card. Dark
  mode toggle implemented and working.
- Chat responses in the prototype are hardcoded keyword-matching, not
  real — see `generateDemoResponse()` in script.js for what needs to
  be replaced by a real `POST /api/ask` call.
- **Not started**: porting prototype to React/TS/Tailwind, wiring to
  any real API.

## Next up

- [ ] Backend: stand up `POST /api/ask` per API_CONTRACT.md (can
      start against a stub knowledge base before RAG is fully wired)
- [ ] Backend: resolve the two open questions in API_CONTRACT.md
      (topics source, ticket escalation flow)
- [ ] Frontend: scaffold the React/TS/Tailwind app, port prototype
      screens as components, wire to mocked API responses matching
      the contract shapes
