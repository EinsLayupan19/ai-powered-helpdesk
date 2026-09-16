# Project Context

## Project

**AI-Powered School Help Desk and Student Support System**

The goal is to create a centralized student support platform where students can ask school-related questions and receive answers based on verified school knowledge.

When verified information is unavailable or human intervention is needed, the system escalates the issue through a support ticket.

## Problem

Students may need to search through:
- Student handbooks
- Registrar documents
- Finance policies
- Library rules
- IT guides
- Academic calendars
- Announcements
- FAQs
- Office procedures

The system provides one support interface for these questions.

## Primary Flow

Student
→ Authenticate
→ Ask question
→ Classify intent
→ Determine whether school knowledge is required
→ Retrieve verified knowledge
→ Check retrieval quality
→ Generate grounded answer
→ Show sources
→ Collect feedback
→ Escalate to human support when needed

## AI Boundary

This is NOT an unrestricted chatbot.

For school-specific questions:

**Verified Knowledge Base → Retrieval → Grounded Answer**

The AI must never fabricate:
- Policies
- Fees
- Deadlines
- Requirements
- Office hours
- Room numbers
- Staff information
- Contact information
- Academic rules
- Enrollment procedures
- Events
- Schedules
- Student records

If information is insufficient:

> I don't have enough verified information to answer that accurately.

Then provide a support-ticket path.

## Initial Categories

Categories are database-driven and configurable by admins.

Initial categories:
- Academic
- Enrollment
- Registrar
- Finance
- Library
- IT Support
- Student Affairs
- Campus Facilities
- Events
- Faculty/Department
- Scholarships
- General Information
- Other

Do not hardcode these throughout the application.

## AI Classification

The system may classify:
- Category
- Intent
- School-specific
- Retrieval required
- Suggested department
- Suggested priority
- Human support required

AI output is advisory. Backend business rules validate it.

## Main Features

### Student
- Authentication
- Chat
- Conversation history
- Source references
- Feedback
- Ticket creation
- Ticket viewing/replies
- Profile management

### Staff
- View permitted tickets
- Reply
- Update status
- Change priority
- Internal notes
- Handle department tickets

### Admin
- Ticket management
- Knowledge document upload
- Publish/archive documents
- FAQ management
- Category management
- Analytics
- Staff assignments

### Super Admin
- User management
- Role management
- Department management
- Administrator management
- System settings
- Audit logs

## Ticket Escalation

Escalation may occur when:
- Knowledge is missing
- Retrieval confidence is insufficient
- Personal records are required
- Staff approval is needed
- Technical troubleshooting fails
- Student requests human assistance
- Sensitive administrative issues occur
- AI cannot safely answer

## Ticket Statuses

- Open
- In Progress
- Waiting for Student
- Resolved
- Closed

## Ticket Priorities

- Low
- Medium
- High
- Urgent

## Technology Direction

- React + TypeScript + Tailwind for frontend
- Node.js + TypeScript backend
- Supabase PostgreSQL
- Supabase Auth
- PostgreSQL + pgvector
- Gemini API through an AI service abstraction
- REST API
- Zod validation

## MVP Principle

Build the reliable help desk first.

Do not allow optional/stretch features to delay the core:
authentication → chat → retrieval → grounded answer → sources → feedback → tickets → staff/admin handling → security/testing.
