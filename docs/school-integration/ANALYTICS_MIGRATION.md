# Analytics Family (practice_sessions + learning_events) Migration Design

**ADR-0001 Coexistence — Analytics Slice**
Date: 2026-06-02 | Status: **DESIGN (proposed)** — verdict **GO-WITH-FIXES**, produced via a map→design→adversarial-critique→synthesis workflow. Implementation NOT started; 5 flag-gated slices (§5). Companion to `READ_CUTOVER.md` (which covered the relational chain, now flipped). The five baked-in fixes from the critiques: session-summary moves into the session-close batch (pool exhaustion); batch handler is a separate Cloud Run Job; `insert(...).on_conflict_do_nothing` not `bulk_save_objects`; split-pass aggregate parity; term-scope backfill is mandatory.

---

## 0. Executive Summary

The analytics family migration is architecturally feasible in five sequential flag-gated slices, with five mandatory fixes over the original design accepted from the adversarial critiques:

1. Per-turn `session_summary` UPDATE moves into the session-close batch (pool exhaustion at checkout is the dominant failure mode, not statement timeout).
2. Batch handler runs as a separate Cloud Run Job (not an inline Flask route) to isolate pool contention from the shared web process.
3. Bulk event INSERT uses `insert(LearningEvent).values([...]).on_conflict_do_nothing(index_elements=['legacy_firestore_id'])` — not `bulk_save_objects`, which breaks idempotency.
4. Shadow parity splits into two independent passes (session-summary: zero-divergence gate; event-derived: monotonic-convergence gate).
5. Term-scope backfill is mandatory at school onboarding, not optional.

---

## 1. Entity and FK Model

### 1.1 FK Chain

```
organizations           (PG-authoritative, READ_PG_ORGANIZATIONS=1)
  └── classes           (PG-authoritative, READ_PG_CLASSES=1)
        └── assignments [SLICE A — first new entity]
              └── practice_sessions  [SLICE B]
                    └── learning_events  [SLICE C]
```

`student_firebase_uid` is a `Text` column in PG on both `PracticeSession` and `LearningEvent` — not a FK. No membership resolution needed.

### 1.2 Model Assessment

`backend/db/models/practice.py` and `backend/db/models/assignment.py` are schema-complete. No DDL changes required for dual-write or backfill, with one addition:

**Alembic revision `0002`** (new, before Slice B): add `events_synced_at TIMESTAMPTZ` (nullable) to `practice_sessions`. This is the only required schema change. The batch handler sets this after a successful bulk INSERT. This revision must be applied to the live instance before `DUAL_WRITE_ANALYTICS_EVENTS` is enabled.

Critical serializer field rename (same class as enrollment D1 defect):

| Firestore field | PG column | Rule |
|---|---|---|
| `student_uid` | `student_firebase_uid` | Every read adapter emits `student_uid` in the output dict. Covered by adapter unit tests. |

The `analytics_rollups` table has no SQLAlchemy model and is excluded from `0001_baseline.py`. It remains a schema stub — see §4.1.

### 1.3 The Assignments Prerequisite

`PracticeSession.assignment_id` and `LearningEvent.assignment_id` are `NOT NULL FK → assignments.id`. Until an assignment row exists in PG, `resolve_legacy_id(session, Assignment, firestore_assignment_id)` returns `None`. Assignments are an unconditional hard prerequisite.

Slice A must deliver all four before Slices B and C can begin:
- `shadow_create_assignment` / `shadow_update_assignment`
- `upsert_assignment` in `backfill.py`
- `DUAL_WRITE_ASSIGNMENTS` flag
- `READ_PG_ASSIGNMENTS` flag + read adapters (required for the session analytics `_weaker_mode` gate — if this stays at `''`, the weaker_mode resolves to `''` and session analytics can never activate)

---

## 2. Dual-Write Strategy

### 2.1 The Hot-Path Decision

The original design proposed synchronous per-turn `session_summary` UPDATE with 500ms statement timeout. **This is the wrong latency model.**

`sql.py` configures `pool_size=8, max_overflow=2, pool_timeout=3s` — 10 total connections. Under 30 concurrent students submitting conversational turns, 30 `_run` calls compete for 10 pool slots. The `statement_timeout=500ms` is irrelevant — it only applies **after** a connection is obtained. The dominant failure mode is pool contention at checkout: ~20 students wait up to 3s at `pool_timeout`.

