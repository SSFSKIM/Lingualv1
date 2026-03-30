# School Organization Creation & Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace self-service school creation with a gated request-and-approval flow where Lingual approves schools and school admins approve teachers.

**Architecture:** New `school_requests` collection for the request queue, `teacher_invitations` collection for teacher join requests. A `lingual_admin` flag on user docs enables an internal admin panel. Teacher invite codes reuse the same pattern as class join codes (6-char safe alphabet on the org doc). All new endpoints live in a `school_requests` blueprint (Lingual admin side) and additions to the existing `schools` blueprint (teacher invite side).

**Tech Stack:** Flask blueprints, Firestore, React 19, React Router v7, Tailwind CSS 4, Radix UI

**Spec:** `docs/superpowers/specs/2026-03-30-school-org-membership-design.md`

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `backend/routes/school_requests.py` | Blueprint: submit request, check status, admin list/detail/approve/reject |
| `backend/tests/test_school_requests.py` | Unit tests for school request + approval endpoints |
| `frontend/src/pages/SchoolRequestPage.tsx` | Request form + status view (replaces SchoolOnboardingPage) |
| `frontend/src/pages/TeacherJoinSchoolPage.tsx` | Enter teacher invite code page |
| `frontend/src/pages/LingualSchoolRequestsPage.tsx` | Lingual admin review panel |
| `frontend/src/components/layout/LingualAdminRoute.tsx` | Route guard for lingual_admin |
| `frontend/src/api/schoolRequests.ts` | API client for school request + teacher invitation endpoints |
| `e2e/test-school-onboarding.sh` | Full E2E: request → approve → invite → join → approve teacher |

### Modified Files

| File | Change |
|---|---|
| `database.py` | CRUD for `school_requests`, `teacher_invitations`, teacher invite code on org |
| `main.py` | Register `school_requests` blueprint |
| `backend/routes/schools.py` | Teacher invite code endpoints, join-as-teacher endpoint |
| `frontend/src/App.tsx` | New routes + lazy imports + `LingualAdminRoute` |
| `frontend/src/api/schools.ts` | New API functions for invite codes and teacher invitations |
| `frontend/src/types/school.ts` | New types for requests, invitations |
| `frontend/src/contexts/MembershipContext.tsx` | Expose `isLingualAdmin` from user doc |

---

## Piece 1: School Join Requests + Lingual Admin Panel

### Task 1: Database layer for school requests

**Files:**
- Modify: `database.py`

- [ ] **Step 1: Add collection helpers**

Add after the existing `get_canvas_course_content_collection()` (around line 349):

```python
def get_school_requests_collection():
    """Get school requests collection."""
    return get_db().collection('school_requests')


def get_school_request_ref(request_id):
    """Get school request document reference."""
    return get_school_requests_collection().document(request_id)
```

- [ ] **Step 2: Add CRUD functions**

Add after the new collection helpers:

```python
def create_school_request(requester_uid, requester_email, requester_name,
                          school_name, org_type, website_url='', canvas_instance_url=''):
    """Create a school join request."""
    doc_ref = get_school_requests_collection().document()
    doc_ref.set({
        'requester_uid': requester_uid,
        'requester_email': requester_email,
        'requester_name': requester_name,
        'school_name': school_name,
        'org_type': org_type,
        'website_url': website_url or '',
        'canvas_instance_url': canvas_instance_url or '',
        'status': 'pending',
        'reviewed_by_uid': None,
        'reviewed_at': None,
        'rejection_reason': None,
        'created_org_id': None,
        'created_at': firestore.SERVER_TIMESTAMP,
    })
    return doc_ref.id


def get_school_request(request_id):
    """Get a school request by ID."""
    doc = get_school_request_ref(request_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    data['id'] = doc.id
    return data


def get_user_school_request(uid):
    """Get the most recent school request for a user."""
    docs = (
        get_school_requests_collection()
        .where('requester_uid', '==', uid)
        .order_by('created_at', direction=firestore.Query.DESCENDING)
        .limit(1)
        .stream()
    )
    for doc in docs:
        data = doc.to_dict() or {}
        data['id'] = doc.id
        return data
    return None


def list_school_requests(status_filter=None):
    """List school requests, optionally filtered by status."""
    query = get_school_requests_collection()
    if status_filter:
        query = query.where('status', '==', status_filter)
    docs = query.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
    results = []
    for doc in docs:
        data = doc.to_dict() or {}
        data['id'] = doc.id
        results.append(data)
    return results


def update_school_request(request_id, updates):
    """Update fields on a school request."""
    updates['updated_at'] = firestore.SERVER_TIMESTAMP
    get_school_request_ref(request_id).update(updates)
```

