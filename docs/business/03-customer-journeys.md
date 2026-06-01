# Customer Journeys

Status: Business v1 draft
Last updated: 2026-06-01

## Journey map summary

Lingual has several different users in a school sale. The business team should avoid treating "the user" as one person.

| Journey                           | Main actor                                             | Business goal                                                                                                       | Status                      |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| School pilot intake               | School admin / coordinator / language department chair | Get a school approved and ready for pilot use.                                                                      | Current / Limited           |
| Teacher setup                     | Teacher                                                | Join or create a school workspace and set up classes.                                                               | Current                     |
| Assignment creation               | Teacher                                                | Turn class material into AI speaking practice.                                                                      | Current                     |
| Student practice                  | Student                                                | Complete teacher-assigned speaking or text practice.                                                                | Current                     |
| Consent resolution                | Guardian / school admin / teacher                      | Allow or block voice and define retention posture.                                                                  | Current / Limited           |
| Teacher review                    | Teacher                                                | Understand practice completion and learning evidence.                                                               | Current / Limited           |
| Internal pilot operations         | Lingual admin                                          | Approve, monitor, and manage school organizations.                                                                  | Current                     |
| Pilot package and paid conversion | Buyer / pilot owner                                    | Run the first 2-4 week pilot, then decide whether to continue through a paid extended pilot or school subscription. | Current / Research-deferred |

## Journey 1: School pilot intake

### Flow

1. School admin, coordinator, or language department chair signs up.
2. They choose the school/admin setup path.
3. They enter school identity, website, location, school type, grade size, official domains, admin identity, optional integration interests, curriculum context, and possible teacher pre-invites.
4. The request enters a pending-review state.
5. A Lingual admin reviews, approves, or declines the request.
6. Approved school workspace becomes usable for school-beta workflows.

### Business interpretation

- This supports a controlled founder-led pilot motion.
- It gives Lingual a qualification gate before creating school workspaces.
- It is better for beta risk management than open self-serve school creation.

### First value moment

The school moves from a request into an approved workspace with roles and initial setup path.

### Conversion and support risks

- Buyers may expect instant self-serve setup.
- Request approval criteria are not formalized.
- Admin setup copy and emails are English-only.
- School-side ownership is expected to sit with a dedicated school admin, usually a language department chair or administrator chosen by the school.
- Lingual-side support is founder-led for early pilots through issue triage and weekly email check-ins; formal SLA and scalable support process still need to be resolved.

## Journey 2: Teacher joins or starts using a school workspace

### Flow

1. Teacher signs up or signs in.
2. Teacher either enters an invite code or searches for their school.
3. If joining through search, the teacher submits a join request.
4. A school admin approves or declines the request.
5. Teacher lands in the teacher dashboard.
6. Teacher creates or views classes, manages roster access, and begins assignment work.

### Business interpretation

- This enables a teacher-led adoption path inside an approved school.
- Invite codes give schools a simple way to bring teachers in without complex IT setup.
- Admin approval protects the school workspace from uncontrolled teacher access.

### First value moment

Teacher reaches a class dashboard where they can create assignments and invite students.

### Conversion and support risks

- Teacher join approval is not realtime; the pending page polls.
- Search is name-prefix based, not full search.
- Multi-org teacher workflows are limited.
- Reminder emails for stale pending teacher requests are not implemented.

## Journey 3: Teacher creates class and roster

### Flow

1. Teacher opens the dashboard.
2. Teacher creates a class with term, subject, grade band, and learning locale.
3. Teacher generates a class join code.
4. Students enter the code to join.
5. Teacher views roster and removes students when needed.
6. If Canvas is connected, teacher can compare Canvas roster visibility with actual Lingual enrollment.

### Business interpretation

- This creates a low-friction pilot setup path.
- Schools can start with manual setup or Canvas LMS workflows without SIS integration.
- Canvas-aware roster views make the product feel aligned with school workflow even before deep roster automation.

### First value moment

Teacher sees students in a class and can assign practice.

### Conversion and support risks

- CSV import and bulk/email invites are not current.
- Canvas roster sync does not automatically enroll students.
- Canvas roster matching is email-based and can miss students who use different emails.
- Larger schools may require more robust roster administration.

## Journey 4: Teacher creates an assignment

### Flow

1. Teacher selects a class.
2. Teacher opens assignment builder.
3. Teacher chooses a creation mode:
   - Canvas-linked content
   - AI-assisted draft from source packet
   - Manual advanced setup
   - Scaffold-free custom prompt
4. Teacher reviews or edits scenario, objectives, target expressions, target vocabulary, focus grammar, success criteria, teacher notes, language-mix setting, and status.
5. Teacher publishes assignment.
6. Assignment becomes available to enrolled students.

### Business interpretation

- This is the clearest proof that Lingual is teacher-controlled rather than generic AI chat.
- Teachers can start from existing content rather than rebuilding lessons from scratch.
- Assignment authoring is the center of the product's school differentiation.

### First value moment

Teacher sees their lesson intent converted into a practice task students can launch.

### Conversion and support risks

- Teachers may need onboarding examples for writing strong assignment inputs.
- Scaffold-free custom prompts reduce analytics depth by design.
- Shared department libraries and reusable templates are Need to be resolved.
- The product currently assembles behavior before the session; a live mid-session intervention engine is not current.

