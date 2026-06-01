# Product Tear-Down v1

Status: Research draft
Last updated: 2026-06-01

## Purpose

This document is the first product teardown pass for priority competitors.

The prior market research answered who the competitors are and how they position themselves. This document asks a narrower product question:

> What competitor workflows are actually visible for teachers and students, and what does that imply for Lingual's product direction?

This is based on publicly available product pages, help centers, demos, guides, and research sources. If an area is only supported by marketing copy, it is scored lower.

Detailed competitor-by-competitor evidence from the parallel research pass is
captured in [16-product-teardown-deep-dives.md](./16-product-teardown-deep-dives.md).

## Executive Summary

The product gap is not "AI speaking practice." Competitors already cover speaking prompts, pronunciation feedback, roleplays, oral exams, rubrics, dashboards, and school integrations.

The more interesting gap is:

> The full practice-to-evidence loop: teacher objective -> assigned conversation -> natural student speaking -> useful student debrief -> teacher-visible class evidence -> pilot/admin report.

Early pattern:

- Korea competitors appear strong around assessment evidence, teacher workload, and public-sector/platform channels.
- US competitors appear stronger around LMS/rostering/procurement workflows and teacher review surfaces.
- Very few competitors publicly show a mature, teacher-authored, open-ended conversation assignment workflow that is both natural for students and useful as class-level evidence.

## Evidence Score Key

| Score | Meaning |
| --- | --- |
| 0 | No evidence found. |
| 1 | Marketing claim only. |
| 2 | Concrete feature evidence, but workflow unclear. |
| 3 | Workflow visible through docs/screens/demo. |
| 4 | Workflow appears mature and school-ready. |
| 5 | Workflow appears mature, school-ready, and strongly differentiated. |

## Product Coverage Matrix

| Product | Assignment creation | Student conversation UX | Feedback / debrief | Teacher dashboard | Integration / admin | Evidence artifact | Product read |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Plang School | 3 | 2 | 4 | 3 | 4 | 5 | Strong Korea assessment/evidence competitor; open-ended multi-turn conversation depth still unclear. |
| LG CNS Speaking Class | 3 | 2 | 3 | 2 | 4 | 3 | Strong institutional/platform signal; current product workflow evidence is still thin. |
| EBS AI PengTalk | 2 | 3 | 3 | 3 | 4 | 2 | Strong public elementary speaking baseline; teacher authoring and rich debrief are limited. |
| YBM / Visang AIDT | 4 | 2 | 4 | 4 | 4 | 4 | Strong textbook/platform workflow; conversation-native depth versus Lingual remains the gap. |
| Speakable | 4 | 3 | 4 | 4 | 5 | 4 | Strongest public US workflow evidence for assignment, auto-feedback, review, LMS, and gradebook. |
| Speakology AI | 4 | 4 | 4 | 4 | 4 | 4 | Strongest visible AI conversation/oral exam workflow, with credible Canvas/institution evidence. |
| Telo AI | 2 | 4 | 3 | 3 | 4 | 3 | Strong ELL speaking-time and procurement wedge; teacher assignment builder and dashboard proof are less visible publicly. |
| Extempore | 4 | 3 | 4 | 4 | 5 | 4 | Strong oral assessment/language-lab workflow; not primarily adaptive AI conversation. |
| Nualang | 4 | 3 | 3 | 3 | 4 | 3 | Strong teacher-created roleplay/chatbot workflow; curriculum-intelligence depth is weaker than activity packaging. |
| ELSA Schools | 3 | 3 | 4 | 4 | 3 | 3 | Strong pronunciation assignment/dashboard workflow; conversation is more roleplay/pronunciation than curriculum-controlled dialogue. |

## Korea Product Tear-Down

### Plang School

Evidence:

