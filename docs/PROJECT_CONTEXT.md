# Project Context

## Project

**AI-Powered School Help Desk and Student Support System**

The system gives students one simple place to ask school IT and support concerns. The AI identifies the concern, finds relevant verified knowledge, and provides troubleshooting steps. If the available information is not enough, the system directs the student to verified IT/school support.

The current scope intentionally avoids a complex ticketing workflow.

## Main Problem

Students may not know how to troubleshoot common school technology problems such as:
- Wi-Fi/network connection
- Computer or hardware problems
- Software problems
- Printer problems
- Account/login problems
- File/storage problems

The system reduces the need to search through separate guides or immediately ask IT staff for common issues.

## Primary Flow

Student
→ Login
→ Describe the problem
→ AI classifies the problem
→ Search verified knowledge
→ Generate troubleshooting steps
→ Student tries the steps
→ Solved OR request human help
→ Verified IT support information is shown when needed

## AI Boundary

This is a focused helpdesk assistant, not an unrestricted chatbot.

For school-specific information, the answer must be based on verified knowledge stored in the system.

The AI must never invent:
- School policies
- IT procedures
- Account requirements
- Office hours
- Contact information
- Room numbers
- Staff information
- Fees or deadlines
- Student records

If the system does not have enough verified information:

> I don't have enough verified information to answer that accurately.

Then show an appropriate verified support contact when available.

## Initial Categories

Categories are database-driven.

Initial categories:
- Network
- Hardware
- Software
- Printer
- Account / Login
- Storage / Files
- General IT
- Other

Do not hardcode these throughout the application.

## AI Classification

The AI may return:
- category
- short problem summary
- suggested troubleshooting approach
- human support required

AI output is advisory. Backend rules decide what information can actually be shown.

## Main Features

### Student
- Login
- AI Help Desk
- Conversation history
- Troubleshooting steps
- Feedback
- Verified IT support directory

### IT Staff
- View escalated help requests
- Respond to requests that require human help
- Manage assigned troubleshooting knowledge when enabled

### Admin
- Add/edit/delete verified knowledge
- Manage categories
- Manage support contacts
- Manage users/roles as needed
- View basic usage/feedback information

## Support / Human Assistance

There is no ticketing system in the current MVP.

When the AI cannot safely solve the problem, the student can choose to request human assistance. The system records the help request as a simple support request and makes it available to authorized IT staff.

The MVP should not implement ticket queues, ticket statuses, ticket comments, SLAs, or complex assignment workflows.

## Technology Stack

Keep the implementation beginner-friendly:

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express.js
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **AI:** Gemini API through the backend
- **Deployment:** Vercel for frontend, Railway/Render for backend

For knowledge retrieval, use a simple database search/filter approach first. Vector databases, pgvector, embeddings, and full RAG infrastructure are optional future improvements, not MVP requirements.

## MVP Principle

Build the smallest reliable helpdesk first:

**Login → Ask → Classify → Search verified knowledge → Troubleshooting steps → Feedback / Human help**

Do not add complex architecture or ticketing unless the project scope is explicitly changed.
