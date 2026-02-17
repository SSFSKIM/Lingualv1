import { useCallback, useEffect, useMemo, useState } from 'react';
import { Gamepad2, Headphones, Loader2, Puzzle, MessageSquare } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import curriculumExampleKo from '@/data/curriculum_example_ko.json';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLearningLocale } from '@/contexts/LearningLocaleContext';
import { getChatSessions } from '@/api/chat';
import {
  buildGrammarChallengeQuestions,
  buildListeningQuizQuestions,
  type CurriculumScenarioForMinigames,
  type GrammarChallengeQuestion,
  type ListeningQuizQuestion,
} from '@/lib/minigameContent';
import { FlashcardFlip, GrammarChallenge, ListeningQuiz, WordMatch } from '@/components/minigames';
import type { MinigameCompletionResult } from '@/components/minigames/ListeningQuiz';
import { generateFlashcards, saveMinigameAttempt, type Flashcard } from '@/api/minigames';
import type { ChatSession, MinigameType } from '@/types';

type CurriculumObjective = {
  id: string;
  title: string;
  skills: string[];
};

type CurriculumScenario = CurriculumScenarioForMinigames & {
  objective_id: string;
  setting: string;
  difficulty: string;
  success_criteria: string[];
};

type Curriculum = {
  curriculum_id: string;
  locale: string;
  title: string;
  objectives: CurriculumObjective[];
  practice_scenarios: CurriculumScenario[];
};

type ActiveGameContext = {
  objectiveId: string;
  scenarioId: string;
  scenarioTitle: string;
};

const curriculum = curriculumExampleKo as Curriculum;