- [ ] **Step 3: Add `get_user_field` helper for lingual_admin check**

```python
def get_user_field(uid, field):
    """Get a single field from a user document."""
    user = get_user(uid)
    if user:
        return user.get(field)
    return None
```

- [ ] **Step 4: Verify imports compile**

Run: `python3 -c "import database; print('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add database.py
git commit -m "feat: add school_requests Firestore CRUD"
```

---

### Task 2: School requests blueprint

**Files:**
- Create: `backend/routes/school_requests.py`
- Modify: `main.py`

- [ ] **Step 1: Create the blueprint**

```python
"""
School join request endpoints.

Public: submit request, check own request status.
Lingual admin: list, detail, approve, reject.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request, session

from backend.route_deps import RouteDeps


def create_school_requests_blueprint(deps: RouteDeps) -> Blueprint:
    bp = Blueprint('school_requests', __name__)

    def _require_lingual_admin():
        """Raise if the current user is not a Lingual admin."""
        uid = deps.get_current_user_uid()
        if not uid:
            raise PermissionError("Authentication required.")
        is_admin = deps.db.get_user_field(uid, 'lingual_admin')
        if not is_admin:
            raise PermissionError("Lingual admin access required.")
        return uid

    # -- Public: submit request -----------------------------------------------

    @bp.route('/api/school-requests', methods=['POST'])
    @deps.login_required
    def api_submit_school_request():
        try:
            uid = deps.get_current_user_uid()
            user = deps.db.get_user(uid)
            if not user:
                return jsonify({'success': False, 'error': 'User not found.'}), 404

            # Reject if user already has a pending or approved request
            existing = deps.db.get_user_school_request(uid)
            if existing and existing.get('status') in ('pending', 'approved'):
                return jsonify({
                    'success': False,
                    'error': f'You already have a {existing["status"]} request.',
                    'existingRequest': _serialize_request(existing),
                }), 409

            data = request.get_json() or {}
            school_name = (data.get('schoolName') or '').strip()
            org_type = (data.get('orgType') or '').strip()
            website_url = (data.get('websiteUrl') or '').strip()
            canvas_instance_url = (data.get('canvasInstanceUrl') or '').strip()

            if not school_name:
                return jsonify({'success': False, 'error': 'School name is required.'}), 400
            if org_type not in ('school', 'district', 'language_institute'):
                return jsonify({'success': False, 'error': 'Invalid organization type.'}), 400

            request_id = deps.db.create_school_request(
                requester_uid=uid,
                requester_email=user.get('email', ''),
                requester_name=user.get('name', ''),
                school_name=school_name,
                org_type=org_type,
                website_url=website_url,
                canvas_instance_url=canvas_instance_url,
            )

            return jsonify({
                'success': True,
                'requestId': request_id,
                'status': 'pending',
            }), 201

        except Exception as exc:
            return jsonify({'success': False, 'error': str(exc)}), 500

    # -- Public: check own request status -------------------------------------

    @bp.route('/api/school-requests/mine')
    @deps.login_required
    def api_my_school_request():
        uid = deps.get_current_user_uid()
        existing = deps.db.get_user_school_request(uid)
        return jsonify({
            'success': True,
            'request': _serialize_request(existing) if existing else None,
        })

    # -- Admin: list requests -------------------------------------------------

    @bp.route('/api/admin/school-requests')
    @deps.login_required
    def api_admin_list_requests():
        try:
            _require_lingual_admin()
        except PermissionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 403

        status_filter = request.args.get('status')
        requests_list = deps.db.list_school_requests(status_filter=status_filter)
        return jsonify({
            'success': True,
            'requests': [_serialize_request(r) for r in requests_list],
        })

    # -- Admin: get request detail --------------------------------------------

    @bp.route('/api/admin/school-requests/<request_id>')
    @deps.login_required
    def api_admin_get_request(request_id):
        try:
            _require_lingual_admin()
        except PermissionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 403

        req = deps.db.get_school_request(request_id)
        if not req:
            return jsonify({'success': False, 'error': 'Request not found.'}), 404

        return jsonify({'success': True, 'request': _serialize_request(req)})

    # -- Admin: approve -------------------------------------------------------

    @bp.route('/api/admin/school-requests/<request_id>/approve', methods=['POST'])
    @deps.login_required
    def api_admin_approve_request(request_id):
        try:
            admin_uid = _require_lingual_admin()
        except PermissionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 403

        req = deps.db.get_school_request(request_id)
        if not req:
            return jsonify({'success': False, 'error': 'Request not found.'}), 404
        if req.get('status') != 'pending':
            return jsonify({'success': False, 'error': f'Request is already {req["status"]}.'}), 409

        # Create org + school_admin membership for the requester
        org_id = deps.db.create_organization(
            name=req['school_name'],
            org_type=req.get('org_type', 'school'),
            pilot_stage='beta',
        )
        membership_id = deps.db.create_membership(
            org_id=org_id,
            uid=req['requester_uid'],
            roles=['school_admin'],
        )
        deps.db.set_user_last_active_membership(req['requester_uid'], membership_id)

        # Update request
        from google.cloud import firestore as gc_firestore
        deps.db.update_school_request(request_id, {
            'status': 'approved',
            'reviewed_by_uid': admin_uid,
            'reviewed_at': gc_firestore.SERVER_TIMESTAMP,
            'created_org_id': org_id,
        })

        return jsonify({
            'success': True,
            'orgId': org_id,
            'membershipId': membership_id,
        })

    # -- Admin: reject --------------------------------------------------------

    @bp.route('/api/admin/school-requests/<request_id>/reject', methods=['POST'])
    @deps.login_required
    def api_admin_reject_request(request_id):
        try:
            admin_uid = _require_lingual_admin()
        except PermissionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 403

        req = deps.db.get_school_request(request_id)
        if not req:
            return jsonify({'success': False, 'error': 'Request not found.'}), 404
        if req.get('status') != 'pending':
            return jsonify({'success': False, 'error': f'Request is already {req["status"]}.'}), 409

        data = request.get_json() or {}
        reason = (data.get('reason') or '').strip()

        from google.cloud import firestore as gc_firestore
        deps.db.update_school_request(request_id, {
            'status': 'rejected',
            'reviewed_by_uid': admin_uid,
            'reviewed_at': gc_firestore.SERVER_TIMESTAMP,
            'rejection_reason': reason or None,
        })

        return jsonify({'success': True})

    # -- Helpers --------------------------------------------------------------

    def _serialize_request(req):
        if not req:
            return None
        return {
            'id': req.get('id'),
            'schoolName': req.get('school_name', ''),
            'orgType': req.get('org_type', ''),
            'websiteUrl': req.get('website_url', ''),
            'canvasInstanceUrl': req.get('canvas_instance_url', ''),
            'requesterUid': req.get('requester_uid', ''),
            'requesterEmail': req.get('requester_email', ''),
            'requesterName': req.get('requester_name', ''),
            'status': req.get('status', 'pending'),
            'reviewedByUid': req.get('reviewed_by_uid'),
            'reviewedAt': str(req['reviewed_at']) if req.get('reviewed_at') else None,
            'rejectionReason': req.get('rejection_reason'),
            'createdOrgId': req.get('created_org_id'),
            'createdAt': str(req['created_at']) if req.get('created_at') else None,
        }

    return bp
```

