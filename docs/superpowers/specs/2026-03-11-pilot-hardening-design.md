# Pilot Hardening Design

Status: Approved
Date: 2026-03-11
Phase: 7 (Pilot Readiness)

## Goal

Make the school integration beta deployable to 5-10 co-design teachers by adding in-app onboarding guidance, a public compliance page, Firestore rules validation, and sensitive access logging.

## Decisions

- In-app walkthrough style: state-driven contextual hints (not a wizard or dismissable tour)
- Hints derive from existing data — no new persistence or API calls
- Compliance page: dedicated static route in the app, public (no auth)
- Firestore rules: emulator validation of existing rules, no rule changes
- Disclosure logging: first access per student per day to avoid noise

## 1. State-driven contextual hints

### Component

Reusable `<OnboardingHint>` component accepting:

- `show: boolean` — computed by the parent page from existing data
- `message: string` — what the teacher should do next
- `ctaLabel: string` — button text
- `ctaTo: string` — React Router link target

Renders a styled banner with message and CTA button. Renders nothing when `show` is false.

File location: `frontend/src/components/ui/OnboardingHint.tsx`

### Hint placements and trigger logic

| Page | Trigger condition | Message | CTA |
|------|------------------|---------|-----|
| Teacher Dashboard | 0 classes | "Create your first class to get started" | "Create Class" → class creation flow |
| Teacher Dashboard | classes exist, 0 total students | "Invite students using a join code" | "Go to Class" → first class detail |
| Teacher Dashboard | students exist, 0 assignments across all classes | "Create your first assignment" | "Go to Class" → first class detail |
| Class detail page | 0 enrollments | "Share the join code with your students" | "Manage Join Code" → join code section |
| Class detail page | 0 curriculum mappings | "Map your curriculum to create assignments" | "Map Curriculum" → curriculum mapping flow |
| Class detail page | mappings exist, 0 assignments | "Publish your first assignment" | "Create Assignment" → assignment builder |
| Class compliance page | students with missing consent | "Review consent status before enabling voice" | scrolls to roster or no CTA |

### Trigger logic detail

Each page computes `show` from data it already fetches:

- **Dashboard**: `TeacherDashboardPage` already loads classes list and summary stats. Trigger conditions: `classes.length === 0`, `totalStudents === 0`, `totalAssignments === 0`. Only the first matching hint shows (priority order: no classes > no students > no assignments).
- **Class detail**: Already loads enrollments, mappings, assignments for the class. Same priority ordering.
- **Compliance page**: Already loads compliance roster. Trigger: `roster.some(s => !s.voice_allowed)`.

### Visibility rules

- Hints and the existing dashboard setup checklist can both be visible simultaneously — they serve different purposes (overview vs. contextual action guidance).
- Hints are never dismissed manually — they disappear automatically when the condition is resolved.
- Only one hint shows per page section (highest priority unresolved condition wins).

## 2. Compliance static page

### Route

`/compliance` — public, no auth required. This is a new top-level route outside the `/app` authenticated shell, similar to a marketing or informational page. Added to `App.tsx` router as an unauthenticated route.

File location: `frontend/src/pages/CompliancePage.tsx`

### Content sections

1. **What data we collect** — student text/voice transcripts, session metadata, learning events, consent records
2. **How consent works** — guardian consent packets, voice gating, text fallback behavior
3. **Who can access what** — role-based access scoping (teacher: own classes, admin: org-wide, student: own data)
4. **Data retention defaults** — raw audio 30 days, transcripts 365 days, aggregated analytics term + 1 year
5. **Deletion process** — admin-initiated, approval-gated, auditable execution with retry, 7-day SLA target
6. **Compliance posture** — designed with COPPA/FERPA/BIPA awareness; counsel review pending before production

### Content sourcing

| Page section | TECH_SPEC source |
|-------------|-----------------|
| What data we collect | Section 4.1 (practice_sessions, learning_events schemas) |
| How consent works | Section 5.4 (compliance design rules) |
| Who can access what | Section 5.1 (auth and request context) |
| Data retention defaults | Section 5.4 (recommended beta defaults) |
| Deletion process | Section 4.1 (deletion_requests, deletion_execution_runs) |
| Compliance posture | Section 10 (compliance references) |

Language stays honest: "designed with awareness of" not "certified compliant with" since counsel review is a TASKS.md open item.

### Implementation

