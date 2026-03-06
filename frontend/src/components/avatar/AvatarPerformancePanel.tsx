import VrmAvatarPanel from './VrmAvatarPanel';
import { useAvatarPerformance } from './useAvatarPerformance';
import type { AvatarPerformanceSource } from './types';

type AvatarPerformancePanelProps = {
  enabled: boolean;
  source: Omit<AvatarPerformanceSource, 'now'>;
  modelUrl?: string;
  fallbackSrc?: string;
  statusLabel?: string;
  title?: string;
};

export default function AvatarPerformancePanel({
  enabled,
  source,
  modelUrl,
  fallbackSrc,
  statusLabel,
  title,
}: AvatarPerformancePanelProps) {
  const performance = useAvatarPerformance(source);

  return (
    <VrmAvatarPanel
      enabled={enabled}
      performance={performance}
      modelUrl={modelUrl}
      fallbackSrc={fallbackSrc}
      statusLabel={statusLabel}
      title={title}
    />
  );
}