- [ ] **Step 2: Register in main.py**

Add import near line 95:
```python
from backend.routes.school_requests import create_school_requests_blueprint
```

Add registration near line 535:
```python
app.register_blueprint(create_school_requests_blueprint(deps))
```

- [ ] **Step 3: Verify imports**

Run: `python3 -c "from backend.routes.school_requests import create_school_requests_blueprint; print('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/routes/school_requests.py main.py
git commit -m "feat: add school request submit + admin approve/reject endpoints"
```

---

### Task 3: Backend unit tests for school requests

**Files:**
- Create: `backend/tests/test_school_requests.py`

- [ ] **Step 1: Write tests**

Use the `conftest.py` FakeDbBase pattern. Subclass FakeDbBase to add `school_requests` store with the CRUD methods. Tests:

1. `test_submit_request` — POST creates a pending request
2. `test_submit_rejects_duplicate` — second request returns 409
3. `test_check_own_request` — GET returns the user's request
4. `test_check_own_request_none` — GET returns null when no request
5. `test_admin_list_requests` — lists pending requests
6. `test_admin_list_requests_filtered` — filters by status
7. `test_admin_approve_request` — creates org + membership, sets status
8. `test_admin_approve_rejects_non_pending` — 409 on already-approved
9. `test_admin_reject_request` — sets status + reason
10. `test_non_admin_blocked` — non-admin gets 403 on admin endpoints

