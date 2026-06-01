# Feature Catalog

Status: Business v1 draft
Last updated: 2026-06-01

## Summary

This catalog describes product capabilities as business features, not implementation details. Each feature is written in terms of customer value, demo value, monetization potential, and limitation.

## Feature: School Workspace Onboarding

### What it does

Lets a school admin or authorized requester submit a school workspace request with organization details, admin identity, optional integration preferences, curriculum context, and teacher pre-invites.

### Why it matters

This creates a school-first entry point instead of forcing every pilot user through a consumer learner flow.

### Who uses it

- School admins
- Program coordinators
- Founders / Lingual internal admins during pilot approval

### Demo script

Show the school registration wizard, explain that it collects the basic information needed to evaluate and configure a pilot, then show the pending-review state and Lingual-admin approval path.

### Business notes

- Good for founder-led pilot intake.
- Supports controlled beta recruitment rather than uncontrolled self-serve school creation.
- Teacher pre-invites help convert an admin request into a class/team pilot.

### Current limitations

- Current workflow is beta-oriented and approval-based.
- Workspace metadata editing after approval is limited.
- Admin wizard copy is English-only.
- Exact qualification criteria for approving schools: Any legitamage school.

## Feature: Role-Based School Workspace

### What it does

Supports distinct student, teacher, school-admin, and Lingual-admin experiences.

### Why it matters

Schools need different permissions for learners, classroom staff, school operators, and Lingual internal staff. This is a prerequisite for B2B sales and compliance discussions.

### Who uses it

- Students
- Teachers
- School admins
- Lingual internal admins

### Demo script

Show how a teacher sees class, assignment, roster, Canvas, analytics, and compliance actions, while a school admin sees broader compliance and deletion-request tools.

### Business notes

- Makes Lingual more than a consumer app.
- Supports school pilot operations.
- Creates packaging potential around admin controls and organization-level reporting.

### Current limitations

- Multi-school and multi-role behavior exists, but some admin operations are still v1-level.
- Full enterprise role administration is not yet ready.
- SSO and advanced identity controls: Need to be resolved.

## Feature: Class Setup And Roster Growth

### What it does

Teachers can create classes, generate class join codes, view rosters, remove students, and compare Canvas roster entries against students who have actually joined Lingual.

### Why it matters

Class setup is the first operational hurdle for a school pilot. The join-code path lets a teacher begin with manual setup, while Canvas/LTI can support schools that already use Canvas.

### Who uses it

- Teachers
- Students
- School admins indirectly

### Demo script

Create a class, generate a join code, show how a student joins, then return to the teacher roster view.

### Business notes

- Good for small-class pilots and co-design teachers.
- Supports low-friction pilot setup.
- Helps sales say "you do not need a district-wide integration to start."
- Supports the current manual setup or Canvas LMS pilot posture.

### Current limitations

- CSV import is not implemented.
- Bulk/email student invitations are not implemented.
- Google Classroom roster support is not current.
- Advanced roster matching for different Canvas vs Lingual email addresses is limited.

## Feature: Canvas And LTI Integration

### What it does

Supports Canvas connection, roster/content sync, course-content visibility, assignment linking, LTI 1.3 launch, deep-link assignment embedding, and completion-style grade passback.

### Why it matters

Canvas support reduces adoption friction for schools already living inside Canvas. It also makes Lingual easier to present as a school workflow tool rather than a separate consumer app.

### Who uses it

- Teachers
- School admins / LMS coordinators
- Students launching from Canvas

### Demo script

Show a Canvas-connected class, synced Canvas content, a Lingual speaking assignment linked to Canvas content, and the Canvas deep-link picker for embedding a Lingual assignment.

### Business notes

- Strong pilot differentiator for Canvas schools.
- Grade passback can support teacher adoption because practice completion can return to Canvas.
- Can become an Enterprise/School package anchor.

### Current limitations

- Manual Canvas PAT connection exists; OAuth-style Canvas setup is not the only path.
- Manual resync only; automatic webhook sync is not current.
- Roster sync does not automatically enroll students; students still join through code or LTI.
- Grade passback is completion-oriented, not a full assessment-grade engine.
- Google Classroom integration: Need to be resolved.

## Feature: Teacher Assignment Authoring

### What it does

Teachers can create speaking-practice assignments from Canvas content, pasted source packets, manual structured inputs, or scaffold-free custom prompts.

### Why it matters

This is the product's core control point. It lets teachers shape what the AI should practice instead of sending students into generic open chat.

### Who uses it

- Teachers
- Department leads evaluating curriculum fit

### Demo script

Start from a Canvas item or source packet, generate a draft, then show editable scenario, target expressions, target vocabulary, focus grammar, success criteria, teacher notes, status, and language-mix settings.

### Business notes

- Central sales story: teacher intent becomes AI behavior.
- Useful for pilots because teachers can work from their existing materials.
- Potential paid-package axis: advanced assignment authoring, shared templates, department libraries, and curriculum packs.

### Current limitations

- Imported curriculum-package workflow is not part of the current beta path.
- Scaffold-free custom prompts intentionally bypass target-expression and rubric-dependent analytics.
- Mid-session intervention beyond the pre-session prompt is not current.
- Shared school or department assignment library: Need to be resolved.

## Feature: Assignment-Aware Student Practice

### What it does

Students launch practice from a teacher assignment. The practice workspace shows assignment context and opens a voice or text practice experience according to consent and teacher settings.

### Why it matters

This is the first value moment for students: they practice the exact conversation goal their teacher assigned, not a generic chat topic.

