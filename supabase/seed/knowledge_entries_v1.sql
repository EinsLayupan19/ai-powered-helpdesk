-- EagleDesk knowledge seed v1. Run manually in the SQL editor after the knowledge_entries migration.
-- Every row is a DRAFT: drafts are invisible to signed-in users and are never used as AI context.
-- Content is copied verbatim from docs/KNOWLEDGE_BASE.md (owner-provided). Unresolved points are
-- recorded in source_note. Only the project owner may change a row to 'verified', after review.
-- Re-running is safe: existing slugs are left untouched.

begin;

insert into public.knowledge_entries
  (slug, title, category, content, keywords, applies_to, source_url, source_note, verification_status, last_verified_at)
values
  (
    'student-id-first-time',
    'Student ID',
    'Student ID',
    'Fill out the Google Form sent to your school email for the student ID request. After submitting the form, wait approximately 1–3 weeks. Once the ID is ready, claim it at the CICS Office.',
    array['student id', 'school id', 'id card', 'get id', 'new id', 'request id', 'claim id', 'id form'],
    null,
    null,
    'Provided by the project owner: docs/KNOWLEDGE_BASE.md section 2. UNRESOLVED before verification: (1) whether this applies only to CICS students (claim at the CICS Office); (2) whether the Google Form is the same as the official "Application of ID" forms (KNOWLEDGE_BASE.md 16.3); (3) whether the 1–3 week processing time is current; (4) verification date and source URL not confirmed.',
    'draft',
    null
  ),
  (
    'student-id-replacement',
    'Lost Student ID',
    'Student ID',
    'First, secure an Affidavit of Loss. Present the Affidavit of Loss to the Office of Student Development (OSD). After that, proceed to the Campus Services Department (CSD) to request a replacement student ID.',
    array['student id', 'school id', 'id card', 'lost', 'lose', 'losing', 'lost id', 'replacement', 'replace', 'replacement id', 'affidavit of loss'],
    null,
    null,
    'Provided by the project owner: docs/KNOWLEDGE_BASE.md section 10. UNRESOLVED before verification: (1) "Campus Services Department (CSD)" conflicts with "Computer Services Department (CSD)" in KNOWLEDGE_BASE.md 16.4 and the app Contact page; (2) "Office of Student Development (OSD)" does not appear in the official Student Services list (KNOWLEDGE_BASE.md 16.6), which names an Office of Student Discipline and OSAS; (3) verification date and source URL not confirmed. Keywords deliberately exclude damaged/stolen IDs, which the source does not cover.',
    'draft',
    null
  )
on conflict (slug) do nothing;

commit;
