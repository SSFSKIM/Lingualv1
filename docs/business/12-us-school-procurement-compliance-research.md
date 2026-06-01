# US School Procurement And Compliance Research

Status: Research draft
Last updated: 2026-06-01

## Purpose

This document summarizes what Lingual needs to understand before pursuing United States school adoption for AI-powered speaking and conversational language practice.

It focuses on public schools, districts, independent schools, student-data expectations, pilots, and procurement friction. It is not legal advice and should not be used as a final compliance checklist.

## Research Scope

- Public middle and high schools.
- Independent schools.
- ESL / ELD programs.
- World-language departments.
- District purchasing and school-level pilots.
- FERPA, COPPA, student-data agreements, privacy policies, and AI/minor-data friction.
- Vendor security review expectations.
- LMS, roster, SSO, and integration expectations.

## Executive Summary

US public-school sales are not simply teacher-led sales once student data is involved. A teacher can become the champion, but district approval, student-data review, security review, and a written privacy/procurement path often determine whether a pilot can happen.

The practical implication for Lingual is that the first US public-school pilot packet should look more mature than the product itself. Before asking schools to use Lingual with students, Lingual should prepare a privacy policy, student-data agreement path, COPPA school-consent explanation, FERPA school-official language, subprocessors list, AI data-use statement, retention/deletion policy, security summary, incident-response posture, and answers to common K-12 vendor-risk questions.

Independent schools should be faster than public districts, but not frictionless. They may not always follow the same district procurement process, but technology directors, administrators, business officers, parents, and cyber-insurance requirements can still create privacy and contract review.

## Public School Buyer Path

Likely buyer path:

1. Teacher, department chair, or program lead becomes interested.
2. School administrator sponsors a limited pilot.
3. District curriculum, ELD/world-language, technology, privacy, or procurement stakeholders review the product.
4. Student-data agreement, privacy terms, and security review are completed.
5. Free pilot, quote, purchase order, board approval, cooperative contract, small-purchase path, or RFP path is selected depending on district rules and spending threshold.

Business interpretation:

- Teachers are often champions, not final buyers.
- A free pilot may still require privacy approval if student data is used.
- The pilot should be framed as a scoped beta with clear data boundaries, not as an unreviewed classroom experiment.
- The most likely first public-school motion is founder-led: teacher interest -> school sponsor -> district privacy/security review -> pilot report -> paid extended pilot or school/district purchase.

## Independent School Buyer Path

Independent schools may be more practical for early US pilots because approval can be school-level rather than district-wide.

Likely stakeholders:

- Language department chair.
- Academic dean or division head.
- School administrator.
- Technology director.
- Business manager / CFO.
- Counsel or outside contract reviewer, depending on school size.

Business interpretation:

- Independent schools can move faster, but "free" does not mean review-free.
- A credible privacy/security packet will help the teacher champion persuade school leadership.
- Independent-school pilots should still document student-data handling, parent-facing risk, AI use, and deletion after pilot.

## FERPA, COPPA, And Student Data

Confirmed points:

