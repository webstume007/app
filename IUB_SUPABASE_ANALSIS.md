# IUB Assistant - Supabase & Application Architecture Analysis

## 1. Executive Summary
The **IUB Assistant** is a Next.js-based Progressive Web App (PWA) designed to provide students with real-time academic schedules, attendance tracking, transport routes, and AI-driven tutoring. The application uses **Supabase** as its backend-as-a-service, utilizing its Postgres database, Authentication, Realtime subscriptions, and Edge computing features.

## 2. Database Normalization & Schema Design
The Supabase Postgres schema exhibits a pragmatic approach to data modeling, balancing normalization with read-heavy performance requirements.

### Core Entities
- **Users & Profiles:** Leverages Supabase Auth (`auth.users`), supplemented by public profile tables like `cr_profiles` (Class Representatives), `teacher_profiles`, and `students`. 
- **Scheduling System:** Centered around `base_schedule`, with dynamic overrides managed through `schedule_exceptions`. 
- **Attendance System:** A fully normalized structure utilizing `attendance_sessions` (1-to-N) `attendance_records`.
- **Ancillary Data:** `point_schedules` (Transport), `class_announcements`, and `notifications`.

### Normalization Insights
- **Pros:** 
  - Clear separation of concerns between core schedule templates (`base_schedule`) and dynamic alterations (`schedule_exceptions`).
  - `attendance_records` correctly maps a `session_id` to a `student_id` (via registration number), avoiding monolithic JSON arrays for attendance.
- **Cons / Denormalization:** 
  - **Semester-Specific Tables:** The existence of tables like `base_schedule_archive_Spring_2026` indicates a horizontal sharding/archiving strategy per semester rather than relying on a strictly normalized `semester_id` filtering approach. While this keeps active tables small, it introduces schema maintenance overhead every semester.
  - **Text-based Foreign Relations:** Fields like `session` and `section` are duplicated as raw text across multiple tables (`students`, `contacts`, `cr_profiles`) instead of utilizing a unified `cohorts` or `classes` foreign key table. This can lead to data anomalies if a section name changes.

## 3. Security & Row Level Security (RLS)
The application heavily relies on Supabase Row Level Security (RLS) policies to govern data access.

- **Public Read Access:** Almost all tables (`base_schedule`, `schedule_exceptions`, `notifications`, `cr_profiles`, `teacher_profiles`) have `PERMISSIVE` policies allowing `SELECT` operations for the `public` role. This is by design, as the app serves read-heavy public data to students (even guests).
- **Authenticated Write Access:** 
  - `INSERT`, `UPDATE`, and `DELETE` operations on `schedule_exceptions`, `notifications`, and base schedules are restricted to `authenticated` users (Class Representatives and Teachers).
  - Profile modification is strictly scoped to the owner: e.g., `teacher_profiles` UPDATE is constrained by `(auth.uid() = id)`.
- **Potential Vulnerabilities:** 
  - While public reads are intended, excessive exposure of user data in `cr_profiles`, `teacher_profiles`, and `students` (which contains CNIC and phone numbers) to the `public` role could lead to data scraping or privacy issues. Consider scoping these policies to `authenticated` users only, or hiding PII columns from public views.

## 4. Supabase Functions & Database Triggers
The backend offloads complex state management to Postgres routines:

- **`auto_archive_completed_datesheet` (void):** Likely runs on a cron job (`pg_cron`) or trigger to move past exam or schedule data into archive tables to keep active queries fast.
- **`rollover_to_new_semester` (void):** Automates the transition between semesters, potentially creating the new archive tables (e.g., `Spring_2026`) and resetting the base schedule state.
- **`handle_new_user` & `handle_new_cr` (triggers):** Automatically fires on `auth.users` insertion to populate the respective public profile tables (`cr_profiles`), ensuring referential integrity between the Auth service and public schema.

## 5. Application Workflow & Architecture (IUB Assistant)
The frontend (`c:\Users\huzai\Documents\GitHub\app`) is a modern Next.js application tailored for offline capability and real-time synchronization.

### Realtime Synchronization
The app leverages Supabase Realtime (`supabase.channel('student-dashboard-updates')`) in `index.js`. It subscribes to Postgres changes on `notifications`, `class_announcements`, and `schedule_exceptions`. This enables instant push notifications and UI updates when a CR cancels a class or posts an assignment, without requiring a page refresh.

### Offline-First & Caching Strategy
- **Local Storage Cache:** The app aggressively caches data (`base_schedule`, `exceptions`, `notifications`) into `localStorage` with a 6-hour TTL (`CACHE_WINDOW_MS = 21600000`).
- **Network Resilience:** If the device goes offline, it falls back to the cached `iub_offline_data`, ensuring students can always check their timetable even without internet.
- **Service Workers:** PWA service workers (`/sw.js`) handle background notifications and installability.

### AI Tutor Integration (`ai_bot.js`)
The AI module is highly sophisticated:
- **Dynamic Context Injection:** It builds a massive system prompt by compiling the user's specific schedule, current exceptions, course outlines, and transport timings directly from the Supabase cache.
- **Smart Routing (Auto-Model):** It intercepts user prompts and dynamically routes them. Simple queries go to faster models (Groq: `llama-3.1-8b-instant`), while complex queries (involving tables or deep analysis) are routed to `gemini-2.5-flash`.
- **Identity Awareness:** The AI is contextually aware of the student's name, semester, and section, providing highly personalized academic assistance.

## 6. Recommendations
1. **Schema Consolidation:** Migrate away from semester-suffixed tables (`base_schedule_archive_Spring_2026`) towards a unified table utilizing table partitioning by `semester_id`.
2. **Data Privacy (RLS):** Revise the `public` RLS policy on `teacher_profiles` and `cr_profiles` to prevent unauthorized scraping of emails, phone numbers, and CNICs. Ensure `public` can only select non-sensitive columns.
3. **Foreign Keys:** Normalize the `session` and `section` string columns into a dedicated `cohorts` table to enforce referential integrity.