**Resolution: all per-turn analytics writes move into the session-close batch. The live per-turn path has zero PG writes after this change.** The only synchronous PG write on the live path is the session CREATE (one write per session, student already waits on session init).

### 2.2 What Goes Synchronous vs. Batch

| Operation | Strategy | Rationale |
|---|---|---|
| Session CREATE | Synchronous `_run_with_timeout` (1000ms) | One write per session; student waits on session init; acceptable |
| `session.started` event | Session-close batch | Adds no analytics value not on the session row; synchronous doubles pool exposure at init |
| Per-turn `session_summary` UPDATE | Session-close batch | Pool exhaustion at 30 concurrent students (§2.1) |
| All other events | Session-close batch | High volume, hot path |
| Session-close task | Cloud Tasks → separate Cloud Run Job | Isolated pool |

### 2.3 The `_run_with_timeout` Helper

**Do NOT modify the existing `_run` helper in `dual_write.py`.** Dynamically constructing the `SET LOCAL` f-string inside `_run` is a correctness hazard (missing `ms` suffix or wrong variable name → silently unlimited timeout, swallowed by `except Exception`). Existing callers use positional arguments.

**Create `_run_with_timeout(sql_engine, op_name, fn, *, timeout_ms: int)` as a new helper in `dual_write_analytics.py`** (keyword-only `timeout_ms` prevents positional misuse). Same fail-open contract as `_run`; hardcodes the timeout to the caller-supplied value.

### 2.4 Dual-Write for `practice_sessions`

**Flag: `DUAL_WRITE_ANALYTICS_SESSIONS`**

`shadow_create_practice_session(session_doc)` in `dual_write_analytics.py`:
- Uses `_run_with_timeout(sql_engine, 'create_practice_session', fn, timeout_ms=1000)`
- Resolves `org_id`, `class_id`, `assignment_id` FKs via `resolve_legacy_id`
- On `UnresolvedParentError`: log DEBUG, return silently (fail-open)
- On `session.ended`: if `DUAL_WRITE_ANALYTICS_EVENTS=1`, enqueue Cloud Tasks task with `{session_firestore_id}`

No `shadow_update_practice_session`. The session_summary deferred UPDATE is written in the session-close batch.

### 2.5 Dual-Write for `learning_events`

**Flag: `DUAL_WRITE_ANALYTICS_EVENTS`**

All events — including `session.started` — are written via the session-close batch task. There are no synchronous event shadows.

**Session-close batch handler (separate Cloud Run Job):**

```python
# analytics_batcher/handler.py
# Validates Cloud Tasks OIDC token (NOT Firebase ID token)
# Uses own pool: pool_size=4, pool_timeout=30s

def handle_batch(session_firestore_id: str, db_session: Session) -> None:
    session_doc = database.get_practice_session(session_firestore_id)
    # Resolve all four FKs ONCE — shared across all events in this session
    org_uuid      = resolve_legacy_id(db_session, Organization, session_doc['org_id'])
    class_uuid    = resolve_legacy_id(db_session, Class, session_doc['class_id'])
    assignment_uuid = resolve_legacy_id(db_session, Assignment, session_doc['assignment_id'])
    session_uuid  = resolve_legacy_id(db_session, PracticeSession, session_firestore_id)

    # Remediation: if session_uuid is None but assignment resolves,
    # attempt session CREATE before processing events
    if session_uuid is None and assignment_uuid is not None:
        upsert_practice_session(db_session, session_doc)
        session_uuid = resolve_legacy_id(db_session, PracticeSession, session_firestore_id)

    if any(x is None for x in [org_uuid, class_uuid, assignment_uuid, session_uuid]):
        raise BatchFKResolutionError(...)  # Cloud Tasks retry; NOT UnresolvedParentError

    events = database.list_session_learning_events(session_firestore_id)
    # Single multi-row INSERT with ON CONFLICT DO NOTHING (SA 2.0 idiom)
    db_session.execute(
        insert(LearningEvent).values([
            {
                'legacy_firestore_id': e['id'],
                'org_id': org_uuid, 'class_id': class_uuid,
                'assignment_id': assignment_uuid, 'session_id': session_uuid,
                'student_firebase_uid': e['student_uid'],
                'event_type': e['event_type'], 'turn_index': e.get('turn_index'),
                'payload': e.get('payload', {}), 'created_at': e.get('created_at'),
            }
            for e in events
        ]).on_conflict_do_nothing(index_elements=['legacy_firestore_id'])
    )
    # Deferred session_summary UPDATE (was per-turn in original design)
    db_session.execute(
        update(PracticeSession).where(PracticeSession.id == session_uuid)
        .values(
            session_summary=session_doc.get('session_summary', {}),
            cost_summary=session_doc.get('cost_summary', {}),
            analysis_state=session_doc.get('analysis_state', {}),
            status=session_doc.get('status', 'completed'),
            ended_at=session_doc.get('ended_at'),
            events_synced_at=datetime.now(UTC),
        )
    )
    db_session.commit()
```