- Plang School presents itself as AI-supported class and assessment, with teacher and student login flows. It covers writing, reading, speaking, and listening. Source: [Plang School](https://edu.plang.ai/school).
- Speaking is framed around content and pronunciation feedback, repeated practice, and speaking assessment. Source: [Plang School speaking section](https://edu.plang.ai/school).
- The product emphasizes AI + teacher feedback, handwriting scoring, real-time quizzes, reading scaffolding, listening assessment, and student-record-style activity evidence. Source: [Plang School](https://edu.plang.ai/school).

Workflow read:

- Assignment creation: visible enough to infer teacher-facing assessment/activity setup, but public docs do not show a complete assignment builder for speaking.
- Student UX: likely structured practice and assessment rather than fully open-ended conversation.
- Feedback/debrief: strong. Plang emphasizes AI feedback + teacher feedback and speaking content/pronunciation feedback.
- Dashboard: likely teacher-centered, but class-decision dashboard evidence is mostly screenshots/marketing.
- Evidence artifact: strongest Korea evidence. Student activity evidence and student-record-style outputs are very relevant for Korean schools.

Lingual implication:

Plang is the product to beat on Korean school vocabulary. Lingual should not copy Plang's broad four-skill assessment suite. Lingual should instead make the speaking workflow deeper: teacher-designed conversation objectives, more natural interaction, clearer transcript/debrief evidence, and pilot reports.

### LG CNS Speaking Class / AI Tutor

Evidence:

- LG CNS Speaking Class is described as an AI English conversation app where AI analyzes pronunciation, speech speed, and answer similarity on a five-step scale. Source: [Asia Business Daily on LG CNS Speaking Class](https://view.asiae.co.kr/en/article/2022092208110917216).
- A key differentiator is that teachers can create their own English learning content through a teacher-oriented creation site; when teachers input English dialogues, AI processes them into app content. Source: [Asia Business Daily on LG CNS Speaking Class](https://view.asiae.co.kr/en/article/2022092208110917216).

Workflow read:

- Assignment creation: strong conceptually because teachers can input dialogues and generate content.
- Student UX: appears structured dialogue/pronunciation/similarity practice, not clearly open-ended adaptive conversation.
- Feedback/debrief: scoring exists for pronunciation, speed, and similarity; detailed debrief format is unclear.
- Dashboard: public evidence is weak.
- Integration/admin: strong public-sector and education-office signal from previous research, but actual product workflow docs are limited.

Lingual implication:

LG CNS validates teacher-created conversation content as an important Korean feature. Lingual should match the idea of teacher-authored content, but differentiate by making the assignment objective, student conversation transcript, and teacher evidence more visible.

### EBS AI PengTalk

Evidence:

- EBS AI PengTalk is studied as an elementary English AI speaking application, with classroom use tied to speaking and learning attitude. Source: [EBS AI PengTalk case study](https://www.ejournal-stem.org/journal/view.php?number=573&viewtype=pubreader).
- Research reports positive effects on confidence, interest, engagement, and some speaking outcomes, but also notes speech-recognition discomfort and lack of systematic usage roadmap. Source: [EBS AI PengTalk case study](https://www.ejournal-stem.org/journal/view.php?number=573&viewtype=pubreader).
- Another study frames educational chatbot needs as voice recognition accuracy, feedback, meaning negotiation, interest, and LMS; it finds PengTalk has weaknesses across these functions despite satisfactory voice recognition. Source: [Kyobo Scholar abstract](https://scholar.kyobobook.co.kr/article/detail/4010028663725).

Workflow read:

- Assignment creation: weak. PengTalk is more student app/public companion than teacher assignment platform.
- Student UX: relatively strong elementary speaking/gamified chatbot baseline.
- Feedback/debrief: basic AI feedback exists, but depth and teacher usefulness are limited.
- Dashboard: weak public evidence for teacher class-decision workflow.
- Evidence artifact: weak compared with Plang or US assessment tools.

Lingual implication:

PengTalk is not the model for Lingual's target workflow. It sets the public-school expectation that AI speaking exists, but Lingual can be more teacher-controlled, older-learner appropriate, and evidence-producing.

### YBM / Visang AI Digital Textbook Ecosystem

Evidence:

- Visang's English AI Digital Textbook guide describes AI-supported pronunciation analysis/correction, speaking/writing practice, and grammar correction. Source: [Visang AI English Digital Textbook guide](https://dn.vivasam.com/vs/aidtsc/guide/AI%20%EC%98%81%EC%96%B4%20%EB%94%94%EC%A7%80%ED%84%B8%EA%B5%90%EA%B3%BC%EC%84%9C%20%EC%82%AC%EC%9A%A9%20%EC%84%A4%EB%AA%85%EC%84%9C_%EB%B9%84%EC%83%81%EA%B5%90%EC%9C%A1.pdf).
- A YBM AI Digital Textbook teacher manual signal indicates AI assistant class monitoring, daily class analysis, activity records, content recommendations for future lessons, and AI-customized homework for students needing attention. Source: [YBM AI Digital Textbook teacher manual PDF](https://padlet-uploads.storage.googleapis.com/2076865518/1e84ccb04e6db9a7a107f97d281426c6/4__YBM________4________________1__YBM___.pdf).

Workflow read:

- Assignment creation: likely strong inside textbook/platform context.
- Student UX: AI speaking/listening appears embedded into textbook activities, not necessarily open conversation.
- Feedback/debrief: AI feedback and analytics appear present.
- Dashboard: likely strong for textbook-linked monitoring and homework generation.
- Integration/admin: strong because AIDT is embedded in public-school digital textbook policy.
- Evidence artifact: likely useful for class operation, but exact speaking evidence format needs deeper review.

Lingual implication:

AIDT products are serious workflow competitors but may be too broad and textbook-bound. Lingual should be the specialized speaking layer: faster pilots, richer conversation, better debriefs, and curriculum/textbook flexibility.

## United States Product Tear-Down

### Speakable

Evidence:

- Teacher assignment creation is documented: after creating an activity, teachers publish it, set title, subject, language, folders, visibility, and assign to classes or teams. Source: [Speakable publish and assign guide](https://intercom.help/speakable_io/en/articles/13240164-how-to-publish-and-assign-an-activity).
- Speakable classroom setup supports Google Classroom, Clever, manual join links, and LTI integrations, with LTI supporting classroom creation, roster syncing, assignment syncing, and grade passback. Source: [Speakable classroom setup guide](https://intercom.help/speakable_io/en/articles/11066854-how-to-set-up-classrooms-and-add-students).
- Auto-grading supports manual, pass/fail, rubric, and standards-based methods, including ACTFL/WIDA/custom proficiency levels; students can receive instant feedback in Practice Mode. Source: [Speakable auto-grading guide](https://intercom.help/speakable_io/en/articles/11067405-how-to-grade-and-give-feedback-automatically).
- Review workflow includes board/matrix/list views, audio playback, transcript and grammar insights, score details, feedback, chat history, class performance per prompt, and teacher score adjustment. Source: [Speakable reviewing submissions guide](https://intercom.help/speakable_io/en/articles/11933314-guide-reviewing-student-submissions).
- Student guide shows repeat, written response, and open spoken response page types, with audio listening, recording, and submission flow. Source: [Speakable student guide](https://intercom.help/speakable_io/en/articles/13764681-how-to-complete-an-assignment-in-speakable-student-guide).

Workflow read:

- Assignment creation: strong and visible.
- Student UX: structured speaking/writing tasks, recordings, repeat/open spoken responses; less evidence of natural realtime conversation in the standard flow.
- Feedback/debrief: strong for rubric, grammar, proficiency, model response, and teacher review.
- Dashboard: strong. Board/matrix/list views and prompt-level review are class-decision useful.
- Integration/admin: strongest in the set.

Lingual implication:

Speakable is the benchmark for school-ready workflow. Lingual should not try to out-Speakable Speakable on assessment workflow first. Lingual should combine enough of this review/reporting rigor with a more natural conversation experience.

### Speakology AI

Evidence:

- Teachers can create custom conversation topics in the teacher dashboard, add vocabulary and example questions, then save and assign. Source: [Speakology docs](https://speakology.ai/docs).
- Oral exams allow teachers to create questions, choose/upload rubrics, and configure criteria; students interact with the AI instructor in a video-call-like conversation. Source: [Speakology oral exams](https://speakology.ai/features/oral-exams).
- Speakology reports transcripts, completion status, grades, vocabulary used, highlighted grammar, timestamps, time spent, and teacher dashboard/gradebook access. Source: [Speakology docs](https://speakology.ai/docs).
- Yale describes the Canvas integration as individualized speaking time with an AI avatar and instant grammar/pronunciation/fluency feedback. Source: [Yale Speakology AI page](https://poorvucenter.yale.edu/teaching/canvas-yale/instructional-tools/speakology-ai).

Workflow read:

- Assignment creation: strong for conversation topics and oral exams.
- Student UX: strongest visible natural conversation UX among US competitors because the product centers video-call-like AI interaction.
- Feedback/debrief: strong: transcripts, grades, vocabulary, grammar highlights, instant feedback.
- Dashboard: strong enough for progress review, though exact class-level analytics depth needs deeper access.
- Integration/admin: Canvas evidence is strong; broader K-12 rostering depth less clear than Speakable.

Lingual implication:

Speakology is closest to Lingual's conversational wedge. Lingual's differentiation must be school-safe teacher boundaries, curriculum objective control, non-avatar simplicity if desired, and stronger pilot reporting.

### Telo AI

Evidence:

- Telo offers robot and web experiences, both with a teacher dashboard; apps include ELL/English, Ask Telo, and foreign languages. Source: [Telo AI](https://mytelo.ai/).
- It lists five classroom modes: conversation, lesson practice, role play, skill training, and ask/learn. Source: [Telo AI](https://mytelo.ai/).
- Telo says sessions start from prompts, fit any curriculum/textbook, and track vocabulary growth, session length, error types, and standards mapping. Source: [Telo AI](https://mytelo.ai/).
- It claims FERPA compliance, no model training on student data, and Clever/ClassLink integrations. Source: [Telo AI](https://mytelo.ai/).

Workflow read:

- Assignment creation: partially visible. Teachers choose mode/goals/topics, but public docs do not show a detailed assignment builder.
- Student UX: strong conceptually for voice-first realtime practice.
- Feedback/debrief: promising, with AI insights, vocabulary growth, session length, error types, and standards mapping.
- Dashboard: promising but not deeply documented publicly.
- Integration/admin: strong claims around Clever/ClassLink and student-data posture.

Lingual implication:

Telo is a strong ELL competitor, but its public evidence is more positioning/demo than help-center workflow. Lingual can compete with a lower-friction software-only pilot and clearer assignment creation/debrief outputs.

### Extempore

Evidence:

- Extempore supports common rubrics, district/institution rubrics, teacher-created rubrics, shared rubrics, global rubrics, and standardized rubrics for AP/WIDA/TELPAS. Source: [Extempore rubrics guide](https://help.extemporeapp.com/en/articles/8321745-rubrics-on-extempore).
- Rubrics can attach to non-multiple-choice questions, and teachers score responses in the gradebook. Source: [Extempore rubrics guide](https://help.extemporeapp.com/en/articles/8321745-rubrics-on-extempore).
- Extempore homepage emphasizes interpersonal skills, recording student conversations, teacher drop-in for groups, target-language feedback, LMS integrations, immediate grade sync, common assessments, rubrics, and data reporting. Source: [Extempore](https://extemporeapp.com/).
- Platform updates mention export reports by rubric criteria, customizable response type by question, student navigation warnings, and admin dashboard improvements. Source: [Extempore platform updates](https://help.extemporeapp.com/en/articles/5702100-platform-updates).

Workflow read:

- Assignment creation: strong for assessment setup and rubrics.
- Student UX: strong for recorded/live interpersonal assessment, but less like adaptive AI conversation.
- Feedback/debrief: strong assessment feedback and rubric criteria reporting.
- Dashboard: strong for gradebook/admin/reporting.
- Integration/admin: strongest with LMS/grade sync across multiple systems.

Lingual implication:

Extempore is the benchmark for oral assessment workflow. Lingual should not become assessment-only; it should own practice-before-assessment and then produce evidence that can flow into grading or reporting.

### Nualang

Evidence:

- Teachers can create custom roleplays from scratch, choose language, title, description, difficulty, image, Nuala name/voice, teacher preferences, conversation content, comprehension questions, preview/play, and review reports. Source: [Nualang roleplay guide](https://nualang.com/blog/create-a-roleplay-exercise/).
- Nualang supports listening, translation, pronunciation, roleplay, chatbot activities, word bank, dialects, voice speed, immediate feedback, classroom management, progress tracking, reports, listening to pronunciation attempts, and teacher feedback. Source: [Nualang features](https://nualang.com/features/).
- Nualang's AI-generated content helps teachers create custom roleplays, phrases, and chatbot exercises; teachers can modify or omit generated content. Source: [Nualang features](https://nualang.com/features/).
- Wayside's AI safety page says AI features are designed to be teacher-controlled and can be enabled/disabled at activity or class level. Source: [Wayside AI safety and trust](https://www.waysidepublishing.com/digital-solutions/ai-safety-and-trust).

Workflow read:

- Assignment creation: strong for roleplays and content customization.
- Student UX: likely structured roleplay/chatbot, fun and scaffolded; natural open conversation depth unclear.
- Feedback/debrief: immediate corrective feedback and reports exist.
- Dashboard: useful for exercise reports/progress and pronunciation attempts, but less evidence for admin/district decision making.
- Integration/admin: weaker than Speakable/Extempore.

Lingual implication:

Nualang is the teacher-authored roleplay benchmark. Lingual should match the ease of creating scenarios while going deeper on realtime voice conversation, debrief, and school/pilot evidence.

### ELSA Schools

Evidence:

- ELSA Schools positions unlimited speaking practice with realtime AI feedback for K-12 and institutions. Source: [ELSA Schools](https://elsaspeak.com/en/enterprise/schools).
- It says teachers can build practice tasks from existing materials, track growth, share reports with parents/leadership, use AI roleplays aligned to syllabus, and monitor exam readiness aligned to IELTS and CEFR. Source: [ELSA Schools](https://elsaspeak.com/en/enterprise/schools).
- ELSA for Teachers emphasizes an interactive dashboard, automated tests, progress tracking, total practice time, pronunciation/intonation/fluency/word stress/listening feedback, and estimated IELTS speaking score. Source: [ELSA for Teachers](https://business.elsaspeak.com/elsa-for-pronunciation-class).
- A dashboard admin guide shows assignment creation, skill/topic filtering, due dates, reminders, assignment library, learner progress statuses, immediate learner scores, activity reports, detailed progress, time tracking, and assessment reports. Source: [ELSA Dashboard Admin Guide](https://www.scribd.com/document/700576398/en-ELSA-Dashboard-Admin-Guide-v5-1).

Workflow read:

- Assignment creation: strong for assigning existing ELSA lessons/study sets and filtering by skill/topic/difficulty.
- Student UX: strong pronunciation/speaking practice; less evidence for teacher-authored open-ended conversation.
- Feedback/debrief: strong pronunciation/fluency/intelligibility feedback.
- Dashboard: strong for progress, time, assignment status, reports.
- Integration/admin: organization dashboard exists; K-12 LMS/rostering details less public than Speakable.

Lingual implication:

ELSA sets the table stakes for speech feedback. Lingual should not position pronunciation as the core wedge. It should use pronunciation feedback as supporting value inside a broader conversation assignment and debrief flow.

## Coverage By Market

### Korea

| Product area | Strongest current competitor evidence | Lingual opportunity |
| --- | --- | --- |
| Process assessment / student evidence | Plang School | Add richer speaking transcripts, debriefs, and pilot evidence without becoming a broad four-skill assessment suite. |
| Teacher-created speaking content | LG CNS Speaking Class | Make teacher objective -> conversation -> evidence more transparent and flexible. |
| Public elementary AI speaking | EBS AI PengTalk | Focus on older students and teacher-controlled class workflows. |
| Textbook/platform monitoring | YBM / Visang AIDT | Stay curriculum-compatible without becoming a textbook platform. |
| Pronunciation/scoring | Plang, LG CNS, AIDT vendors | Treat pronunciation as table stakes, not the main claim. |

### United States

| Product area | Strongest current competitor evidence | Lingual opportunity |
| --- | --- | --- |
| School-ready assignment/review workflow | Speakable | Add more natural realtime conversation while retaining review/report discipline. |
| AI conversation/oral exam | Speakology AI | Compete through teacher control, school-safe boundaries, and curriculum-tied reporting. |
| ELL 1:1 speaking practice | Telo AI | Offer web-first, lower-friction pilot setup with strong debriefs and metrics. |
| Oral assessment/language lab | Extempore | Own practice-before-assessment, not assessment-only submission workflows. |
| Teacher-created roleplay/chatbot | Nualang | Pair scenario authoring with deeper voice conversation and class evidence. |
| Pronunciation/speech engine | ELSA Schools | Use pronunciation feedback as a component, not the category. |

## Lingual Product Implications

### Build Toward This Product Loop

Lingual's strongest product direction is:

1. Teacher selects curriculum objective, scenario, target expressions, proficiency level, and success criteria.
2. Student completes a natural AI conversation around that objective.
3. Student receives immediate debrief: strengths, missed expressions, transcript highlights, next practice.
4. Teacher sees class evidence: completion, speaking time, transcript excerpts, common errors, objective coverage, students needing follow-up.
5. Pilot/admin report summarizes usage, satisfaction, speaking yield, implementation friction, and sample evidence.

### Product Features That Look Table Stakes

- Teacher assignment builder.
- Student microphone setup and retry flow.
- AI feedback after speaking.
- Transcript or response evidence.
- Teacher review surface.
- Class progress view.
- Rubric or criteria support.
- LMS/roster path or clear manual pilot path.
- Data retention and deletion explanation.

### Product Features That Could Differentiate Lingual

- Teacher-authored open-ended conversation, not only recorded responses.
- Curriculum-objective traceability.
- Debrief output designed for both student learning and teacher evidence.
- Speaking-time/yield reporting as a first-class metric.
- Pilot report generation for school administrators.
- Korea-specific process-assessment vocabulary without copying Plang's broad assessment suite.
- US-specific privacy-safe pilot workflow without overclaiming district readiness.

## Recommended Roadmap Responses

### Near-Term Product

- Prioritize an assignment creation flow that lets teachers define objective, scenario, target vocabulary/expressions, level, and practice constraints.
- Make student debrief visible and exportable enough for teachers to trust.
- Build a class-level evidence dashboard around speaking time, completion, average session length, transcript snippets, and common issues.
- Keep pilot reporting in the product workflow, not as a manual afterthought.

### Near-Term Research

- Collect screenshots/video evidence for Plang School teacher assignment creation, if accessible through trial or demo.
- Request or inspect LG CNS Speaking Class teacher creation workflow.
- Inspect AIDT teacher manuals more deeply, especially YBM/Visang speaking/listening flows and dashboard outputs.
- Watch or request Speakology oral exam demos to evaluate conversation naturalness.
- Test or view Speakable's simulated conversation and open spoken response flows.
- Review Extempore's student recording/live interpersonal flow and gradebook.

### Sales Claims To Use Carefully

Sales-safe:

- Teacher-controlled pilot.
- Curriculum-aligned speaking practice.
- Speaking-time and usage reporting.
- Student/teacher survey loop.
- AI debrief as an upcoming evidence layer.

Avoid until proven:

- Better than Plang for Korean process assessment.
- District-ready US deployment.
- Full LMS/SSO/rostering support.
- Formal FERPA/COPPA/Korea compliance.
- Complete pronunciation engine superiority.
- Full admin dashboard comparable to Speakable, Extempore, or ELSA.

## Open Questions

- Can Plang School teachers author open-ended conversation assignments, or are speaking tasks mostly structured feedback/assessment?
- Can LG CNS teacher-created dialogue content support adaptive open-ended conversation?
- Which AIDT vendors have the strongest speaking/listening assignment workflow?
- Does Speakable's simulated conversation flow materially overlap with Lingual's intended conversation experience?
- How natural are Speakology AI's video-call conversations in classroom noise and normal student behavior?
- Does Telo provide teacher-authored prompts at assignment level or mostly student-initiated prompts/modes?
- Which competitor dashboard best supports real class decisions rather than only grading?
- What should Lingual's debrief artifact look like visually and structurally?

## Source Notes

- [Plang School](https://edu.plang.ai/school)
- [LG CNS Speaking Class article](https://view.asiae.co.kr/en/article/2022092208110917216)
- [EBS AI PengTalk case study](https://www.ejournal-stem.org/journal/view.php?number=573&viewtype=pubreader)
- [EBS PengTalk limitations study abstract](https://scholar.kyobobook.co.kr/article/detail/4010028663725)
- [Visang AI English Digital Textbook guide](https://dn.vivasam.com/vs/aidtsc/guide/AI%20%EC%98%81%EC%96%B4%20%EB%94%94%EC%A7%80%ED%84%B8%EA%B5%90%EA%B3%BC%EC%84%9C%20%EC%82%AC%EC%9A%A9%20%EC%84%A4%EB%AA%85%EC%84%9C_%EB%B9%84%EC%83%81%EA%B5%90%EC%9C%A1.pdf)
- [YBM AI Digital Textbook teacher manual PDF](https://padlet-uploads.storage.googleapis.com/2076865518/1e84ccb04e6db9a7a107f97d281426c6/4__YBM________4________________1__YBM___.pdf)
- [Speakable publish and assign guide](https://intercom.help/speakable_io/en/articles/13240164-how-to-publish-and-assign-an-activity)
- [Speakable classroom setup guide](https://intercom.help/speakable_io/en/articles/11066854-how-to-set-up-classrooms-and-add-students)
- [Speakable auto-grading guide](https://intercom.help/speakable_io/en/articles/11067405-how-to-grade-and-give-feedback-automatically)
- [Speakable review guide](https://intercom.help/speakable_io/en/articles/11933314-guide-reviewing-student-submissions)
- [Speakable student guide](https://intercom.help/speakable_io/en/articles/13764681-how-to-complete-an-assignment-in-speakable-student-guide)
- [Speakology docs](https://speakology.ai/docs)
- [Speakology oral exams](https://speakology.ai/features/oral-exams)
- [Yale Speakology AI page](https://poorvucenter.yale.edu/teaching/canvas-yale/instructional-tools/speakology-ai)
- [Telo AI](https://mytelo.ai/)
- [Extempore](https://extemporeapp.com/)
- [Extempore rubrics guide](https://help.extemporeapp.com/en/articles/8321745-rubrics-on-extempore)
- [Extempore platform updates](https://help.extemporeapp.com/en/articles/5702100-platform-updates)
- [Nualang features](https://nualang.com/features/)
- [Nualang roleplay guide](https://nualang.com/blog/create-a-roleplay-exercise/)
- [Wayside AI safety and trust](https://www.waysidepublishing.com/digital-solutions/ai-safety-and-trust)
- [ELSA Schools](https://elsaspeak.com/en/enterprise/schools)
- [ELSA for Teachers](https://business.elsaspeak.com/elsa-for-pronunciation-class)
- [ELSA Dashboard Admin Guide](https://www.scribd.com/document/700576398/en-ELSA-Dashboard-Admin-Guide-v5-1)
