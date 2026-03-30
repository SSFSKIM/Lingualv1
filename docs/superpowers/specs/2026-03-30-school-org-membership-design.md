# School Organization Creation & Membership Design

**Date:** 2026-03-30
**Status:** Approved
**Owner:** Engineering

## Problem

Lingual's current school onboarding is a single self-service endpoint where any teacher can create an organization, becoming both teacher and school_admin in one step. This doesn't match how real schools work:

- There's no vetting of schools before they're created
- There's no way for a school admin to invite teachers to an existing org
- Teachers can't join an existing school — they can only create new ones
- The Lingual team has no control over which schools are onboarded

## Solution

Replace self-service school creation with a gated request-and-approval flow:

1. **School admin submits a join request** → Lingual team reviews and approves → org is created
2. **School admin generates teacher invite codes** → teachers enter the code → admin approves each teacher
3. **Teachers create classes** by connecting Canvas courses (existing functionality)
4. **Students join classes** via class join codes (existing functionality)

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Approval model | Lingual team approves school requests | Gated onboarding ensures quality control |
| Approval panel | Internal page at `/app/admin/school-requests` behind `lingual_admin` role | Reuses existing app infrastructure, no separate admin app |
| Teacher invite model | Multi-use code + admin approval | Comfort of a simple code entry, control of per-teacher approval |
| Canvas → class | Auto-creates class from Canvas course name | Single step, already built |
| Self-service creation | Removed entirely | Clean gate; E2E test harness bypasses UI via `/api/test/seed` |
| Request data storage | Separate `school_requests` collection | Keeps org model clean — orgs only exist once approved |
| Lingual admin check | `lingual_admin: true` field on user document | Simple, no new collection needed |

## Data Model

### New collection: `school_requests`

```
school_requests/{requestId}
  school_name: string (required)
  org_type: "school" | "district" | "language_institute" (required)
  website_url: string (optional)
  canvas_instance_url: string (optional)
  requester_uid: string
  requester_email: string
  requester_name: string
  status: "pending" | "approved" | "rejected"
  reviewed_by_uid: string | null
  reviewed_at: timestamp | null
  rejection_reason: string | null
  created_org_id: string | null (populated on approval)
  created_at: timestamp
```

### New fields on `organizations`

```
teacher_invite_code: string | null (6-char, same safe alphabet as class join codes)
teacher_invite_code_active: boolean
teacher_invite_code_generated_at: timestamp | null
```

### New collection: `teacher_invitations`

Tracks teachers who entered the invite code and are awaiting school admin approval.

```
teacher_invitations/{invitationId}
  org_id: string
  uid: string
  email: string
  name: string
  status: "pending" | "approved" | "rejected"
  reviewed_by_uid: string | null
  reviewed_at: timestamp | null
  created_at: timestamp
```

On approval, a `membership` is created with `roles: ["teacher"]` and `status: "active"`.

### New field on `users`

```
lingual_admin: boolean (default false)
```

Checked by the `LingualAdminRoute` frontend guard and backend middleware. Set directly in Firestore — no UI to grant this role.

## API Surface

### School Requests (any authenticated user)

| Method | Endpoint | What |
|---|---|---|
| `POST` | `/api/school-requests` | Submit a school join request. Body: `{ schoolName, orgType, websiteUrl?, canvasInstanceUrl? }`. Rejects if user already has a pending or approved request. |
| `GET` | `/api/school-requests/mine` | Check status of the current user's request. Returns the most recent request, or `null` if none. |

### Lingual Admin (`lingual_admin` only)

| Method | Endpoint | What |
|---|---|---|
| `GET` | `/api/admin/school-requests` | List all requests. Query param: `?status=pending\|approved\|rejected` |
| `GET` | `/api/admin/school-requests/:id` | Get request detail |
| `POST` | `/api/admin/school-requests/:id/approve` | Approve: creates org + school_admin membership for requester. Sets `created_org_id` on the request. |
| `POST` | `/api/admin/school-requests/:id/reject` | Reject with optional `{ reason }` body |

### Teacher Invite Codes (`school_admin` only)

| Method | Endpoint | What |
|---|---|---|
| `POST` | `/api/schools/teacher-invite-code` | Generate or regenerate teacher invite code for the active org |
| `GET` | `/api/schools/teacher-invite-code` | Get current code status (code, active, generatedAt) |
| `DELETE` | `/api/schools/teacher-invite-code` | Deactivate the invite code |
| `GET` | `/api/schools/teacher-invitations` | List teacher invitations for the active org (filterable by status) |
| `POST` | `/api/schools/teacher-invitations/:id/approve` | Approve: creates membership with `roles: ["teacher"]` |
| `POST` | `/api/schools/teacher-invitations/:id/reject` | Reject the invitation |

### Teacher Join (any authenticated user)

| Method | Endpoint | What |
|---|---|---|
| `POST` | `/api/schools/join-as-teacher` | Enter teacher invite code. Body: `{ inviteCode }`. Creates a `teacher_invitations` record with `status: "pending"`. Rejects if user is already a member of the org or already has a pending invitation. |