- [ ] **Step 2: Run tests**

Run: `python3 -m unittest backend.tests.test_school_requests -v`
Expected: 10 tests pass

- [ ] **Step 3: Run full suite**

Run: `python3 -m unittest discover -s backend/tests -p "test_*.py" 2>&1 | tail -3`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_school_requests.py
git commit -m "test: add school request endpoint tests"
```

---

### Task 4: Frontend API client and types

**Files:**
- Create: `frontend/src/api/schoolRequests.ts`
- Modify: `frontend/src/types/school.ts`

- [ ] **Step 1: Add types to `school.ts`**

```typescript
export interface SchoolRequest {
  id: string;
  schoolName: string;
  orgType: string;
  websiteUrl: string;
  canvasInstanceUrl: string;
  requesterUid: string;
  requesterEmail: string;
  requesterName: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByUid: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdOrgId: string | null;
  createdAt: string | null;
}

export interface TeacherInvitation {
  id: string;
  orgId: string;
  uid: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedByUid: string | null;
  reviewedAt: string | null;
  createdAt: string | null;
}
```

- [ ] **Step 2: Create API client**

```typescript
import api from './index';
import type { SchoolRequest, TeacherInvitation } from '@/types/school';

// -- School requests (public) --

export const submitSchoolRequest = async (payload: {
  schoolName: string;
  orgType: string;
  websiteUrl?: string;
  canvasInstanceUrl?: string;
}): Promise<{ requestId: string; status: string }> => {
  const response = await api.post('/school-requests', payload);
  return response.data;
};

export const getMySchoolRequest = async (): Promise<SchoolRequest | null> => {
  const response = await api.get<{ success: boolean; request: SchoolRequest | null }>('/school-requests/mine');
  return response.data.request;
};

// -- Lingual admin --

export const listSchoolRequests = async (status?: string): Promise<SchoolRequest[]> => {
  const params = status ? { status } : {};
  const response = await api.get<{ requests: SchoolRequest[] }>('/admin/school-requests', { params });
  return response.data.requests;
};

export const approveSchoolRequest = async (requestId: string): Promise<{ orgId: string; membershipId: string }> => {
  const response = await api.post(`/admin/school-requests/${requestId}/approve`);
  return response.data;
};

export const rejectSchoolRequest = async (requestId: string, reason?: string): Promise<void> => {
  await api.post(`/admin/school-requests/${requestId}/reject`, { reason });
};

// -- Teacher invite codes (school_admin) --

export const generateTeacherInviteCode = async (): Promise<{ inviteCode: string }> => {
  const response = await api.post('/schools/teacher-invite-code');
  return response.data;
};

export const getTeacherInviteCode = async (): Promise<{ inviteCode: string | null; active: boolean }> => {
  const response = await api.get('/schools/teacher-invite-code');
  return response.data;
};

export const deactivateTeacherInviteCode = async (): Promise<void> => {
  await api.delete('/schools/teacher-invite-code');
};

// -- Teacher invitations (school_admin) --

export const listTeacherInvitations = async (status?: string): Promise<TeacherInvitation[]> => {
  const params = status ? { status } : {};
  const response = await api.get<{ invitations: TeacherInvitation[] }>('/schools/teacher-invitations', { params });
  return response.data.invitations;
};

export const approveTeacherInvitation = async (invitationId: string): Promise<void> => {
  await api.post(`/schools/teacher-invitations/${invitationId}/approve`);
};

export const rejectTeacherInvitation = async (invitationId: string): Promise<void> => {
  await api.post(`/schools/teacher-invitations/${invitationId}/reject`);
};

// -- Teacher join (any auth user) --

export const joinSchoolAsTeacher = async (inviteCode: string): Promise<{ invitationId: string }> => {
  const response = await api.post('/schools/join-as-teacher', { inviteCode });
  return response.data;
};
```

- [ ] **Step 3: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api/schoolRequests.ts frontend/src/types/school.ts
git commit -m "feat: add school request + teacher invitation API types and client"
```

---

### Task 5: LingualAdminRoute guard