### Who uses it

- Students
- Teachers reviewing whether the assignment worked

### Demo script

Open a student assignment, show the assignment scope and teacher goals, then launch practice. If voice is blocked, show how text fallback can keep the assignment usable when configured.

### Business notes

- Strong demo moment.
- Supports asynchronous speaking practice outside class.
- Hybrid voice/text model helps manage cost and consent constraints.

### Current limitations

- Text-only/downgraded practice works, but the text experience is still not unified with the main chat workspace.
- Voice recordings and teacher audio playback are not implemented.
- Teacher transcript review is not implemented.
- Provider-accurate voice minutes and cost accounting are not complete.

## Feature: Teacher Analytics

### What it does

Gives teachers class, assignment, and student-level views of activity and learning signals: sessions, student turns, estimated speaking time, words per turn, self-corrections, repeated errors, target-expression hits, task completion, and rubric evidence.

### Why it matters

The analytics story turns practice into instructional value. It helps teachers answer: who practiced, what they practiced, what repeated errors appeared, and what should be reviewed next.

### Who uses it

- Teachers
- Department leads evaluating pilot usefulness
- School leaders asking whether the pilot produced evidence

### Demo script

Show a class analytics page, then drill into one assignment and one student. Emphasize speaking minutes, target-expression evidence, repeated error patterns, and self-correction.

### Business notes

- Important for ROI conversations.
- Can support premium reporting and school-level dashboards later.
- Stronger than a generic chat transcript because it frames practice around teacher goals.

### Current limitations

- Speaking time is estimated from transcript length, not raw audio timing.
- Rubric scores are heuristic evidence rollups, not certified assessment scoring.
- Teacher cannot yet read full student transcripts from the dashboard.
- Cross-class trends and advanced reporting are limited.

## Feature: AI Debrief Reporting

### What it does

Creates pilot and practice debrief reports through Lingual's own product AI agent for students and teachers.

### Why it matters

Debrief reporting should turn raw practice activity into a readable explanation of what happened, what improved, where students struggled, and what teachers should inspect next.

### Who uses it

- Students
- Teachers
- Pilot evaluators

### Demo script

When available, show a student-facing debrief after practice and a teacher-facing debrief after reviewing class or assignment activity. Emphasize that the report summarizes practice evidence rather than replacing teacher judgment.

### Business notes

- Important for pilot evaluation because debrief quality is one of the success signals.
- Can help convert analytics into a more understandable sales and customer-success story.
- Should be positioned as AI-generated reporting, not certified assessment.
- Visibility should be student and teacher only; school admins should not receive student-level debriefs.

### Current limitations

- Upcoming feature, not current beta functionality.
- Report structure and review flow need product definition.
- School-admin visibility should be aggregate-only unless a later legal/product review changes the sharing model.

## Feature: Compliance And Guardian Consent

### What it does

Supports consent-aware voice access, text fallback, guardian consent packets, student consent record editing, class and organization-level compliance rosters, bulk consent updates, audit CSV export, and deletion-request workflows.

### Why it matters

Schools will ask about student data, minors, voice, retention, guardian consent, and deletion. Lingual has a product surface for these concerns instead of treating them as afterthoughts.

### Who uses it

- Teachers
- School admins
- Guardians / parents
- Lingual internal operators

### Demo script

Show a student whose voice is blocked until consent is resolved, issue or review a guardian packet, then show org/class-level compliance summary and audit export.

### Business notes

- Major differentiator for school pilots.
- Helps sales handle privacy and rollout objections with product evidence.
- Supports future Enterprise packaging around compliance controls and audit exports.

### Current limitations

- Legal validation of COPPA, FERPA, and biometric-risk assumptions is still needed.
- Disclosure logging does not cover every sensitive read path yet.
- Downloadable guardian notice artifact is not fully productized.
- Deletion execution is synchronous and beta-level.
- Raw audio storage cleanup is placeholder because raw audio is not currently stored.

## Feature: Lingual Admin Operations

### What it does

Lets internal Lingual admins review school requests, approve or decline schools, view organizations, suspend or restore organizations, remove members, and inspect audit activity.

### Why it matters

This supports a controlled school-beta motion where Lingual can approve, monitor, and manage pilot organizations.

### Who uses it

- Lingual founders
- Internal operations
- Future customer success

### Demo script

Show a school request, approve it, view the organization, and show lifecycle controls such as suspend/restore and audit history.

### Business notes

- Enables founder-led sales, support, and controlled onboarding.
- Useful for early customer success workflows.
- Creates a path toward operational readiness, even before full self-serve sales exists.

### Current limitations

- Organization metadata editing is limited.
- Bulk org audit export is not implemented.
- Lingual admin UI is English-only.
- Full customer-success playbooks and formal support SLA: Need to be resolved.

## Feature: Learner Free Practice And Supplemental Activities

### What it does

Lingual still includes learner-facing free practice, pronunciation practice, games, assessment, profile settings, and chat surfaces.

### Why it matters

These can support engagement and individual learner value, but they are not the current school-beta sales center.

### Who uses it

- Individual learners
- Students outside assigned school practice

### Demo script

Only demo this after the school assignment flow, unless the buyer asks about independent practice.

### Business notes

- May support a future B2C or student-led expansion motion.
- Can add engagement value inside schools, but the current school pitch should lead with assignments and teacher control.

### Current limitations

- Not the main school beta value proposition.
- Some locale content is incomplete.
- Avatar features are intentionally dormant for the pilot runtime.
