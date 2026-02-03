# Product Requirements Document (v2.0)

**Product name:** Lingual
**Mission:** Become the standard for spoken/colloquial language learning
**Owner:** [TBD]
**Platform:** Web (desktop + mobile web); Native mobile apps planned
**Status:** v2.0
**Pricing:** B2B contracts (schools); B2C free tier
**UI language:** User-selectable (English, Korean; expandable)

---

## 1. Product Overview

Lingual is an AI-powered platform for learning colloquial/spoken language through real-time conversation practice. Users complete a diagnostic assessment to determine their proficiency level, then practice speaking with an AI tutor through personalized, curriculum-aligned scenarios.

**Key Principle:** Curriculum is the backbone of learning. Teachers can upload their own curriculum or use Lingual's standard curriculum.

### Current State

- **Language:** Korean (SKLC-aligned curriculum)
- **Market:** B2C (general population)
- **Features:** Assessment, AI conversation, progress tracking, basic teacher dashboard

### Planned Evolution

- **Languages:** Spanish, French, Russian (Korean serves as the template)
- **Market:** B2B-first (K-12 schools, language institutes)
- **Platform:** Native mobile apps

---

## 2. Target Markets

### Primary Market: Educational Institutions (B2B)

**K-12 Schools**

- Language teachers integrating speaking practice into curriculum
- World language departments (Spanish, French, Korean programs)
- Use cases: Classroom practice sessions, homework assignments, proficiency assessments

**Language Institutes/Academies**

- Hagwons, Alliance Française, Cervantes Institute, etc.
- Supplementary conversation practice alongside traditional instruction
- Use cases: Level placement, individualized practice between classes, progress documentation

### Secondary Market: General Population (B2C)

- **Heritage speakers** - Improving formal registers or filling gaps
- **Self-learners** - Conversational fluency without classroom access
- **Travel/relocation prep** - Practical speaking for real-world contexts
- **Professionals** - Business language and cultural pragmatics

---

## 3. User Roles & Capabilities

| Role | Capabilities |
| ---- | ------------ |
| **Student** | Assessment, AI conversation practice, progress tracking |
| **Teacher** | Student monitoring, class management, curriculum customization, assignment creation |
| **Administrator** | School-wide analytics, multi-teacher management, billing |

### Teacher Capabilities (Detail)

- Create and manage classes
- View student progress and assessment results
- Assign practice sessions with specific goals
- Customize scenarios to align with syllabus
- Set curriculum-aligned learning objectives
- Upload custom curriculum OR use Lingual standard curriculum

### Administrator Capabilities (Detail)

- School-wide analytics dashboard
- Multi-teacher account management
- Billing and contract management
- Usage reporting for ROI justification

---

## 4. Product Scope

### Current (v1) - Korean B2C

- Diagnostic assessment (~10 min) → SKLC level mapping
- AI-guided conversation sessions (7-10 min)
- Post-session feedback and progress tracking
- User profile with learning preferences
- Basic teacher dashboard (view-only)

### Near-term (v2) - School Features

**Teacher Capabilities:**

- Create and manage classes
- View student progress and assessment results
- Assign practice sessions with specific goals
- Customize scenarios to align with syllabus
- Set curriculum-aligned learning objectives
- Upload custom curriculum OR use Lingual standard curriculum

**Administrator Capabilities:**

- School-wide analytics dashboard
- Multi-teacher account management
- Billing and contract management
- Usage reporting for ROI justification

### Future - Multi-language Expansion

- **Spanish** - Learning structure adapted from Korean template
- **French** - Learning structure adapted from Korean template
- **Russian** - Learning structure adapted from Korean template
- Language-agnostic assessment framework
- Per-language proficiency standards (CEFR, ACTFL, etc.)
- Native mobile apps

### Out of Scope (for now)

- University-specific features
- Exam prep (TOPIK, DELE, DELF, etc.)
- Synchronous multi-student sessions

---

## 5. User Flows

### Onboarding & Assessment

User picks UI language → brief explanation → ~10-minute diagnostic → results page with domain bands, global stage, and proficiency level plus a simple description of what that level means.

### Session Setup

System suggests focus domains; user can override/multi-select domains and pick context; system generates 1–3 goals based on curriculum level + context; user confirms.

### Conversation (7–10 minutes)

AI sets scene; turn-by-turn role-play; AI elicits targets, gives light corrections/explanations, and keeps scenario coherent.

### Debrief

Shows goals practiced, grammar/pragmatics patterns, key vocab, pronunciation highlights (1–3 specifics), short progress note; options to save items or start another session.

### Teacher Flow (v2)

Teacher creates class → invites students → sets curriculum (upload or Lingual standard) → assigns practice sessions → monitors progress → adjusts assignments based on results.

### Administrator Flow (v2)

Admin onboards school → creates teacher accounts → configures billing → monitors school-wide usage → generates reports for stakeholders.

---

## 6. Functional Requirements

### Assessment

- Completable in one web session (~10 minutes)
- Outputs domain and global bands plus proficiency level
- Messaging is plain-language
- Framework must be language-agnostic (adaptable to Spanish, French, Russian)

### Curriculum System

- Support for Lingual standard curricula (per language)
- Support for teacher-uploaded custom curricula
- Curriculum maps to learning objectives, scenarios, and assessment criteria
- All practice sessions trace back to curriculum objectives

### Session Creation

- Generate scenarios appropriate to proficiency level and selected domains/context
- Fit interaction to 7–10 minutes
- Align to curriculum objectives

### AI Behavior

- Keep role/setting consistent
- Balance natural conversation with targeted elicitation
- Scale correction density by level
- Provide reformulation and "try again using X" prompts

### Feedback & Progress

- Track in-session patterns and user usage
- Produce per-domain recaps and pronunciation notes
- Maintain history of goals practiced
- For teachers: aggregate class-level analytics

### Multi-tenancy (B2B)

- Organization/school isolation
- Role-based access control (Student, Teacher, Administrator)
- Per-organization billing and usage tracking

### Localization

- All non-target-language UI respects user-chosen UI language
- Practice stays in target language

### Web Delivery

- Works on modern desktop/mobile browsers
- Reliable in-browser audio capture for pronunciation and speaking input

---

## 7. Technical Architecture Principles

- **Language-agnostic core** - Assessment framework, conversation engine, and feedback systems should not hardcode any specific language
- **Curriculum-driven learning** - All practice sessions trace back to curriculum objectives
- **Multi-tenancy ready** - Organization/school isolation for B2B

---

## 8. Risks & Open Questions

- ASR robustness in noisy classroom environments
- Perceived accuracy of proficiency equivalence across different standards
- Balancing conversational flow vs. correction density for beginners
- Tuning of teaching tone and reassessment cadence
- Curriculum upload format and validation requirements
- Pricing model for B2B contracts (per-student, per-school, usage-based)
- Teacher training and onboarding for curriculum customization

---

## 9. Success Criteria

- **Assessment:** High completion rate of diagnostic (~10 min)
- **Engagement:** Users complete at least one practice session after assessment
- **B2B Adoption:** Schools renew contracts after pilot period
- **Learning Outcomes:** Measurable improvement in domain scores over time
- **Teacher Satisfaction:** Teachers find curriculum tools useful and time-saving
- **Scalability:** Platform handles multiple languages without architectural changes