**Files:**
- Create: `frontend/src/components/layout/LingualAdminRoute.tsx`

- [ ] **Step 1: Create the guard**

```typescript
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function LingualAdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // The lingual_admin flag comes from the user's Firestore document
  // and is included in the auth payload by /api/test/verify or /api/auth/verify
  if (!(user as Record<string, unknown>).lingualAdmin) {
    return <Navigate to="/app/learn" replace />;
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/layout/LingualAdminRoute.tsx
git commit -m "feat: add LingualAdminRoute guard"
```

---

### Task 6: SchoolRequestPage (replaces SchoolOnboardingPage)

**Files:**
- Create: `frontend/src/pages/SchoolRequestPage.tsx`

- [ ] **Step 1: Create the page**

A form page with two states: (1) no existing request → show form, (2) existing request → show status. Follow the same Card + Input + Button + Alert pattern used in `CanvasConnectPage.tsx` and `StudentJoinClassPage.tsx`.

Form fields: school name (required), org type radio (school/district/language_institute), website URL (optional), Canvas instance URL (optional).

On submit: call `submitSchoolRequest()`. On success: show "Request submitted" with pending status badge.

If user already has a request: show status card (pending = yellow badge, approved = green + "Go to dashboard" link, rejected = red + reason).

- [ ] **Step 2: TypeScript check**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/SchoolRequestPage.tsx
git commit -m "feat: add SchoolRequestPage for school join requests"
```

---

### Task 7: LingualSchoolRequestsPage (admin panel)

**Files:**
- Create: `frontend/src/pages/LingualSchoolRequestsPage.tsx`

- [ ] **Step 1: Create the page**

A table/card list showing school requests. Status filter tabs (All, Pending, Approved, Rejected). Each request card shows: school name, org type, requester name/email, website URL, Canvas URL, submitted date. Pending requests have Approve/Reject buttons. Reject shows a text input for reason.

Use the existing `Card`, `Button`, `Badge`, `Alert`, `Input` components.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/LingualSchoolRequestsPage.tsx
git commit -m "feat: add Lingual admin school requests review page"
```

---

### Task 8: Wire routes in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add lazy imports**

```typescript
const SchoolRequestPage = lazy(() => import('./pages/SchoolRequestPage').then((module) => ({ default: module.SchoolRequestPage })));
const LingualSchoolRequestsPage = lazy(() => import('./pages/LingualSchoolRequestsPage').then((module) => ({ default: module.LingualSchoolRequestsPage })));
```

Import the guard:
```typescript
import { LingualAdminRoute } from './components/layout/LingualAdminRoute';
```

- [ ] **Step 2: Replace `/school/setup` route**

Change:
```tsx
<Route path="/school/setup" element={withRouteSuspense(<SchoolOnboardingPage />)} />
```
To:
```tsx
<Route path="/school/setup" element={withRouteSuspense(<SchoolRequestPage />)} />
```

- [ ] **Step 3: Add admin route inside the `/app` block**

```tsx
<Route
  path="admin/school-requests"
  element={withRouteSuspense(
    <LingualAdminRoute>
      <LingualSchoolRequestsPage />
    </LingualAdminRoute>
  )}
/>
```

- [ ] **Step 4: TypeScript check + commit**

Run: `cd frontend && npx tsc --noEmit`

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire school request + admin routes in App.tsx"
```

---

## Piece 2: Teacher Invite Codes

### Task 9: Database layer for teacher invite codes + invitations

**Files:**
- Modify: `database.py`

- [ ] **Step 1: Add teacher invite code functions on org**

```python
def generate_teacher_invite_code(org_id):
    """Generate or regenerate a 6-char teacher invite code for an org."""
    code = ''.join(secrets.choice(JOIN_CODE_ALPHABET) for _ in range(JOIN_CODE_LENGTH))
    get_organization_ref(org_id).update({
        'teacher_invite_code': code,
        'teacher_invite_code_active': True,
        'teacher_invite_code_generated_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP,
    })
    return code


def get_org_by_teacher_invite_code(code):
    """Look up an org by its active teacher invite code."""
    docs = (
        get_organizations_collection()
        .where('teacher_invite_code', '==', code)
        .where('teacher_invite_code_active', '==', True)
        .where('status', '==', 'active')
        .limit(1)
        .stream()
    )
    for doc in docs:
        data = doc.to_dict() or {}
        data['id'] = doc.id
        return data
    return None