**Retry policy:** 3 attempts, exponential backoff. On exhaustion: emit structured Cloud Logging entry `{event: 'event_batch_failed', session_firestore_id: ..., error: ...}` + Log-Based Alert in Cloud Monitoring. **No `failed_event_batches` PG table** — if PG is unhealthy the table INSERT would also fail; Cloud Logging is the correct durability primitive for a shadow failure.

**`BatchFKResolutionError` is distinct from `UnresolvedParentError`.** `UnresolvedParentError` is the quiet-coexistence no-op signal in `_run`'s except handler. `BatchFKResolutionError` signals that a batch task must retry. It does NOT inherit from `UnresolvedParentError` and is NOT caught by `_run`.

---

## 3. Backfill Strategy

### 3.1 Term-Scope Backfill Is Mandatory

Pure forward-only cutoff produces two problems that block the migration goal:

1. **Unreadable shadow soak:** any assignment with pre-cutoff sessions produces permanent aggregate divergence (Firestore has those sessions; PG does not), making the Pass 1/Pass 2 soak signal permanently nonzero.
2. **Firestore write retirement blocked:** TASKS.md goal is to retire Firestore writes after read cutover. If pre-cutoff sessions are permanently Firestore-only, Firestore reads must remain operational forever.

**Decision:** The term-scope backfill (sessions from active academic term start date) is **mandatory** at school onboarding, run BEFORE any dual-write flag is enabled.

### 3.2 What Goes Into `run_backfill`

```python
_PIPELINE = (
    ('organizations', Organization, upsert_organization),
    ('memberships',   Membership,   upsert_membership),
    ('classes',       Class,        upsert_class),
    ('enrollments',   Enrollment,   upsert_enrollment),
    ('assignments',   Assignment,   upsert_assignment),  # Slice A
    # practice_sessions and learning_events are NOT here — see §3.3
)
```

### 3.3 Why Events Are NOT in `run_backfill`

The SAVEPOINT-per-row loop (3 PG round-trips per row through pg8000) at 600k events (2,400 sessions × 250 events — revised estimate based on `build_derived_learning_events` emitting 6-10 derived events per `student.turn` × ~20 turns/session + primary events) takes 3–6 hours wall-clock. This is not acceptable.

**The correct bulk insert pattern for events (in `scripts/backfill_practice_sessions_term.py`):**

```python
CHUNK_SIZE = 2000
for i in range(0, len(event_rows), CHUNK_SIZE):
    chunk = event_rows[i:i + CHUNK_SIZE]
    db_session.execute(
        insert(LearningEvent).values(chunk)
        .on_conflict_do_nothing(index_elements=['legacy_firestore_id'])
    )
db_session.commit()
```

Single multi-row INSERT per chunk, no per-row SAVEPOINT, genuine idempotency. Drops 600k-row event backfill from hours to 2-4 minutes. The implementation plan must **explicitly prohibit** the SAVEPOINT-per-row pattern for events.

### 3.4 Parity Strategy

**Sessions:** id-set diff (existing `parity_report` pattern) is feasible at ~2,400 rows per term.

**Events: per-session COUNT diff, not full-table id-set diff.**

