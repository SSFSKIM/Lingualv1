# UI/UX Audit — Lingual (2026-02)

This audit reviews the current frontend implementation and prioritizes improvements for **consistency, accessibility, mobile usability, and curriculum-first clarity**.

## Executive Summary

Lingual’s “Warm Brutalism” design language is strong and distinctive on the Landing/Auth + many `/app/*` surfaces, but the overall experience is fragmented due to **two app shells** and **two visual systems** (warm brutalism vs slate/purple). Fixing this consistency gap is the highest-leverage UX improvement.

## P0 (Do Next) — Highest Impact

### 1) Eliminate the “two apps” feeling (shell + style fragmentation)

**Problem:** Onboarding routes and a few key pages use slate/purple styles while the app shell uses warm brutalism tokens. Users experience a jarring “product switch.”

**Where it shows up:**
- Slate/purple onboarding styling: `frontend/src/pages/GeneralPage.tsx`, `frontend/src/pages/CategoriesPage.tsx`
- Slate/purple profile + teacher surfaces: `frontend/src/pages/AppProfilePage.tsx`, `frontend/src/pages/TeacherDashboardPage.tsx`
- Slate/purple UI primitives: `frontend/src/components/ui/slider.tsx`
- Slate/purple assessment components: `frontend/src/components/assessment/MCQQuestion.tsx`, `TextQuestion.tsx`, `AudioQuestion.tsx`

**Recommendation:**
- Standardize all authenticated flows onto the warm brutalism system:
  - Convert remaining pages/components to use design tokens and shared UI components.
  - Prefer a single authenticated shell (`AppLayout`) across onboarding + app pages.

**Acceptance criteria:**
- No `bg-slate-*`, `text-slate-*`, `bg-purple-*`, `ring-purple-*` in the authenticated user journey.

### 2) Fix accessibility semantics (labels, icon buttons, interactive elements)

**Problems:**
- Icon-only buttons missing `aria-label`.
- Clickable `div` elements used as buttons/links.
- Some labels are not programmatically associated with inputs.

**Where:**
- App header notifications: `frontend/src/components/layout/AppLayout.tsx`
- General pattern: multiple pages/components

**Recommendation:**
- Replace click handlers on `div` with `button`/`a`.
- Add `aria-label` to all icon-only controls.
- Ensure label → input pairing (`<Label htmlFor="...">` + `id="..."`) for all form fields.

**Acceptance criteria:**
- Tab navigation works end-to-end; focus is visible; screen reader labels exist for all controls.

### 3) Mobile navigation: reduce “where do I go next?” friction

**Problem:** In `/app`, discoverability relies heavily on dashboard cards; navigation is not persistently visible.

**Recommendation:**
- Add persistent navigation (bottom tabs for mobile; sidebar or top nav links for desktop).
- Ensure primary actions are one tap away: Learn, Chat, Practice, Games, Progress.

## P1 — Strong Improvements

### 4) Contrast and token usage for AA compliance

**Observed risk:** Some token combinations may fall below AA for normal text:
- Primary button text and success surfaces may not meet 4.5:1 in all sizes.

**Recommendation:**
- Avoid using `text-primary` as body text on light background.
- Consider small token adjustments (darken primary/success) or use darker foreground text when appropriate.

### 5) Replace `confirm()` destructive actions with branded dialogs

**Problem:** Browser confirm dialogs break visual consistency and feel untrustworthy.

**Where:**
- Chat deletions (pattern exists): `frontend/src/pages/AppChatPage.tsx`, `frontend/src/components/learning/ChatSessionsSidebar.tsx`

**Recommendation:** Use Radix `Dialog` for delete confirmations.

### 6) Voice UX clarity (Realtime chat)

**Problems:**
- Users need explicit permission and status clarity (mic live / listening / speaking).
- Consider adding “push-to-talk” or a clear mute/stop state to reduce anxiety.

**Where:** `frontend/src/pages/AppChatPage.tsx`, `frontend/src/hooks/useRealtimeChat.ts`

**Recommendation:** Make state visible and forgiving (clear stop, retry, and mic permission guidance).

## P2 — Nice-to-Have Enhancements

### 7) Curriculum-first UI (make objectives explicit)

**Problem:** The product principle says curriculum is the backbone, but the UI often doesn’t surface the “objective” as the anchor for actions.

**Recommendation:**
- Show the active objective/scenario in Chat/Practice/Games, and link feedback to it.
- Add “Today’s objective” and “why this matters” microcopy in the dashboard.

### 8) Reduce motion for sensitive users

**Recommendation:** Respect `prefers-reduced-motion` for infinite rotations/pulses and non-essential transitions.

## Suggested Next Steps (Practical)

1) **Consistency Sweep (1–2 days):** retheme slider + assessment components + onboarding pages; remove slate/purple.
2) **Navigation Upgrade (1–2 days):** bottom tabs + desktop nav.
3) **A11y Pass (1 day):** labels, aria, focus, contrast.

