# Project Context

## Project

**AI-Powered School Help Desk and Student Support System**

The goal is to create a centralized student support platform where students can ask school-related questions and receive answers based on verified school knowledge.

When verified information is unavailable or human assistance is needed, the system directs the student to the appropriate verified school office or support contact. The system does **not** use a ticketing workflow in the current scope.

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
- Verified school office/support contact information

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
→ Direct to verified school support/contact when needed

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

Then provide an appropriate verified school office/support contact when available. If no verified contact is available, clearly state that the system does not have enough verified information.

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
- Human support required

AI output is advisory. Backend business rules validate it.

## Main Features

### Student
- Authentication
- AI Helpdesk chat
- Conversation history
- Source references
- Feedback
- School office/support directory
- Profile management

### Staff
- Manage verified knowledge assigned to their area when the implementation supports staff content management
- Review/manage appropriate school information according to role

### Admin
- Knowledge document upload
- Publish/archive documents
- FAQ management
- Category management
- School office/support contact management
- Analytics

### Super Admin
- User management
- Role management
- Department management
- Administrator management
- System settings
- Audit logs

## Support / Human Assistance

The current system does not create or manage support tickets.

When the AI cannot safely answer, the student should be guided toward verified human support through the school office/support directory.

Human-support guidance may occur when:
- Knowledge is missing
- Retrieval confidence is insufficient
- Personal records are required
- Staff approval is needed
- Technical troubleshooting requires a human
- Student requests human assistance
- Sensitive administrative issues occur
- AI cannot safely answer

The system must not invent contact information. Only verified contacts in the knowledge base/support directory may be displayed.

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

Core:
authentication → chat → retrieval → grounded answer → sources → feedback → verified support directory → admin knowledge management → security/testing.

Do not add ticketing workflows unless the project scope is explicitly changed again.
