# Learning Dashboard Refactor Design

**Date:** 2026-02-05
**Status:** Approved
**Goal:** Refactor `/app/learn` from combined chat page to comprehensive learning dashboard with dedicated service pages

## Problem Statement

Currently, `/app/learn` (AppLearningPage) serves as both the chat interface and learning hub, containing 974 lines of mixed concerns:
- Chat interface with realtime/text modes
- Chat session management
- Minigames logic (flashcards, word match)
- Learning path overview
- Domain scores and progress

This violates separation of concerns and makes the codebase hard to maintain as we add new features (curriculum, assignments, teacher tools).

## Solution Overview

Split `/app/learn` into four focused pages:
1. **`/app/learn`** - Dashboard (stats + navigation)
2. **`/app/chat`** - Dedicated chat interface
3. **`/app/games`** - Practice games hub
4. **`/app/progress`** - Detailed progress tracking

## Architecture

### New Route Structure

```tsx
<Route path="/app" element={<AppProtectedRoute />}>
  <Route index element={<Navigate to="learn" replace />} />
  <Route path="learn" element={<AppLearningPage />} />      {/* Dashboard */}
  <Route path="chat" element={<AppChatPage />} />           {/* NEW */}
  <Route path="games" element={<AppGamesPage />} />         {/* NEW */}
  <Route path="progress" element={<AppProgressPage />} />   {/* NEW */}
  <Route path="practice" element={<PronunciationPracticePage />} />
  <Route path="profile" element={<AppProfilePage />} />
  <Route path="settings" element={<AppSettingsPage />} />
  <Route path="teacher" element={<TeacherDashboardPage />} />
</Route>
```

### File Structure

```
frontend/src/
├── pages/
│   ├── AppLearningPage.tsx          → Refactored to dashboard
│   ├── AppChatPage.tsx              → NEW: Chat interface
│   ├── AppGamesPage.tsx             → NEW: Games hub
│   ├── AppProgressPage.tsx          → NEW: Progress tracking
│   └── (existing pages...)
├── components/
│   ├── dashboard/
│   │   ├── DashboardStatsBar.tsx    → NEW: Stats display
│   │   └── ServiceNavigationCard.tsx → NEW: Service cards
│   ├── learning/
│   │   ├── LearningPathCard.tsx     → Extracted from AppLearningPage
│   │   ├── ChatSessionsSidebar.tsx  → Extracted from AppLearningPage
│   │   └── ChatInterface.tsx        → Extracted from AppLearningPage
│   └── (existing components...)
```

## Component Responsibilities

### 1. AppLearningPage (Dashboard)

**Before:** 974 lines, all chat + games + overview logic
**After:** ~50 lines, pure navigation

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Stats Bar                                       │
│ 🔥 7 days | ⏱️ 3h 24m | ⭐ +250 XP | 🏆 3       │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐│
│ │ AI Chat  │ │  Games   │ │Pronuncia │ │Progre││
│ │   💬     │ │   🎮     │ │tion 🎤   │ │ss 📊 ││
│ └──────────┘ └──────────┘ └──────────┘ └──────┘│
└─────────────────────────────────────────────────┘
```

**Components:**
- `DashboardStatsBar` - Mock stats (streak, weekly time, XP, achievements)
- `ServiceNavigationCard` (x4) - Links to Chat, Games, Practice, Progress

**Data:**
- Mock stats for initial implementation
- Real stats will be added later via backend tracking

### 2. AppChatPage

**Extracted from:** Current AppLearningPage lines 1-974
**Lines:** ~800 (includes all chat logic)

**Layout:**
```
┌──────────┬─────────────────────────────────────┐
│          │ Chat Header (session title, mode)   │
│ Learning ├─────────────────────────────────────┤
│ Path     │                                     │
│ Card     │ Messages Area                       │
│          │                                     │
│──────────│                                     │
│          │                                     │
│ Sessions │                                     │
│ Sidebar  ├─────────────────────────────────────┤
│          │ Input Area (text/voice)             │
└──────────┴─────────────────────────────────────┘
```

**Components:**
- `LearningPathCard` - SKLC level, focus areas, domain scores
- `ChatSessionsSidebar` - Chat history, create new, delete
- `ChatInterface` - Messages, text/voice input, mode toggle

**Hooks:**
- `useRealtimeChat` - OpenAI realtime WebSocket
- Local state for chat sessions, messages, loading

### 3. AppGamesPage

**Extracted from:** Current AppLearningPage minigames section
**Lines:** ~200

**Flow:**
1. Display available chat sessions
2. User selects a session
3. Choose game type (Flashcard Flip or Word Match)
4. Game opens in modal (reuses existing FlashcardFlip, WordMatch)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Select a chat session to practice from:        │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐│
│ │ 📝 Conversation about food (Jan 15) [Select]││
│ │ 📝 Grammar practice (Jan 14)       [Select]││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ Choose a game:                                  │
│ ┌──────────┐ ┌──────────┐                      │
│ │Flashcard │ │  Word    │                      │
│ │  Flip 🃏 │ │ Match 🔗 │                      │
│ └──────────┘ └──────────┘                      │
└─────────────────────────────────────────────────┘
```