Single React page component with static content styled using existing Tailwind classes. No API calls, no dynamic data.

## 3. Firestore rules emulator validation

### Goal

Verify that the shipped `firestore.rules` enforce the intended access patterns. On completion, update LIMITATIONS.md item #10 to reflect validated state.

### Tooling

- `@firebase/rules-unit-testing` package
- Firebase Emulator Suite (local only — not CI for beta)
- Test file: `firebase-tests/firestore-rules.test.ts`
- Run via: `cd firebase-tests && npm test` (emulator started automatically by the test harness)

### Test matrix

| Collection | Allow cases | Deny cases |
|------------|------------|------------|
| `users/{uid}` | Owner reads/writes own doc and subcollections | Other user cannot read/write |
| `organizations/{orgId}` | Active org member reads | Non-member cannot read; nobody can write |
| `memberships/{id}` | Owner reads own; school_admin reads org members | Non-owner non-admin cannot read; nobody can write |
| `classes/{classId}` | Teacher in `teacher_membership_ids` reads; enrolled student reads | Outsider cannot read; nobody can write |
| `enrollments/{id}` | Student reads own; class teacher reads | Outsider cannot read; nobody can write |
| `curriculum_mappings/{id}` | Class teacher reads | Non-teacher cannot read; nobody can write |
| `assignments/{id}` | Class teacher reads; enrolled student reads | Outsider cannot read; nobody can write |
| `student_compliance_records/{id}` | Student reads own; teacher/admin in org reads | Outsider cannot read; nobody can write |
| `consent_events/{id}` | school_admin in org reads | Teacher cannot read; outsider cannot read; nobody can write |
| `deletion_requests/{id}` | school_admin in org reads | Teacher cannot read; nobody can write |
| `deletion_execution_runs/{id}` | school_admin in org reads | Teacher cannot read; nobody can write |
| Catch-all `/{document=**}` | — | Any uncovered path is denied for read and write |

## 4. Sensitive access disclosure logging

### Goal

Close the in-progress TASKS.md item: "Log sensitive access and disclosure events required by policy."

### Current state

Major write-side actions already emit `consent_events` rows (audit export, guardian packets, deletion lifecycle). The gap is read-side disclosure logging.

### New disclosure events

| Event type | Trigger | Logged by |
|------------|---------|-----------|
| `disclosure.compliance_viewed` | Teacher/admin GETs a student's compliance record | Backend route handler |
| `disclosure.practice_data_viewed` | Teacher/admin GETs student practice session data | Backend route handler |

### Deduplication

First access per `(actor_uid, student_uid, event_type)` per calendar day. This keeps the audit trail meaningful without flooding it on page refreshes.

Deduplication runs in a shared service function (`backend/services/disclosure_logging.py`):

```python
def log_disclosure_if_new(org_id, actor_uid, student_uid, event_type, payload):
    today = datetime.utcnow().strftime('%Y-%m-%d')
    existing = db.collection('consent_events') \
        .where('actor_id', '==', actor_uid) \
        .where('student_uid', '==', student_uid) \
        .where('event_type', '==', event_type) \
        .where('created_at', '>=', start_of_day) \
        .where('created_at', '<', start_of_next_day) \
        .limit(1).get()
    if not existing:
        # write consent_event
```

Requires composite Firestore index on `consent_events`: `(actor_id, student_uid, event_type, created_at)`.

### Routes that emit disclosure events

- `GET /api/teacher/classes/<class_id>/students/<student_uid>/compliance` → `disclosure.compliance_viewed`
- `GET /api/teacher/classes/<class_id>/students/<student_uid>` (student drill-down) → `disclosure.practice_data_viewed`
- `GET /api/admin/compliance/roster` (when iterating individual student records) → `disclosure.compliance_viewed`

### Event shape

Follows existing `consent_events` schema:

```
org_id: string
student_uid: string
scope_type: 'student'
scope_id: student_uid
event_type: 'disclosure.compliance_viewed' | 'disclosure.practice_data_viewed'
actor_type: 'teacher' | 'school_admin'
actor_id: uid
evidence_ref: null
payload: { endpoint, class_id }
created_at: timestamp
```

## Out of scope

- Teacher recruitment and outreach (business task, not code)
- Pilot feedback loop and triage process (process design, deferred)
- Beta support process definition (process design, deferred)
- Firestore rule changes (validation only)
- New compliance features beyond disclosure logging
