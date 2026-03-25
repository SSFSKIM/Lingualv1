import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCanvasStatus, syncCanvas, disconnectCanvas } from '@/api/canvas';
import type { CanvasConnectionStatus } from '@/types/canvas';
import { Button } from '@/components/ui';

interface Props {
  classId: string;
}

export function CanvasSyncStatus({ classId }: Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CanvasConnectionStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const data = await getCanvasStatus(classId);
      setStatus(data);
    } catch {
      // Non-critical — just means status unavailable
    }
  }, [classId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncCanvas(classId);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectCanvas(classId);
      setStatus({ connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    }
  };

  if (!status) return null;

  if (!status.connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/app/teacher/classes/${classId}/canvas/connect`)}
      >
        Connect Canvas
      </Button>
    );
  }

  const statusLabel =
    status.syncStatus === 'completed'
      ? 'Synced'
      : status.syncStatus === 'syncing'
        ? 'Syncing...'
        : status.syncStatus === 'error'
          ? 'Sync error'
          : 'Never synced';

  return (
    <div className="flex items-center gap-2" data-testid="canvas-sync-status">
      <span className="text-xs text-muted-foreground">
        Canvas: {status.canvasCourseName || status.canvasCourseId}
      </span>
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
          status.syncStatus === 'completed'
            ? 'bg-green-100 text-green-700'
            : status.syncStatus === 'error'
              ? 'bg-red-100 text-red-700'
              : 'bg-gray-100 text-gray-600'
        }`}
      >
        {statusLabel}
      </span>
      <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Re-sync'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleDisconnect}>
        Disconnect
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