## UI Pages

### New Pages

| Route | Component | Who | Purpose |
|---|---|---|---|
| `/app/request-school` | `SchoolRequestPage` | Any logged-in user | Submit school join request form. Shows confirmation or status of existing request. Replaces `SchoolOnboardingPage`. |
| `/app/teacher/join` | `TeacherJoinSchoolPage` | Any logged-in user | Enter 6-char teacher invite code. Shows "Pending admin approval" on success. |
| `/app/admin/school-requests` | `LingualSchoolRequestsPage` | `lingual_admin` | List pending/approved/rejected requests with approve/reject actions. |

### Modified Pages

| Page | Change |
|---|---|
| `SchoolOnboardingPage` | Replaced by `SchoolRequestPage` |
| `TeacherDashboardPage` | School admin sees teacher invitation management: pending count badge, invite code display, approve/reject teacher list. Accessible from "Workspace settings" or a new "Team" tab. |
| `App.tsx` | New routes. New `LingualAdminRoute` guard component. |

### Route Guards

| Guard | Logic |
|---|---|
| `TeacherRoute` (existing) | Membership with `teacher` or `school_admin` role |
| `LingualAdminRoute` (new) | User document has `lingual_admin: true` |

## User Flows

### Flow 1: School Admin Requests a School

```
Admin signs up on Lingual
  → Navigates to /app/request-school
  → Fills form: school name, org type, website URL (optional), Canvas URL (optional)
  → Submits → sees "Request submitted, we'll review shortly"
  → (Later) Lingual admin approves at /app/admin/school-requests
  → Admin refreshes → request status shows "Approved"
  → Clicks "Go to dashboard" → /app/teacher (now has school_admin membership)
```

### Flow 2: School Admin Invites Teachers

```
School admin at /app/teacher
  → Opens workspace settings → "Team" section
  → Clicks "Generate teacher invite code" → gets 6-char code (e.g., TEACH-XK9M display, stored as XK9M42)
  → Shares code with teachers (email, Slack, in-person)
```

### Flow 3: Teacher Joins School

```
Teacher signs up on Lingual
  → Navigates to /app/teacher/join
  → Enters 6-char invite code
  → Sees "Your request has been sent to the school admin"
  → (School admin sees pending invitation in dashboard → approves)
  → Teacher refreshes → now has teacher membership → /app/teacher
  → Connects Canvas course → class auto-created → assigns practice
```

### Flow 4: Student Joins Class (unchanged)

```
Student signs up → /app/join → enters class join code → enrolled
```

## Implementation Order

### Piece 1: School Join Requests + Lingual Admin Panel

**New files:**
- `backend/routes/school_requests.py` — submit, check status, admin list/approve/reject
- `frontend/src/pages/SchoolRequestPage.tsx` — request form + status view
- `frontend/src/pages/LingualSchoolRequestsPage.tsx` — admin review panel
- `frontend/src/components/layout/LingualAdminRoute.tsx` — route guard

**Modified files:**
- `database.py` — CRUD for `school_requests` collection
- `main.py` — register blueprint
- `App.tsx` — new routes
- `SchoolOnboardingPage.tsx` — replaced by `SchoolRequestPage`

**Shippable when:** Admin can submit request, Lingual admin can approve, org + membership are created.

### Piece 2: Teacher Invite Codes

**New files:**
- `frontend/src/pages/TeacherJoinSchoolPage.tsx` — enter invite code page

**Modified files:**
- `database.py` — teacher invite code CRUD on org, `teacher_invitations` collection CRUD
- `backend/routes/schools.py` — invite code generate/get/deactivate endpoints, join-as-teacher endpoint
- `App.tsx` — new route

**Shippable when:** Admin can generate code, teacher can enter it, invitation is created as pending.

### Piece 3: Teacher Invitation Approval

**Modified files:**
- `backend/routes/schools.py` — list/approve/reject teacher invitations
- `TeacherDashboardPage.tsx` or workspace settings — teacher invitation management UI
- `frontend/src/api/schools.ts` — new API functions

**Shippable when:** School admin can see pending teachers, approve/reject them, approved teachers get membership.

### Piece 4: Remove Self-Service School Creation

**Modified files:**
- `backend/routes/schools.py` — remove or gate `POST /api/schools` endpoint
- `frontend/src/pages/SchoolOnboardingPage.tsx` — delete or redirect to `/app/request-school`
- Navigation components — update any links to old onboarding flow

**Shippable when:** No path to self-create a school exists outside the request flow and test harness.

### Piece 5: Integration Testing

**New files:**
- `e2e/test-school-onboarding.sh` — full chain E2E test
- `backend/tests/test_school_requests.py` — unit tests for request + approval endpoints

**Shippable when:** Full flow verified: request → approve → invite code → teacher joins → admin approves teacher → teacher connects Canvas.