## Journey 5: Student completes assigned practice

### Flow

1. Student signs in.
2. Student joins a class by code or arrives through LTI.
3. Student sees assignments in the learning area.
4. Student opens an assignment.
5. Assignment page shows practice scope, teacher goals, and launch policy.
6. If voice is allowed, student starts voice practice.
7. If voice is blocked and text fallback is enabled, student can complete text practice.
8. The session produces activity signals for teacher review.

### Business interpretation

- This is the student "aha moment": practicing a real assignment instead of free chat.
- Voice/text fallback gives schools flexibility around consent and cost.
- The practice surface is assignment-bound, which supports teacher confidence.

### First value moment

Student completes a conversation that is visibly tied to teacher goals.

### Conversion and support risks

- Full voice recording and playback are not current.
- Teacher transcript review is not current.
- Practice quality depends on teacher-authored assignment structure.
- Provider usage and cost tracking are still estimated.

## Journey 6: Guardian or school resolves consent

### Flow

1. Teacher or school admin identifies students whose voice/guardian consent state needs attention.
2. Teacher or admin updates consent state directly or issues a guardian consent packet.
3. Guardian opens a secure consent link.
4. Guardian grants or revokes the consent decision.
5. Student practice launch honors the consent state.
6. Admin or teacher can export audit history.

### Business interpretation

- This is important for school trust.
- The product has a real workflow for voice gating rather than a policy-only promise.
- Consent state changes affect actual practice access.

### First value moment

A voice-blocked student becomes eligible for voice practice, or the product safely keeps voice blocked when consent is unresolved.

### Conversion and support risks

- Legal review of COPPA, FERPA, and state biometric-risk assumptions is still needed.
- Guardian handout/notice workflow is not fully productized.
- Disclosure logging is not complete across all sensitive views.
- Parent portal is not part of beta.

## Journey 7: Teacher reviews performance

### Flow

1. Teacher opens class analytics.
2. Teacher filters or reviews assignment and student activity.
3. Teacher opens assignment analytics to see target evidence, objective alignment, rubric signals, and recent attempts.
4. Teacher opens student drill-down to review per-student activity and consent state.
5. Teacher uses evidence to decide follow-up instruction.
6. Upcoming: Lingual's product AI agent creates student and teacher debrief reports from practice evidence.

### Business interpretation

- This is the main ROI story after students practice.
- Teachers can see more than completion: speaking minutes, repeated errors, self-correction, target usage, and rubric evidence.
- The analytics position Lingual as an instructional tool, not only a conversation app.
- AI-generated debrief reporting should make practice evidence easier for students and teachers to understand once the feature is available.
- School admins should receive aggregate pilot and compliance views, not student-level AI debriefs.

### First value moment

Teacher can identify what students practiced and what needs reteaching.

### Conversion and support risks

- Analytics are heuristic and should not be sold as certified scoring.
- Teacher cannot yet view full transcripts or play audio recordings.
- Cross-class trends and richer reporting are limited.
- Model-verified scoring calibration is planned but not current.
- AI debrief reporting is upcoming, not current beta functionality.

## Journey 8: Lingual internal pilot operations

### Flow

1. Lingual admin reviews incoming school requests.
2. Lingual admin approves or declines requests.
3. Lingual admin views organization list and details.
4. Lingual admin can suspend, restore, or inspect audit activity.
5. Internal team uses this to manage beta access.

### Business interpretation

- Supports founder-led sales and controlled beta operations.
- Lets Lingual keep early schools under supervision.
- Gives a starting point for customer-success workflows.

### First value moment

Lingual can approve and manage a school without directly editing production data by hand.

### Conversion and support risks

- Operational playbooks are Need to be resolved.
- Founder-led issue triage and weekly email check-ins are the current early-pilot support posture.
- Formal support SLAs are Need to be resolved.
- Bulk exports and metadata editing are limited.

## Journey 9: Pilot package, payment, upgrade, and renewal

### Flow

1. Lingual offers an initial 2-4 week pilot.
2. The pilot includes 2-3 teachers at the school.
3. Each participating teacher chooses the class level or section they want to pilot first.
4. All students in the chosen class level or selected classes can use the product during the pilot.
5. The school-side pilot owner coordinates participation and feedback.
6. The first pilot is free.
7. If the school wants continued use, Lingual can open a paid extended pilot or paid school subscription discussion.
8. For public-school paths, Lingual should collect survey evidence and compile a report for district/government buyers before pushing a larger adoption conversation.

### Business interpretation

The initial pilot package is defined and free for the first pilots. The likely post-pilot commercial paths are paid extended pilot or paid school subscription. Current product materials still do not define billing, price points, renewal terms, seat limits, or public procurement process. For public schools, the near-term objective is evidence collection: surveys, usage signals, and a Lingual-compiled report for district/government buyers. Detailed report contents should be defined later during survey/report design. Korea public education purchase process still requires research.

### Needed decisions

- Exact paid extended pilot terms.
- Exact school subscription package.
- Seat-based vs class-based vs school-based pricing.
- Voice-minute overage policy.
- Procurement owner and contract model, especially for public schools and Korea district/government buyers.
- Renewal success metric.
