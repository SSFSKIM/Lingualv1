import { Flame, Clock, Star, Trophy } from 'lucide-react';
import { clsx } from 'clsx';

interface DashboardStatsBarProps {
  stats: {
    streak: number;
    weeklyMinutes: number;
    weeklyXP: number;
    achievementCount: number;
  };
  t: (key: string) => string;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function DashboardStatsBar({ stats, t }: DashboardStatsBarProps) {
  const items = [
    {
      icon: <Flame size={20} strokeWidth={2.5} />,
      value: `${stats.streak}`,
      label: t('app.dashboard.stats.streak'),
      chip: 'border-destructive/35 bg-destructive/10 text-destructive',
      iconBg: 'border-destructive/35 bg-destructive/15 text-destructive',
    },
    {
      icon: <Clock size={20} strokeWidth={2.5} />,
      value: formatMinutes(stats.weeklyMinutes),
      label: t('app.dashboard.stats.weeklyTime'),
      chip: 'border-primary/35 bg-primary/10 text-primary',
      iconBg: 'border-primary/35 bg-primary/15 text-primary',
    },
    {
      icon: <Star size={20} strokeWidth={2.5} />,
      value: `+${stats.weeklyXP}`,
      label: t('app.dashboard.stats.weeklyXP'),
      chip: 'border-accent/40 bg-accent/20 text-accent-foreground',
      iconBg: 'border-accent/35 bg-accent/25 text-accent-foreground',
    },
    {
      icon: <Trophy size={20} strokeWidth={2.5} />,
      value: `${stats.achievementCount}`,
      label: t('app.dashboard.stats.achievements'),
      chip: 'border-success/35 bg-success/15 text-success',
      iconBg: 'border-success/35 bg-success/15 text-success',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-xl border-2 border-border bg-secondary/70 p-3 sm:p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div
              className={clsx(
                'flex h-10 w-10 items-center justify-center rounded-xl border',
                item.iconBg
              )}
            >
              {item.icon}
            </div>
            <span
              className={clsx(
                'rounded-lg border px-2.5 py-0.5 text-[11px] font-semibold',
                item.chip
              )}
            >
              {item.label}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-display font-bold text-foreground">{item.value}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