def deactivate_teacher_invite_code(org_id):
    """Deactivate the teacher invite code."""
    get_organization_ref(org_id).update({
        'teacher_invite_code_active': False,
        'updated_at': firestore.SERVER_TIMESTAMP,
    })
```

- [ ] **Step 2: Add teacher_invitations collection CRUD**

```python
def get_teacher_invitations_collection():
    return get_db().collection('teacher_invitations')


def create_teacher_invitation(org_id, uid, email, name):
    """Create a teacher invitation (pending status)."""
    doc_ref = get_teacher_invitations_collection().document()
    doc_ref.set({
        'org_id': org_id,
        'uid': uid,
        'email': email,
        'name': name,
        'status': 'pending',
        'reviewed_by_uid': None,
        'reviewed_at': None,
        'created_at': firestore.SERVER_TIMESTAMP,
    })
    return doc_ref.id


def get_teacher_invitation(invitation_id):
    doc = get_teacher_invitations_collection().document(invitation_id).get()
    if not doc.exists:
        return None
    data = doc.to_dict() or {}
    data['id'] = doc.id
    return data


def list_teacher_invitations(org_id, status_filter=None):
    query = get_teacher_invitations_collection().where('org_id', '==', org_id)
    if status_filter:
        query = query.where('status', '==', status_filter)
    docs = query.order_by('created_at', direction=firestore.Query.DESCENDING).stream()
    results = []
    for doc in docs:
        data = doc.to_dict() or {}
        data['id'] = doc.id
        results.append(data)
    return results


def get_teacher_invitation_by_user(org_id, uid):
    """Check if a user already has a pending invitation for this org."""
    docs = (
        get_teacher_invitations_collection()
        .where('org_id', '==', org_id)
        .where('uid', '==', uid)
        .where('status', '==', 'pending')
        .limit(1)
        .stream()
    )
    for doc in docs:
        data = doc.to_dict() or {}
        data['id'] = doc.id
        return data
    return None


def update_teacher_invitation(invitation_id, updates):
    updates['updated_at'] = firestore.SERVER_TIMESTAMP
    get_teacher_invitations_collection().document(invitation_id).update(updates)
```

- [ ] **Step 3: Commit**

```bash
git add database.py
git commit -m "feat: add teacher invite code + invitation Firestore CRUD"
```

---

### Task 10: Teacher invite endpoints in schools.py

**Files:**
- Modify: `backend/routes/schools.py`

- [ ] **Step 1: Add invite code endpoints**

Add before `return bp` in `create_schools_blueprint`:

- `POST /api/schools/teacher-invite-code` — generate code (school_admin)
- `GET /api/schools/teacher-invite-code` — get code status
- `DELETE /api/schools/teacher-invite-code` — deactivate
- `POST /api/schools/join-as-teacher` — teacher enters code → creates invitation

Follow the exact pattern of the existing join code endpoints in `teacher.py`.

The `join-as-teacher` endpoint:
1. Validate 6-char code
2. Look up org via `get_org_by_teacher_invite_code(code)`
3. Check user isn't already a member of this org
4. Check user doesn't already have a pending invitation
5. Create `teacher_invitation` with status `pending`
6. Return `{ invitationId, orgName, status: "pending" }`

- [ ] **Step 2: Add invitation management endpoints**

- `GET /api/schools/teacher-invitations` — list invitations (school_admin)
- `POST /api/schools/teacher-invitations/:id/approve` — approve (school_admin)
- `POST /api/schools/teacher-invitations/:id/reject` — reject (school_admin)

Approve creates a membership: `deps.db.create_membership(org_id, uid, roles=["teacher"])`.

- [ ] **Step 3: Run tests**

Run: `python3 -m unittest discover -s backend/tests -p "test_*.py" 2>&1 | tail -3`
Expected: All pass

- [ ] **Step 4: Commit**

```bash
git add backend/routes/schools.py
git commit -m "feat: add teacher invite code + invitation endpoints"
```

---

### Task 11: TeacherJoinSchoolPage

**Files:**
- Create: `frontend/src/pages/TeacherJoinSchoolPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create the page**

Same pattern as `StudentJoinClassPage.tsx` — 6-char code input, auto-uppercase, submit button. On success: "Your request has been sent to the school admin for approval" with org name displayed.

- [ ] **Step 2: Add route**

