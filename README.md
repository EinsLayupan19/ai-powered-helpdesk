# EagleDesk

**AI-Powered School Helpdesk System**

EagleDesk is a web-based school helpdesk designed to help students find school-related information, procedures, schedules, and announcements through a simple conversational interface.

The project is being developed as an academic project for **New Era University**.

> 🚧 **Status:** Work in Progress

## Features

- 💬 **AI Helpdesk** — Ask questions about school-related information in a conversational interface.
- 📚 **School Information** — Access verified procedures and commonly requested school information.
- 🗓️ **Academic Calendar** — Provides calendar information while distinguishing current and historical academic calendars.
- 🏫 **Class Schedules** — Supports section-based class schedule information.
- 📢 **School Announcements** — Directs users to official school announcements when appropriate.
- 👨‍🏫 **Faculty & Office Guidance** — Helps students identify the appropriate office, faculty member, or school system for a concern.
- 🌙 **Light/Dark Interface** — Simple interface with theme support.
- 📱 **Responsive Design** — Designed for use across different screen sizes.

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Planned / Developing

- AI-powered question answering
- Knowledge base / RAG
- Backend API
- Database and authentication

## Project Structure

```
ai-powered-helpdesk/
├── docs/
│   ├── KNOWLEDGE_BASE.md
│   └── ...
├── src/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── CLAUDE.md
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```bash
git clone https://github.com/EinsLayupan19/ai-powered-helpdesk.git
cd ai-powered-helpdesk
npm install
```

### Run the Development Server

```bash
npm run dev
```

Vite will provide a local development URL in the terminal.

### Build for Production

```bash
npm run build
```

Preview the production build with:

```bash
npm run preview
```

## Knowledge Base

EagleDesk uses a maintained knowledge base for school-related information, including:

- Student procedures
- School offices and locations
- Enrollment and clearance guidance
- Student ID procedures
- Grade-related guidance
- Academic calendars
- Class schedules
- Official announcement sources

The system should **not invent school policies, dates, fees, office locations, or procedures**. When information may have changed, users should be directed to the appropriate official school source or faculty member.

See `docs/KNOWLEDGE_BASE.md`.

## Academic Calendar Handling

EagleDesk may contain both current and historical academic calendars.

Historical calendars are kept for reference and should not be presented as the current academic calendar. Current-date questions should use the latest approved calendar available to the system.

## Development

This project is currently under active development.

Development documentation is maintained in the `docs/` directory, while project instructions and development guidelines are documented in `CLAUDE.md`.

## Roadmap

- [x] Initial web interface
- [x] School knowledge base
- [x] Academic calendar support
- [x] Class schedule information
- [ ] AI question-answering integration
- [ ] Backend API
- [ ] Database integration
- [ ] Authentication
- [ ] Improved knowledge retrieval
- [ ] Testing and evaluation
- [ ] Deployment

## Purpose

EagleDesk aims to make school-related information easier to find by giving students a single, simple place to ask questions instead of searching through multiple sources.

## Disclaimer

EagleDesk is an academic project and is not an official New Era University system. Information provided by the system should be verified through official university channels when necessary.

## Author

**Zirk Eins B. Layupan**

BS Information Technology  
New Era University

---

*EagleDesk — making school information easier to find.*