export function AppGamesPage() {
  const { t } = useLanguage();
  const { learningLocale } = useLearningLocale();

  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [activeGameContext, setActiveGameContext] = useState<ActiveGameContext | null>(null);

  const [showListeningQuiz, setShowListeningQuiz] = useState(false);
  const [listeningQuestions, setListeningQuestions] = useState<ListeningQuizQuestion[]>([]);
  const [showGrammarChallenge, setShowGrammarChallenge] = useState(false);
  const [grammarQuestions, setGrammarQuestions] = useState<GrammarChallengeQuestion[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [showWordMatch, setShowWordMatch] = useState(false);
  const [wordMatchPairs, setWordMatchPairs] = useState<Flashcard[]>([]);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedChatSessionId, setSelectedChatSessionId] = useState<string | null>(null);
  const [loadingChatSessions, setLoadingChatSessions] = useState(true);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [loadingWordMatch, setLoadingWordMatch] = useState(false);

  const [savingResult, setSavingResult] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const curriculumMatchesLocale = curriculum.locale === learningLocale;
  const objectives = useMemo(
    () => (curriculumMatchesLocale ? curriculum.objectives : []),
    [curriculumMatchesLocale]
  );
  const scenarios = useMemo(
    () => (curriculumMatchesLocale ? curriculum.practice_scenarios : []),
    [curriculumMatchesLocale]
  );

  useEffect(() => {
    if (!curriculumMatchesLocale || !objectives.length) {
      setSelectedObjectiveId(null);
      setSelectedScenarioId(null);
      return;
    }
    setSelectedObjectiveId((prev) => prev ?? objectives[0].id);
  }, [curriculumMatchesLocale, objectives]);

  const filteredScenarios = useMemo(() => {
    if (!selectedObjectiveId) return scenarios;
    return scenarios.filter((scenario) => scenario.objective_id === selectedObjectiveId);
  }, [scenarios, selectedObjectiveId]);

  useEffect(() => {
    if (!filteredScenarios.length) {
      setSelectedScenarioId(null);
      return;
    }
    setSelectedScenarioId((prev) => {
      const stillValid = prev && filteredScenarios.some((scenario) => scenario.id === prev);
      return stillValid ? prev : filteredScenarios[0].id;
    });
  }, [filteredScenarios]);

  useEffect(() => {
    let isActive = true;
    const loadChatSessions = async () => {
      setLoadingChatSessions(true);
      try {
        const sessions = await getChatSessions();
        if (!isActive) return;
        const withMessages = sessions.filter((session) => session.message_count > 0);
        setChatSessions(withMessages);
        setSelectedChatSessionId((prev) => {
          if (prev && withMessages.some((session) => session.id === prev)) {
            return prev;
          }
          return withMessages[0]?.id ?? null;
        });
      } catch (loadError) {
        if (!isActive) return;
        console.error('Failed to load chat sessions:', loadError);
        setError(t('app.games.chatLoadFailed') || 'Failed to load chat sessions');
      } finally {
        if (isActive) setLoadingChatSessions(false);
      }
    };

    void loadChatSessions();
    return () => {
      isActive = false;
    };
  }, [t]);

  const selectedScenario = useMemo(
    () => filteredScenarios.find((scenario) => scenario.id === selectedScenarioId) || null,
    [filteredScenarios, selectedScenarioId]
  );

  const persistAttempt = useCallback(
    async (gameType: MinigameType, result: MinigameCompletionResult) => {
      if (!activeGameContext) return;
      setSavingResult(true);
      setStatusMessage(t('app.games.savingResult') || 'Saving result...');
      try {
        await saveMinigameAttempt({
          gameType,
          locale: learningLocale,
          objectiveId: activeGameContext.objectiveId,
          scenarioId: activeGameContext.scenarioId,
          score: result.score,
          correctAnswers: result.correctAnswers,
          totalQuestions: result.totalQuestions,
          accuracy: Number(((result.correctAnswers / Math.max(result.totalQuestions, 1)) * 100).toFixed(2)),
          durationSeconds: result.durationSeconds,
          metadata: result.metadata,
        });
        setStatusMessage(t('app.games.savedResult') || 'Result saved to progress');
      } catch (saveError) {
        console.error('Failed to save minigame attempt:', saveError);
        setStatusMessage(t('app.games.saveResultFailed') || 'Could not save result');
      } finally {
        setSavingResult(false);
      }
    },
    [activeGameContext, learningLocale, t]
  );

  const launchListeningQuiz = useCallback(() => {
    if (!selectedScenario) return;
    const questions = buildListeningQuizQuestions(selectedScenario, scenarios, 5);
    if (!questions.length) {
      setError(t('app.games.noQuestions') || 'No questions available for this scenario');
      return;
    }
    setError(null);
    setStatusMessage(null);
    setActiveGameContext({
      objectiveId: selectedScenario.objective_id,
      scenarioId: selectedScenario.id,
      scenarioTitle: selectedScenario.title,
    });
    setListeningQuestions(questions);
    setShowListeningQuiz(true);
  }, [scenarios, selectedScenario, t]);

  const launchGrammarChallenge = useCallback(() => {
    if (!selectedScenario) return;
    const questions = buildGrammarChallengeQuestions(selectedScenario, scenarios, 5);
    if (!questions.length) {
      setError(t('app.games.noQuestions') || 'No questions available for this scenario');
      return;
    }
    setError(null);
    setStatusMessage(null);
    setActiveGameContext({
      objectiveId: selectedScenario.objective_id,
      scenarioId: selectedScenario.id,
      scenarioTitle: selectedScenario.title,
    });
    setGrammarQuestions(questions);
    setShowGrammarChallenge(true);
  }, [scenarios, selectedScenario, t]);

  const closeListeningQuiz = () => {
    setShowListeningQuiz(false);
    setActiveGameContext(null);
  };

  const closeGrammarChallenge = () => {
    setShowGrammarChallenge(false);
    setActiveGameContext(null);
  };

  const onListeningComplete = (result: MinigameCompletionResult) => {
    void persistAttempt('listening_quiz', result);
  };

  const onGrammarComplete = (result: MinigameCompletionResult) => {
    void persistAttempt('grammar_challenge', result);
  };

  const launchFlashcardFlip = useCallback(async () => {
    if (!selectedChatSessionId) return;
    setLoadingFlashcards(true);
    setError(null);
    try {
      const cards = await generateFlashcards(selectedChatSessionId);
      setFlashcards(cards);
      setShowFlashcards(true);
    } catch (loadError) {
      console.error('Failed to generate flashcards:', loadError);
      setError(t('app.games.flashcardsFailed') || 'Failed to generate flashcards');
    } finally {
      setLoadingFlashcards(false);
    }
  }, [selectedChatSessionId, t]);

  const launchWordMatch = useCallback(async () => {
    if (!selectedChatSessionId) return;
    setLoadingWordMatch(true);
    setError(null);
    try {
      const cards = await generateFlashcards(selectedChatSessionId);
      setWordMatchPairs(cards);
      setShowWordMatch(true);
    } catch (loadError) {
      console.error('Failed to generate word match pairs:', loadError);
      setError(t('app.games.wordMatchFailed') || 'Failed to generate word match pairs');
    } finally {
      setLoadingWordMatch(false);
    }
  }, [selectedChatSessionId, t]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent text-accent-foreground border-2 border-foreground flex items-center justify-center">
          <Gamepad2 size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {t('app.games.title') || 'Practice Games'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('app.games.subtitle') || 'Select an objective and scenario, then practice through games'}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border-2 border-destructive bg-destructive/10 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {statusMessage && (
        <div
          className={clsx(
            'p-4 rounded-xl border-2 text-sm font-medium',
            savingResult
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-success bg-success/10 text-success'
          )}
        >
          {savingResult ? <Loader2 className="inline h-4 w-4 mr-2 animate-spin" /> : null}
          {statusMessage}
        </div>
      )}

      {!curriculumMatchesLocale ? (
        <div className="bg-card rounded-2xl border-3 border-foreground shadow-stamp p-8 text-center">
          <p className="text-lg font-display font-bold text-foreground">
            {t('app.games.noCurriculum') || 'No game curriculum available for this locale yet'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('app.games.noCurriculumDesc') || 'Switch to Korean to play objective-based games for now'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border-3 border-foreground shadow-stamp p-6 space-y-5">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                {t('app.games.objectiveLabel') || 'Learning objective'}
              </label>
              <select
                value={selectedObjectiveId || ''}
                onChange={(event) => setSelectedObjectiveId(event.target.value)}
                className="w-full md:w-[420px] bg-card border-2 border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:border-primary"
              >
                {objectives.map((objective) => (
                  <option key={objective.id} value={objective.id}>
                    {objective.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                {t('app.games.scenarioLabel') || 'Choose a scenario'}
              </h2>
              {filteredScenarios.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredScenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => setSelectedScenarioId(scenario.id)}
                      className={clsx(
                        'rounded-xl border-2 p-4 text-left transition-all',
                        selectedScenarioId === scenario.id
                          ? 'border-primary bg-primary/10 shadow-stamp-sm'
                          : 'border-border bg-card hover:border-foreground hover:shadow-stamp-sm'
                      )}
                    >
                      <p className="font-display font-bold text-foreground">{scenario.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{scenario.setting}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('app.games.targetPhrases') || 'Target phrases'}: {scenario.target_phrases.length}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('app.games.noScenario') || 'No scenarios for this objective yet'}
                </p>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border-3 border-foreground shadow-stamp p-6">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">
              {t('app.games.chooseGame') || 'Choose a game'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={launchListeningQuiz}
                disabled={!selectedScenario}
                className={clsx(
                  'p-6 rounded-xl border-2 transition-all text-left',
                  'border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent hover:shadow-stamp-sm',
                  !selectedScenario && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Headphones size={20} />
                  <span className="text-lg font-display font-bold text-foreground">
                    {t('app.games.listeningQuiz') || 'Listening Quiz'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('app.games.listeningQuizDesc') || 'Listen and identify target phrases from the scenario'}
                </p>
              </button>

              <button
                onClick={launchGrammarChallenge}
                disabled={!selectedScenario}
                className={clsx(
                  'p-6 rounded-xl border-2 transition-all text-left',
                  'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary hover:shadow-stamp-sm',
                  !selectedScenario && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Puzzle size={20} />
                  <span className="text-lg font-display font-bold text-foreground">
                    {t('app.games.grammarChallenge') || 'Grammar Challenge'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('app.games.grammarChallengeDesc') || 'Fill in missing particles and strengthen grammar patterns'}
                </p>
              </button>
            </div>
          </div>
        </>
      )}

      <div className="bg-card rounded-2xl border-3 border-foreground shadow-stamp p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-secondary text-foreground border-2 border-foreground flex items-center justify-center">
            <MessageSquare size={18} />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">
              {t('app.games.conversationGames') || 'Conversation Games'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('app.games.conversationGamesDesc') || 'Play chat-based review games from your previous conversations'}
            </p>
          </div>
        </div>

        {loadingChatSessions ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : chatSessions.length === 0 ? (
          <div className="rounded-xl border-2 border-border bg-secondary p-4">
            <p className="text-sm font-semibold text-foreground">
              {t('app.games.noSessions') || 'No conversations yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('app.games.noSessionsDesc') || 'Start a conversation in chat to unlock these games'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                {t('app.games.selectSession') || 'Select a conversation'}
              </label>
              <select
                value={selectedChatSessionId || ''}
                onChange={(event) => setSelectedChatSessionId(event.target.value)}
                className="w-full md:w-[420px] bg-card border-2 border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:border-primary"
              >
                {chatSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title} · {session.message_count} {t('app.games.messages') || 'msgs'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={launchFlashcardFlip}
                disabled={!selectedChatSessionId || loadingFlashcards}
                className={clsx(
                  'p-6 rounded-xl border-2 transition-all text-left',
                  'border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary hover:shadow-stamp-sm',
                  (!selectedChatSessionId || loadingFlashcards) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-3xl mb-3 block">{loadingFlashcards ? '' : '🃏'}</span>
                {loadingFlashcards ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm font-display font-bold text-foreground">
                      {t('app.learn.minigames.loadingFlashcards') || 'Generating flashcards...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-lg font-display font-bold text-foreground">
                      {t('app.learn.minigames.flashcards') || 'Flashcard Flip'}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('app.learn.minigames.flashcardsDesc') || 'Review vocabulary from your conversation'}
                    </p>
                  </>
                )}
              </button>

              <button
                onClick={launchWordMatch}
                disabled={!selectedChatSessionId || loadingWordMatch}
                className={clsx(
                  'p-6 rounded-xl border-2 transition-all text-left',
                  'border-accent/30 bg-accent/5 hover:bg-accent/10 hover:border-accent hover:shadow-stamp-sm',
                  (!selectedChatSessionId || loadingWordMatch) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className="text-3xl mb-3 block">{loadingWordMatch ? '' : '🔗'}</span>
                {loadingWordMatch ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                    <span className="text-sm font-display font-bold text-foreground">
                      {t('app.learn.minigames.loadingWordMatch') || 'Generating word match game...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="text-lg font-display font-bold text-foreground">
                      {t('app.learn.minigames.wordMatch') || 'Word Match'}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('app.learn.minigames.wordMatchDesc') || 'Match word pairs from your conversation'}
                    </p>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showListeningQuiz && listeningQuestions.length > 0 && activeGameContext && (
          <ListeningQuiz
            questions={listeningQuestions}
            scenarioTitle={activeGameContext.scenarioTitle}
            onClose={closeListeningQuiz}
            onComplete={onListeningComplete}
          />
        )}
        {showGrammarChallenge && grammarQuestions.length > 0 && activeGameContext && (
          <GrammarChallenge
            questions={grammarQuestions}
            scenarioTitle={activeGameContext.scenarioTitle}
            onClose={closeGrammarChallenge}
            onComplete={onGrammarComplete}
          />
        )}
        {showFlashcards && flashcards.length > 0 && (
          <FlashcardFlip
            flashcards={flashcards}
            onClose={() => setShowFlashcards(false)}
          />
        )}
        {showWordMatch && wordMatchPairs.length > 0 && (
          <WordMatch
            wordPairs={wordMatchPairs}
            onClose={() => setShowWordMatch(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