In `App.tsx`, add lazy import and route:
```tsx
<Route path="teacher/join" element={withRouteSuspense(<TeacherJoinSchoolPage />)} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/TeacherJoinSchoolPage.tsx frontend/src/App.tsx
git commit -m "feat: add TeacherJoinSchoolPage for teacher invite codes"
```

---

## Piece 3: Teacher Invitation Approval UI

### Task 12: Teacher invitation management in dashboard

**Files:**
- Modify: `frontend/src/pages/TeacherDashboardPage.tsx`

- [ ] **Step 1: Add teacher invitation section for school_admin**

When the user has `school_admin` role, show a "Team" section in the dashboard with:
- Current invite code (with copy button + regenerate + deactivate)
- Pending teacher invitations list with approve/reject buttons
- Approved teachers list (read-only)

Use `getTeacherInviteCode()`, `listTeacherInvitations()`, `approveTeacherInvitation()`, `rejectTeacherInvitation()` from the API client.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/TeacherDashboardPage.tsx
git commit -m "feat: add teacher invitation management to dashboard"
```

---

## Piece 4: Remove Self-Service School Creation

### Task 13: Gate the school creation endpoint

**Files:**
- Modify: `backend/routes/schools.py`

- [ ] **Step 1: Gate `POST /api/schools` to lingual_admin only**

Change `api_create_school` to check `lingual_admin` and return 403 for non-admins. This preserves the endpoint for internal use (test harness calls it indirectly via seed) but prevents UI self-service.

```python
# At the top of api_create_school:
admin_uid = deps.get_current_user_uid()
if not deps.db.get_user_field(admin_uid, 'lingual_admin'):
    return jsonify({'success': False, 'error': 'School creation requires Lingual approval. Submit a request at /app/request-school.'}), 403
```

- [ ] **Step 2: Update TeacherRoute redirect**

In `TeacherRoute.tsx`, change the redirect from `/school/setup` to `/app/request-school`:

```typescript
if (memberships.length === 0) {
  return <Navigate to="/app/request-school" replace />;
}
```

Wait, `TeacherRoute` checks for memberships, not school setup. The redirect to `/school/setup` handles users with no memberships. Now it should redirect to the request page instead. But `/app/request-school` doesn't exist yet as a route — it's at `/school/setup` which we replaced with `SchoolRequestPage` in Task 8.

Actually, the existing route `/school/setup` now renders `SchoolRequestPage` (from Task 8), so `TeacherRoute` already redirects to the right place. No change needed.

- [ ] **Step 3: Run full test suite**

Run: `python3 -m unittest discover -s backend/tests -p "test_*.py" 2>&1 | tail -3`
Expected: All pass (test harness bypasses the gate)

- [ ] **Step 4: Commit**

```bash
git add backend/routes/schools.py
git commit -m "feat: gate school creation to lingual_admin only"
```

---

## Piece 5: Integration Testing

### Task 14: E2E test for the full onboarding chain

**Files:**
- Create: `e2e/test-school-onboarding.sh`

- [ ] **Step 1: Write the test script**

The test uses curl + Playwright to verify:
1. User submits school request → pending
2. Lingual admin approves → org created
3. School admin generates teacher invite code
4. Teacher enters code → invitation pending
5. School admin approves teacher → teacher gets membership
6. Teacher connects Canvas (already tested, just verify the role works)
7. Student joins class via code (already tested)

Use the test harness to set up the `lingual_admin` flag on the approver user. Use the API directly for the backend steps, Playwright for the key UI pages.

- [ ] **Step 2: Run it**

Run: `bash e2e/test-school-onboarding.sh`
Expected: All assertions pass

- [ ] **Step 3: Commit**

```bash
git add e2e/test-school-onboarding.sh
git commit -m "test: add E2E school onboarding chain test"
```

---

## Firestore Indexes

The following new composite indexes may be needed (add to `firestore.indexes.json` if queries fail):

- `school_requests`: `(requester_uid ASC, created_at DESC)`
- `school_requests`: `(status ASC, created_at DESC)`
- `teacher_invitations`: `(org_id ASC, created_at DESC)`
- `teacher_invitations`: `(org_id ASC, status ASC, created_at DESC)`
- `teacher_invitations`: `(org_id ASC, uid ASC, status ASC)`
- `organizations`: `(teacher_invite_code ASC, teacher_invite_code_active ASC, status ASC)`

Deploy with: `firebase deploy --only firestore:indexes`
