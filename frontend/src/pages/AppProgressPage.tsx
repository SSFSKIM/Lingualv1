import { useEffect, useState } from 'react';
import { TrendingUp, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { getUserProfile } from '@/api/user';
import { getAssessmentResults } from '@/api/assessment';
import { getMinigameSummary } from '@/api/minigames';
import { LearningPathCard } from '@/components/learning';
import type { AssessmentResults, MinigameSummary, UserProfile } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';

const domainStyles: Record<string, string> = {
  grammar: 'bg-primary',
  vocabulary: 'bg-accent',
  pragmatics: 'bg-success',
  pronunciation: 'bg-foreground',
};

const domainBadgeStyles: Record<string, string> = {
  grammar: 'bg-primary/10 text-primary border-primary/20',
  vocabulary: 'bg-accent/10 text-accent border-accent/20',
  cultural: 'bg-secondary text-foreground border-border',
  pragmatics: 'bg-success/10 text-success border-success/20',
  pronunciation: 'bg-foreground/10 text-foreground border-foreground/20',
};

const scoreWidthClasses: Record<number, string> = {
  0: 'w-0', 1: 'w-[10%]', 2: 'w-[20%]', 3: 'w-[30%]', 4: 'w-[40%]',
  5: 'w-[50%]', 6: 'w-[60%]', 7: 'w-[70%]', 8: 'w-[80%]', 9: 'w-[90%]', 10: 'w-[100%]',
};

const getScoreWidthClass = (score: number) => {
  const rounded = Math.round(score);
  const clamped = Math.min(10, Math.max(0, rounded));
  return scoreWidthClasses[clamped] ?? 'w-0';
};

export function AppProgressPage() {
  const { t } = useLanguage();
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [profileSummary, setProfileSummary] = useState<UserProfile | null>(null);
  const [minigameSummary, setMinigameSummary] = useState<MinigameSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const profile = await getUserProfile();
        if (!isActive) return;
        setProfileSummary(profile);

        if (profile.assessed) {
          try {
            const results = await getAssessmentResults();
            if (!isActive) return;
            setAssessmentResults(results);
          } catch (err) {
            console.error('Failed to load assessment results:', err);
          }
        }

        try {
          const summary = await getMinigameSummary();
          if (!isActive) return;
          setMinigameSummary(summary);
        } catch (err) {
          console.error('Failed to load minigame summary:', err);
        }
      } catch (err) {
        console.error('Failed to load profile summary:', err);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadData();
    return () => { isActive = false; };
  }, []);

  const domainEntries = assessmentResults?.domainBands
    ? Object.entries(assessmentResults.domainBands).sort((a, b) => b[1] - a[1])
    : [];

  const getDomainLabel = (domain: string) => {
    const key = `profile.${domain}`;
    const translated = t(key);
    if (translated !== key) return translated;
    return domain.replace(/_/g, ' ');
  };

  const getGameLabel = (gameType: string) => {
    if (gameType === 'listening_quiz') return t('app.games.listeningQuiz') || 'Listening Quiz';
    if (gameType === 'grammar_challenge') return t('app.games.grammarChallenge') || 'Grammar Challenge';
    return gameType;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-foreground text-background border-2 border-foreground flex items-center justify-center">
          <TrendingUp size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {t('app.progress.title') || 'Learning Progress'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('app.progress.subtitle') || 'Track your skills and learning journey'}
          </p>
        </div>
      </div>

      {/* Learning Path Card (shared component) */}
      <LearningPathCard
        assessmentResults={assessmentResults}
        profileSummary={profileSummary}
        t={t}
      />

      {/* Detailed Domain Breakdown */}
      {domainEntries.length > 0 && (
        <div className="bg-card rounded-2xl border-3 border-foreground shadow-stamp p-6">
          <h2 className="text-lg font-display font-bold text-foreground mb-6">
            {t('app.progress.domainBreakdown') || 'Skill Breakdown'}
          </h2>
          <div className="space-y-5">
            {domainEntries.map(([domain, score]) => (
              <div key={domain} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-foreground capitalize">
                      {getDomainLabel(domain)}
                    </span>
                    <span className={clsx(
                      'text-xs font-bold px-2.5 py-1 rounded-lg border',
                      domainBadgeStyles[domain] || 'bg-secondary text-muted-foreground border-border'
                    )}>
                      {score}/10
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">
                    {score >= 8 ? t('app.progress.level.strong') || 'Strong' :
                     score >= 5 ? t('app.progress.level.developing') || 'Developing' :
                     t('app.progress.level.needsPractice') || 'Needs Practice'}
                  </span>
                </div>
                <div className="h-3 w-full rounded-lg bg-secondary border border-border overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-lg transition-all',
                      domainStyles[domain] || 'bg-muted-foreground',
                      getScoreWidthClass(score)
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Minigame Performance */}
      <div className="bg-card rounded-2xl border-3 border-foreground shadow-stamp p-6">
        <h2 className="text-lg font-display font-bold text-foreground mb-4">
          {t('app.progress.minigames.title') || 'Minigame Performance'}
        </h2>

        {!minigameSummary || minigameSummary.totalAttempts === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('app.progress.minigames.empty') || 'Play games to see your performance stats here.'}
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-xl border-2 border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{t('app.progress.minigames.attempts') || 'Attempts'}</p>
                <p className="text-2xl font-display font-bold text-foreground">{minigameSummary.totalAttempts}</p>
              </div>
              <div className="rounded-xl border-2 border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{t('app.progress.minigames.accuracy') || 'Avg accuracy'}</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {Math.round(minigameSummary.averageAccuracy)}%
                </p>
              </div>
              <div className="rounded-xl border-2 border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{t('app.progress.minigames.bestScore') || 'Best score'}</p>
                <p className="text-2xl font-display font-bold text-foreground">{minigameSummary.bestScore}</p>
              </div>
              <div className="rounded-xl border-2 border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{t('app.progress.minigames.correct') || 'Correct answers'}</p>
                <p className="text-2xl font-display font-bold text-foreground">{minigameSummary.totalCorrectAnswers}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-display font-bold text-foreground mb-3">
                {t('app.progress.minigames.byGame') || 'By game'}
              </h3>
              <div className="space-y-2">
                {Object.entries(minigameSummary.byGame).map(([gameType, stats]) => (
                  <div key={gameType} className="rounded-xl border-2 border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{getGameLabel(gameType)}</p>
                      <p className="text-sm text-muted-foreground">{stats.attempts} {t('app.progress.minigames.attempts') || 'attempts'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('app.progress.minigames.accuracy') || 'Avg accuracy'}: {Math.round(stats.averageAccuracy)}% · {t('app.progress.minigames.bestScore') || 'Best score'}: {stats.bestScore}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-display font-bold text-foreground mb-3">
                {t('app.progress.minigames.recent') || 'Recent attempts'}
              </h3>
              <div className="space-y-2">
                {minigameSummary.recentAttempts.slice(0, 5).map((attempt) => (
                  <div key={attempt.id || `${attempt.gameType}-${attempt.createdAt}`} className="rounded-xl border-2 border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-foreground">{getGameLabel(attempt.gameType)}</p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.createdAt ? new Date(attempt.createdAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {attempt.correctAnswers}/{attempt.totalQuestions} · {Math.round(attempt.accuracy || 0)}% · {t('app.progress.minigames.score') || 'Score'}: {attempt.score}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