The existing `parity_report` does `SELECT legacy_firestore_id FROM learning_events` with no WHERE clause. At 600k rows this produces ~120 MB of Python objects (each UUID string ~36 bytes × ~200 bytes Python set overhead) plus hours of Firestore reads at throughput limits. This cannot scale to events.

The correct event parity is a per-session COUNT comparison:

```python
# O(num_sessions) queries, not O(num_events)
pg_counts = {session_legacy_id: count
             for session_legacy_id, count in db_session.execute(
                 select(PracticeSession.legacy_firestore_id, func.count(LearningEvent.id))
                 .join(LearningEvent).where(Class.legacy_firestore_id == class_id)
                 .group_by(PracticeSession.legacy_firestore_id)
             ).all()}
```

---

## 4. Read Cutover

### 4.1 The `analytics_rollups` Decision

**No precomputed `analytics_rollups` for beta.** TASKS.md line 56 stays `[-]`.

**Important caveat:** the 5-50ms query time claim applies to session_summary aggregations only. `_aggregate_context_tag_counts` and `_aggregate_error_event_metadata` read the `payload` JSONB column per row. Without a GIN index on `payload`, these scan JSONB fields for every event in the assignment. A GIN index on `learning_events(payload)` OR denormalization of `context_tag` into an indexed column is required before Slice E read flip.

### 4.2 Aggregation Strategy: Python-over-PG

Analytics layer stays in Python. Read path becomes a direct substitution: swap Firestore fetcher for PG adapter, pass same list of dicts to same Python functions in `practice_analytics.py`. No changes to `practice_analytics.py` in this migration.

### 4.3 ReadRouter Adapters

All adapters in `backend/db/repository/analytics_reads.py`. Each emits `student_uid` (not `student_firebase_uid`). FK columns emitted as parent's `legacy_firestore_id` via JOIN (never raw UUIDs — same rule as enrollment D1 fix).

- **`list_assignment_practice_sessions_pg`**: resolve Assignment FK; `WHERE assignment_id = $uuid ORDER BY started_at DESC`
- **`list_class_practice_sessions_pg`**: resolve Class FK; `WHERE class_id = $uuid ORDER BY started_at DESC`
- **`list_student_assignment_practice_sessions_pg`**: resolve Assignment FK; `WHERE assignment_id = $uuid AND student_firebase_uid = $uid`
- **`list_student_class_practice_sessions_pg`**: resolve Class FK; `WHERE class_id = $uuid AND student_firebase_uid = $uid`
- **`list_assignment_learning_events_pg`**: resolve Assignment FK; `WHERE assignment_id = $uuid [AND event_type = ANY($types)] ORDER BY created_at` — event_type filter pushed into SQL
- **`list_session_learning_events_pg`**: resolve PracticeSession FK; `WHERE session_id = $uuid ORDER BY created_at`
- **`list_student_class_learning_events_pg`**: resolve Class FK; `WHERE class_id = $uuid AND student_firebase_uid = $uid ORDER BY created_at`

**Assignment read adapters (also Slice A):** `get_assignment_pg`, `list_class_assignments_pg` — required for `READ_PG_ASSIGNMENTS` to reach `1`.

### 4.4 The `_weaker_mode` Gate for Analytics

**Session reads gate:**
```python
_weaker_mode('READ_PG_ASSIGNMENTS', 'READ_PG_ANALYTICS_SESSIONS')
```
`READ_PG_CLASSES` is NOT in this gate — classes are already PG-authoritative (`=1`), adding it is a vacuous check. The actual FK dependency is assignments.

**Event reads gate:**
```python
_weaker_mode('READ_PG_ANALYTICS_SESSIONS', 'READ_PG_ANALYTICS_EVENTS')
```

`_route_read`'s `also` parameter currently accepts a single string. It must be extended to accept a tuple of flags. This is a small interface change in `read_router.py`.