**State:**
- Selected chat session ID
- Selected game type
- Game modal open/closed

### 4. AppProgressPage

**New page** combining overview + detailed stats
**Lines:** ~300

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Learning Path Card                              │
│ (SKLC level, focus areas, domain scores)        │
├─────────────────────────────────────────────────┤
│ Detailed Domain Breakdown                       │
│ ┌─────────────────────────────────────────────┐│
│ │ Grammar: 8.5/10     [===========   ]        ││
│ │ Vocabulary: 7.2/10  [=========      ]       ││
│ │ Pragmatics: 6.8/10  [========       ]       ││
│ │ Pronunciation: 5.5/10 [======        ]      ││
│ └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ Future: Curriculum progress, streak calendar    │
└─────────────────────────────────────────────────┘
```

**Components:**
- `LearningPathCard` (shared with chat page)
- Expanded domain details
- Placeholder sections for future features

## Component Extraction Details

### LearningPathCard (Shared Component)

**Extracted from:** AppLearningPage lines 554-637
**Used in:** `/app/chat` and `/app/progress`

```tsx
interface LearningPathCardProps {
  assessmentResults: AssessmentResults | null;
  profileSummary: UserProfile | null;
  t: (key: string) => string;
}
```

**Displays:**
- SKLC level badge
- Assessment description
- Focus areas (selected categories)
- Top 3 domain scores with progress bars

### ChatSessionsSidebar

**Extracted from:** AppLearningPage lines 692-753 + SessionItem (43-104)
**Used in:** `/app/chat`

```tsx
interface ChatSessionsSidebarProps {
  sessions: ChatSession[];
  currentChatId: string | null;
  onSelectSession: (id: string) => void;
  onCreateNew: () => void;
  onDelete: (id: string) => void;
  loading: boolean;
}
```

**Features:**
- Resume most recent session
- Session list with delete on hover
- Create new button
- Loading/empty states

### ChatInterface

**Extracted from:** AppLearningPage lines 756-936
**Used in:** `/app/chat`

```tsx
interface ChatInterfaceProps {
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  mode: 'text' | 'realtime';
  onModeChange: (mode: 'text' | 'realtime') => void;
  onSendText: () => void;
  onVoiceToggle: () => void;
  // ... other props for realtime chat state
}
```

**Features:**
- Message display with avatars
- Text/voice mode toggle
- Text input with send button
- Voice input with mic button
- Mode-specific UI states

## New Components

### DashboardStatsBar

```tsx
interface DashboardStatsBarProps {
  stats: {
    streak: number;
    weeklyMinutes: number;
    weeklyXP: number;
    achievementCount: number;
  };
}
```

**Layout:** Horizontal grid, 4 stat cards
**Styling:** Matches brutalist design with borders, shadows

### ServiceNavigationCard

```tsx
interface ServiceNavigationCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: 'primary' | 'accent' | 'success' | 'secondary';
}
```

**Features:**
- Clickable card navigating to service
- Icon with colored background
- Title + description
- Hover effect (border color + shadow)

## Data Flow

### Mock Stats (Initial Implementation)

```tsx
const mockStats = {
  streak: 7,           // Days
  weeklyMinutes: 204,  // 3h 24m
  weeklyXP: 250,       // XP gained this week
  achievementCount: 3, // Achievements earned
};
```

**Future:** Replace with real data from backend tracking endpoints.

### Real Data (Unchanged)

- Assessment results: `/api/assessment/results`
- User profile: `/api/user/profile`
- Chat sessions: `/api/chat/sessions`
- Chat messages: `/api/chat/<id>`

## Implementation Plan

### Phase 1: Component Extraction

1. Create `components/learning/LearningPathCard.tsx`
2. Create `components/learning/ChatSessionsSidebar.tsx`
3. Create `components/learning/ChatInterface.tsx`
4. Create `components/dashboard/DashboardStatsBar.tsx`
5. Create `components/dashboard/ServiceNavigationCard.tsx`

### Phase 2: New Pages

1. Create `pages/AppChatPage.tsx` using extracted components
2. Create `pages/AppGamesPage.tsx` with session selector
3. Create `pages/AppProgressPage.tsx` with progress details
4. Refactor `pages/AppLearningPage.tsx` to dashboard

### Phase 3: Routing

1. Update `App.tsx` with new routes
2. Update `pages/index.ts` exports
3. Test navigation between pages

### Phase 4: Polish

1. Add page transitions (Framer Motion)
2. Test responsive layouts
3. Update i18n keys if needed
4. Verify UI consistency (brutalist design)

## Design Consistency

All new components must match existing design system:
- **UI Library:** Radix UI primitives
- **Styling:** Tailwind CSS 4
- **Animation:** Framer Motion
- **Theme:** Warm brutalist (thick borders, stamp shadows, bold typography)
- **Colors:** Use existing design tokens (primary, accent, success, secondary)

**Key Design Patterns:**
- `rounded-2xl` for cards
- `border-3 border-foreground` for emphasis
- `shadow-stamp` for depth
- `font-display font-bold` for headers
- `bg-card`, `bg-secondary` for surfaces

## Testing Checklist

- [ ] Dashboard loads with mock stats
- [ ] Navigation cards link to correct routes
- [ ] Chat page maintains all existing functionality
- [ ] Games page can select session and launch games
- [ ] Progress page displays assessment results
- [ ] LearningPathCard works in both chat and progress
- [ ] Responsive layout on mobile/tablet/desktop
- [ ] No console errors or warnings
- [ ] UI matches existing brutalist design

## Future Enhancements

**Stats Tracking (Backend):**
- Streak calculation (consecutive days with activity)
- Time tracking per session
- XP system (points per activity)
- Achievement system (milestones)

**Dashboard Improvements:**
- Recent activity feed
- Quick actions (resume last chat, daily challenge)
- Personalized recommendations

**Progress Page Additions:**
- Curriculum progress tracker
- Streak calendar visualization
- Detailed achievement list
- Learning analytics charts

**Games Page Additions:**
- More game types (typing, listening)
- Game statistics and high scores
- Decoupled vocabulary system (not chat-dependent)

## Migration Notes

**Breaking Changes:** None - all existing functionality preserved

**User Impact:**
- URL change: Chat moves from `/app/learn` to `/app/chat`
- Old `/app/learn` becomes navigation dashboard
- Redirect from old chat URLs if needed

**Developer Impact:**
- 974-line file split into 4 focused pages
- Shared components improve reusability
- Easier to add new services (curriculum, assignments)

## Success Metrics

- Code maintainability: 974 lines → ~1,200 lines (distributed across 9 files)
- Page complexity: Single 974-line page → Four focused pages (~50-800 lines each)
- Reusability: 3 shared components (LearningPathCard, ChatSessionsSidebar, ChatInterface)
- Extensibility: Easy to add new services to dashboard