- Under FERPA, schools using online tools with education-record data should check district approval. Vendors handling education-record PII under the school-official exception must be under school control and use data only for authorized educational purposes. Source: [Student Privacy Policy Office FERPA FAQ](https://studentprivacy.ed.gov/faq/i-want-use-online-tool-or-application-part-my-course-however-i-am-worried-it-violation-ferpa).
- Under COPPA, schools can consent for students under 13 only when the service is for educational use and not for another commercial purpose. The vendor remains responsible for COPPA compliance and must provide direct notice, support access/deletion, and avoid unauthorized data use. Source: [FTC COPPA FAQ](https://www.ftc.gov/tips-advice/business-center/guidance/complying-coppa-frequently-asked-questions).
- The FTC's 2025 COPPA amendments tightened children's data rules, including retention limits and treatment of biometric identifiers. Source: [FTC 2025 COPPA update](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data).
- Student-data agreements are a normal procurement gate. The SDPC National Data Privacy Agreement is designed to standardize district-vendor expectations, with state addenda layered on top. Source: [SDPC National DPA](https://privacy.a4l.org/national-dpa/).

Lingual interpretation:

- Lingual should avoid describing itself as a general consumer AI chatbot for students.
- Safer framing: teacher-controlled speaking practice with school-managed data, consent, and reporting.
- Lingual should explicitly state whether student prompts, transcripts, audio, feedback, and usage data are used for model training.
- Voice/audio data is likely to be the highest-friction data category. Even if Lingual does not store raw audio by default, schools will ask what is streamed, transcribed, retained, sent to model providers, visible to teachers, and deleted after pilot.

## AI-Specific Procurement Friction

AI-specific concerns likely include:

- Whether student data is used to train foundation models.
- Whether student voice/audio creates biometric or sensitive-data concerns.
- Whether AI feedback is explainable enough for teachers.
- Whether generated content can be inappropriate, biased, or misaligned with school curriculum.
- Whether students can use the tool outside teacher-defined boundaries.
- Whether parents can understand what data is collected and why.
- Whether the vendor can delete student data after pilot.
- Whether teachers can review student-facing outputs.

Business interpretation:

- Lingual should sell "controlled speaking practice," not open-ended AI access.
- A strong AI data-use statement may become a sales asset.
- "No raw audio storage by default" and "teacher-defined practice objectives" should be treated as commercial trust points if they are operationally true.

## Vendor Review And Integration Expectations

Common vendor-review expectations:

- Privacy policy and student-data terms.
- Student-data agreement / DPA path.
- Subprocessor list.
- Security summary.
- Incident-response posture.
- Data retention and deletion policy.
- Accessibility posture, ideally VPAT or roadmap.
- W-9, quote, invoice, and purchase-order readiness.
- K-12 vendor-risk questionnaire answers, such as CoSN's K-12CVAT. Source: [CoSN K-12CVAT](https://www.cosn.org/tools-and-resources/resource/k-12cvat/).

Integration expectations:

- Canvas or LTI can help, but does not replace procurement readiness.
- 1EdTech recommends certified LTI / LTI Advantage requirements in procurement language, including Assignment and Grade Services, Deep Linking, and Names and Role Provisioning. Source: [1EdTech LTI RFP guidance](https://www.1edtech.org/standards/lti/suggested-lti-advantage-requirements-rfps).
- Clever and ClassLink show why districts often prefer controlled roster/SSO flows over ad hoc CSVs. Sources: [Clever rostering](https://www.clever.com/products/rostering), [ClassLink Roster Server](https://www.classlink.com/products/roster-server).
- Google Classroom integrations require OAuth and admin control; Google states Classroom API data cannot be used for advertising. Source: [Google Classroom API authorization help](https://support.google.com/edu/classroom/answer/6253304?hl=en).

Competitor signals:

- Speakable publicly supports DPAs, purchase orders, quotes, Google Classroom, Clever, LTI, and school privacy language. Sources: [Speakable pricing](https://www.speakable.io/pricing), [Speakable privacy center](https://www.speakable.io/privacy-center).
- Extempore positions LMS integration, auto-rostering, assignment linking, and two-way grade sync as core school features. Source: [Extempore](https://extemporeapp.com/).

## Pilot Implications

Pilots should be structured as procurement evidence, not casual trials.

Pilot packet should include:

- Pilot scope: school, teacher count, class sections, student count, and dates.
- Data scope: what data is collected, retained, shared, and deleted.
- AI scope: what AI does and does not do.
- Teacher control: what the teacher configures or reviews.
- Support plan: founder-led issue triage and weekly email check-ins.
- Feedback plan: teacher and student pre/post surveys.
- Outcome report: usage, speaking time, average session length, satisfaction, friction, sample debriefs, and expansion interest.

Digital Promise's district pilot research emphasizes a clear pilot goal, timeline, procurement plan, stakeholder transparency, and teacher/student feedback. Source: [Digital Promise edtech pilot report](https://digitalpromise.org/reportsandresources/ed-tech-pilot-report/).

Lingual interpretation:

- Free public-school pilots should still be treated as formal pilots with data and approval boundaries.
- Manual setup or light Canvas support is acceptable only if framed as a scoped beta pilot, not a district-wide deployment promise.
- Paid extended pilots or school subscriptions will require stronger procurement readiness.

## Implications For Lingual

Ready to use now:

- Founder-led pilots.
- Teacher-controlled, limited-class pilot scope.
- Survey-based reporting.
- Manual setup or light Canvas workflow, if clearly framed as beta.

Needs preparation before public-school pilots:

- Privacy policy suitable for school review.
- Student-data agreement path.
- FERPA/COPPA explanation.
- AI data-use statement.
- Retention/deletion policy.
- Subprocessor list.
- Security summary.
- Basic vendor questionnaire answers.
- Parent/school-facing explanation of audio, transcript, and AI-feedback handling.

Should not be claimed yet unless operationally true:

- District-ready deployment.
- Enterprise security readiness.
- FERPA/COPPA compliance as a broad legal guarantee.
- Full LMS/SSO/rostering support.
- No student-data risk.

Likely strongest US positioning:

> Teacher-controlled AI speaking practice for language classrooms, with school-managed data, measurable speaking time, and pilot-ready reporting.

## Unresolved Questions

- What minimum privacy documentation should Lingual prepare before public-school pilots?
- Which student-data agreement templates or state privacy alliances are most relevant for DC, Maryland, and Virginia?
- How should Lingual handle under-13 students if elementary or middle-school pilots are considered?
- What integration level is acceptable for the first pilot: manual setup, CSV roster, Google Classroom, Canvas, Clever, ClassLink, or LTI?
- What procurement path is realistic for free pilots versus paid extended pilots or school subscriptions?
- Should Google Classroom, Clever, or ClassLink outrank deeper Canvas work for US K-12 pilots?
- Can Lingual complete K-12CVAT credibly before SOC 2?
- What insurance levels will schools require?
- What exact student-data and AI terms require legal counsel before pilots?

## Source Notes

- [Student Privacy Policy Office FERPA FAQ](https://studentprivacy.ed.gov/faq/i-want-use-online-tool-or-application-part-my-course-however-i-am-worried-it-violation-ferpa)
- [FTC COPPA FAQ](https://www.ftc.gov/tips-advice/business-center/guidance/complying-coppa-frequently-asked-questions)
- [FTC 2025 COPPA update](https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data)
- [SDPC National Data Privacy Agreement](https://privacy.a4l.org/national-dpa/)
- [State Student Privacy Law Comparison](https://publicinterestprivacy.org/resources/state-student-privacy/)
- [CoSN K-12CVAT](https://www.cosn.org/tools-and-resources/resource/k-12cvat/)
- [CoSN / Council of the Great City Schools AI readiness checklist](https://www.cosn.org/cosn-news/council-of-the-great-city-schools-cosn-launch-k-12-generative-artificial-intelligence-gen-ai-readiness-checklist/)
- [Digital Promise edtech pilot report](https://digitalpromise.org/reportsandresources/ed-tech-pilot-report/)
- [ATLIS vendor vetting guidance](https://theatlis.org/page/managing-vendors-and-vetting-new-products)
- [1EdTech LTI Advantage RFP guidance](https://www.1edtech.org/standards/lti/suggested-lti-advantage-requirements-rfps)
- [Clever rostering](https://www.clever.com/products/rostering)
- [ClassLink Roster Server](https://www.classlink.com/products/roster-server)
- [Google Classroom API authorization help](https://support.google.com/edu/classroom/answer/6253304?hl=en)
- [Speakable pricing](https://www.speakable.io/pricing)
- [Speakable privacy center](https://www.speakable.io/privacy-center)
- [Extempore](https://extemporeapp.com/)