**Sessions and events can flip independently** (the original design's "must flip together" claim is over-constrained):
- `READ_PG_ANALYTICS_SESSIONS=1` enables session-summary-derived analytics
- `READ_PG_ANALYTICS_EVENTS=1` additionally enables context_tag and error_spread
- The `_weaker_mode` gate enforces the dependency automatically

### 4.5 Split Aggregate Shadow Parity

**Pass 1 — Session-summary metrics (convergence target: zero divergence):**
- Fields: `total_student_turns`, `total_assistant_turns`, `total_student_words`, `rubric_dimension_scores`, `completed_session_count`
- Derived from pre-rolled `session_summary` JSONB blob; expected exact match once session dual-write is stable
- Tolerance map: `{total_student_turns: 0, total_student_words: 0, rubric_dimension_scores: 0.01}`
- Divergence here indicates a serialization bug

**Pass 2 — Event-derived metrics (convergence target: monotonically decreasing delta):**
- Fields: `context_tag_counts`, `error_event_metadata`
- Expected to diverge proportionally to batch lag
- Accept for read flip when: delta is zero for all sessions with `events_synced_at IS NOT NULL`

The two passes must NOT be combined into a single mismatch threshold.

### 4.6 The Live Cross-Store Split-Brain (Active Today)

`list_class_enrollments` is PG-authoritative; `list_class_practice_sessions` is Firestore. Both are joined in Python by `student_uid` in `build_class_analytics_payload`. The cascade-delete divergence (LIMITATIONS #43a) can produce phantom enrolled-but-session-less students. This is active today, is not introduced by this migration, and is fully resolved when analytics reads cut over at Slice E. Add a LIMITATIONS entry documenting this condition.

---

## 5. Slice Decomposition and Sequencing

### Slice A: Assignments Dual-Write + Read Adapters

**Prereqs:** `READ_PG_CLASSES=1` (live), `READ_PG_ORGANIZATIONS=1` (live)

**Deliverables:**
- `dual_write_analytics.py`: `_run_with_timeout`, `shadow_create_assignment`, `shadow_update_assignment`; `DUAL_WRITE_ASSIGNMENTS` flag
- `backfill.py`: `upsert_assignment` (resolves `org_id`/`class_id` FKs, maps `canvas_module_item_ref` JSONB); add to `_PIPELINE`
- `analytics_reads.py`: `get_assignment_pg`, `list_class_assignments_pg`
- `read_router.py`: `READ_PG_ASSIGNMENTS` flag; extend `_route_read` to accept `also` as tuple
- `scripts/backfill_assignments.py`

**Tests:** shadow writes assignment row with correct FK UUIDs; `UnresolvedParentError` when class not in PG; id-set parity against Firestore; adapters emit `legacy_firestore_id` not UUID for FK fields.

**Flags introduced:** `DUAL_WRITE_ASSIGNMENTS`, `READ_PG_ASSIGNMENTS`

---

### Slice B: practice_sessions Dual-Write

**Prereqs:** Slice A complete; assignments backfilled; parity clean; Cloud Tasks queue provisioned; Alembic revision 0002 applied to live instance

**Deliverables:**
- `dual_write_analytics.py`: `shadow_create_practice_session`; `DUAL_WRITE_ANALYTICS_SESSIONS` flag
- Session-create shadow: synchronous, `_run_with_timeout(..., timeout_ms=1000)`; resolves 3 FK parents; on `session.ended` + `DUAL_WRITE_ANALYTICS_EVENTS=1`: enqueue Cloud Tasks task
- Alembic revision `0002`: `events_synced_at TIMESTAMPTZ` (nullable) on `practice_sessions`
- `scripts/backfill_practice_sessions_term.py`: **MANDATORY** term-scope backfill; chunked bulk INSERT for events (not SAVEPOINT-per-row); runs BEFORE the dual-write flag is enabled

**No `shadow_update_practice_session`.** Session_summary deferred to session-close batch.

**Tests:** session create → PG row with correct FKs; session end → Cloud Tasks task enqueued (mock task client); unresolved parent → silent no-op, Firestore write completes; pool exhaustion simulation → shadow dropped, no exception surfaced.

**Flags introduced:** `DUAL_WRITE_ANALYTICS_SESSIONS`

---

### Slice C: learning_events Session-Close Batch Handler (Cloud Run Job)

**Prereqs:** Slice B complete; `DUAL_WRITE_ANALYTICS_SESSIONS` live; session rows in PG; revision 0002 applied

**Deliverables:**
- Separate `analytics_batcher` Cloud Run Job; validates Cloud Tasks OIDC tokens; `pool_size=4, pool_timeout=30s`
- Batch handler: resolve 4 parent FKs once per batch; `insert(...).on_conflict_do_nothing(index_elements=['legacy_firestore_id'])`; deferred session_summary UPDATE; sets `events_synced_at`
- `BatchFKResolutionError` (distinct from `UnresolvedParentError`)
- Retry policy: 3 attempts, exponential backoff; on exhaustion: Cloud Logging structured log + Log-Based Alert; **no `failed_event_batches` table**
- `DUAL_WRITE_ANALYTICS_EVENTS` flag

**Tests:** N events inserted correctly; idempotent re-run; FK resolution for 4 parent IDs; `BatchFKResolutionError` on unresolved → retry; session-not-in-PG remediation path.

**Flags introduced:** `DUAL_WRITE_ANALYTICS_EVENTS`

---

### Slice D: Read Adapters + Split-Pass Shadow Soak

**Prereqs:** Slices A + B + C complete; term-scope backfill run; PG session and event rows present

**Deliverables:**
- All 7 session/event read adapters in `analytics_reads.py`
- `read_router.py`: session reads gated on `_weaker_mode('READ_PG_ASSIGNMENTS', 'READ_PG_ANALYTICS_SESSIONS')`; event reads on `_weaker_mode('READ_PG_ANALYTICS_SESSIONS', 'READ_PG_ANALYTICS_EVENTS')`
- GIN index on `learning_events(payload)` OR context_tag column denormalization (Alembic revision 0003)
- Split-pass shadow parity: Pass 1 (session-summary, zero-divergence) and Pass 2 (event-derived, monotonic-convergence) as separate compare paths
- Deploy `READ_PG_ASSIGNMENTS=shadow` → soak → flip to `1` → deploy `READ_PG_ANALYTICS_SESSIONS=shadow` → 2-week prod soak

---

### Slice E: Read Flag Flip + Firestore Write Retirement

**Prereqs:** Pass 1 mismatch <0.5%; Pass 2 delta near-zero for sessions with `events_synced_at`; GIN index deployed

**Deliverables:**
- Flip `READ_PG_ANALYTICS_SESSIONS=1`; soak 48h; flip `READ_PG_ANALYTICS_EVENTS=1`
- `WRITE_FIRESTORE_ANALYTICS` safety-net flag (default `1` for 1 sprint); retire Firestore writes after clean serving sprint
- LIMITATIONS.md: add entries for historical Firestore fallback and cross-store split-brain resolution
- TASKS.md analytics items complete

---

### Sequencing

```
A: DUAL_WRITE_ASSIGNMENTS + READ_PG_ASSIGNMENTS infrastructure + assignment read adapters
  ↓ (term-scope backfill MANDATORY before B)
B: DUAL_WRITE_ANALYTICS_SESSIONS (create-only shadow + Cloud Tasks enqueue)
  ↓
C: DUAL_WRITE_ANALYTICS_EVENTS (Cloud Run Job batch handler)
  ↓
D: All read adapters + shadow soak (READ_PG_ASSIGNMENTS=1 → READ_PG_ANALYTICS_SESSIONS=shadow)
  ↓
E: READ_PG_ANALYTICS_SESSIONS=1 + READ_PG_ANALYTICS_EVENTS=1 + retire Firestore writes
```

Minimum elapsed time: ~5 weeks from Slice A start to Slice E completion.

---

## 6. FK Resolution

### 6.1 Resolution Chain Per Entity

**Session CREATE shadow:**
```
resolve_legacy_id(session, Organization, org_id_str)      → org_pg_uuid
resolve_legacy_id(session, Class, class_id_str)           → class_pg_uuid
resolve_legacy_id(session, Assignment, assignment_id_str) → assignment_pg_uuid
student_firebase_uid = firestore_doc['student_uid']       # direct copy
```

**Session-close batch (once per batch, reused for all events):**
```
resolve_legacy_id(db_session, Organization, session_doc['org_id'])
resolve_legacy_id(db_session, Class, session_doc['class_id'])
resolve_legacy_id(db_session, Assignment, session_doc['assignment_id'])
resolve_legacy_id(db_session, PracticeSession, session_firestore_id)
# O(4) resolutions total regardless of event count — not O(4N)
```

### 6.2 Doubly-Unresolved Remediation

When batch handler finds `session_uuid is None`:
- If `assignment_uuid is not None`: attempt `upsert_practice_session(db_session, session_doc)` then re-resolve — handles the gap between dual-write enablement and term-scope backfill
- If `assignment_uuid is None` too: raise `BatchFKResolutionError` (term-scope backfill has not run; operator must run it)

---

## 7. Open Decisions Deferred

1. **`analytics_rollups` refresh worker** — deferred post-beta (TASKS.md line 56 stays `[-]`). Revisit when PG analytics query times exceed 200ms at school-of-record scale.
2. **Event retention + partitioning** — monthly range partitioning with DROP for old partitions is the standard pattern. Not required for beta; must be designed before multi-school GA.
3. **`event_type` CHECK constraint** — left unconstrained during coexistence. The 18-value `SUPPORTED_EVENT_TYPES` set is application-layer enforced. Add a permissive CHECK or enum type only if a data-quality incident occurs.
4. **Assignments read cutover scope** — assignment read adapters are scoped into Slice A (they are required for `READ_PG_ASSIGNMENTS=1` which gates session analytics). The full assignment CRUD route cutover (beyond the two analytics-path reads) is a separate follow-on slice.

---

## 8. Critique Disposition

| Finding | Decision |
|---|---|
| Hot-path latency: 500ms timeout is irrelevant; pool contention at checkout is the real bound | ACCEPTED — per-turn UPDATE moved to batch |
| Triple round-trip per turn | MOOT after fix 1; session-create still has 4 RTTs but once per session |
| Surge + auth gap: batch handler in Flask shares pool; Firebase vs OIDC auth mismatch | ACCEPTED — separate Cloud Run Job with own pool and OIDC validation |
| session.started synchronous shadow on init critical path | ACCEPTED — folded into session-close batch |
| _run extension risk: f-string hazard, positional kwarg misuse | ACCEPTED — _run_with_timeout as new helper; _run untouched |
| Forward-cutoff + shadow soak: permanently noisy without backfill | ACCEPTED — term-scope backfill mandatory; split-pass parity |
| bulk_save_objects: SA 1.x legacy API, no ON CONFLICT | ACCEPTED — insert(...).on_conflict_do_nothing() |
| _weaker_mode gate: READ_PG_CLASSES spurious; multi-flag interface gap | ACCEPTED — gate on READ_PG_ASSIGNMENTS + READ_PG_ANALYTICS_SESSIONS; extend _route_read |
| failed_event_batches table: PG write to handle PG write failure | ACCEPTED — Cloud Logging + Log-Based Alert; no new table |
| Event count underestimate: 80/session too low | ACCEPTED — revised to 250/session |
| SAVEPOINT-per-row infeasible at event scale | ACCEPTED — chunked bulk INSERT; explicit prohibition in implementation spec |
| parity_report id-set infeasible at 600k events | ACCEPTED — per-session COUNT diff |
| Pool exhaustion at session-close surge (duplicate of Finding 3) | ACCEPTED — same fix |
| JSONB payload cost not analyzed; 5-50ms claim overstated for context_tag/error queries | ACCEPTED — GIN index or denormalization required before Slice E |
| Forward-only cutoff incompatible with retiring Firestore writes | ACCEPTED — term-scope backfill mandatory |
| Split-brain already live; cascade-delete divergence | ACCEPTED — LIMITATIONS entry; resolved at Slice E |
| Aggregate parity structurally ambiguous | ACCEPTED — split-pass design |
| Doubly-unresolved FK chain | ACCEPTED — remediation path in batch handler; mandatory backfill |
| Per-turn UPDATE pool pressure (duplicate) | ACCEPTED — same fix |
| session_summary NOT sufficient for all analytics | ACCEPTED — Pass 2 parity + LIMITATIONS entry |
| READ_PG_ASSIGNMENTS=1 gate deferred out-of-scope | ACCEPTED — assignment read adapters scoped into Slice A |
| uuidv7 asymmetry + Alembic revision ordering | ACCEPTED — revision 0002 explicitly called out; handler must not run before migration applied |
