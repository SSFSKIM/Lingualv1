import { useEffect, useRef, useState } from 'react';
import type { AvatarReaction, AvatarState } from '@/types/avatarChat';
import type { AvatarPerformanceFrame } from './types';
import { DEFAULT_AVATAR_STATE } from '@/types/avatarChat';
import {
  LINGUAL_TUTOR_LIVE2D_MANIFEST,
  type Live2DMotionRef,
} from './live2dManifest';
import {
  buildLive2DParameterTargets,
  resolveHitAreaName,
  type Live2DFocusPoint,
} from './live2dMapping';

type Live2DModelLike = {
  anchor: { set: (x: number, y: number) => void };
  scale: { set: (value: number) => void };
  x: number;
  y: number;
  interactive: boolean;
  buttonMode?: boolean;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off?: (event: string, listener: (...args: unknown[]) => void) => void;
  motion: (group: string, index?: number, priority?: number) => Promise<boolean>;
  expression: (id?: number | string) => Promise<boolean>;
  internalModel?: {
    coreModel?: {
      setParameterValueById?: (parameterId: string, value: number, weight?: number) => void;
    };
    settings?: {
      motions?: Record<string, unknown[]>;
      expressions?: Array<{ name?: string; Name?: string }>;
    };
  };
  destroy?: (options?: { children?: boolean }) => void;
  tap?: (x: number, y: number) => void;
};

type PixiAppLike = {
  view: HTMLCanvasElement;
  stage: {
    addChild: (child: Live2DModelLike) => void;
    removeChild: (child: Live2DModelLike) => void;
  };
  ticker: {
    add: (listener: () => void) => void;
    remove: (listener: () => void) => void;
  };
  destroy: (removeView?: boolean, stageOptions?: { children?: boolean }) => void;
};

type Live2DModule = {
  Live2DModel: {
    from: (source: string) => Promise<Live2DModelLike>;
  };
};

type Live2DAvatarPanelProps = {
  enabled?: boolean;
  title: string;
  statusLabel: string;
  avatarState?: AvatarState;
  avatarReaction?: AvatarReaction | null;
  performanceFrame?: AvatarPerformanceFrame | null;
  audioLevel?: number;
  fallbackSrc: string;
  onAvatarHit?: (area: string) => void;
};

let live2DCorePromise: Promise<void> | null = null;

function ensureLive2DCoreScript(src: string) {
  if ((window as typeof window & { Live2DCubismCore?: unknown }).Live2DCubismCore) {
    return Promise.resolve();
  }

  if (live2DCorePromise) {
    return live2DCorePromise;
  }

  live2DCorePromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(`script[data-live2d-core="${src}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Live2D Cubism Core')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.live2dCore = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Live2D Cubism Core'));
    document.head.appendChild(script);
  });

  return live2DCorePromise;
}

export default function Live2DAvatarPanel({
  enabled = true,
  title,
  statusLabel,
  avatarState = DEFAULT_AVATAR_STATE,
  avatarReaction = null,
  performanceFrame = null,
  audioLevel = 0,
  fallbackSrc,
  onAvatarHit,
}: Live2DAvatarPanelProps) {
  const manifest = LINGUAL_TUTOR_LIVE2D_MANIFEST;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pixiAppRef = useRef<PixiAppLike | null>(null);
  const modelRef = useRef<Live2DModelLike | null>(null);
  const pointerFocusRef = useRef<Live2DFocusPoint>({ x: 0, y: 0 });
  const lastMotionRef = useRef<string | null>(null);
  const lastMotionTriggerKeyRef = useRef<string | null>(null);
  const lastExpressionRef = useRef<string | null>(null);
  const localReactionTimeoutRef = useRef<number | null>(null);
  const avatarStateRef = useRef<AvatarState>(avatarState);
  const avatarReactionRef = useRef<AvatarReaction | null>(avatarReaction);
  const performanceRef = useRef<AvatarPerformanceFrame | null>(performanceFrame);
  const audioLevelRef = useRef(audioLevel);
  const localReactionRef = useRef<AvatarReaction | null>(null);
  const availableMotionGroupsRef = useRef<Record<string, number>>({});
  const availableExpressionsRef = useRef<string[]>([]);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [availableMotionGroups, setAvailableMotionGroups] = useState<string[]>([]);
  const [availableExpressions, setAvailableExpressions] = useState<string[]>([]);
  const [localReaction, setLocalReaction] = useState<AvatarReaction | null>(null);

  useEffect(() => {
    avatarStateRef.current = avatarState;
  }, [avatarState]);

  useEffect(() => {
    avatarReactionRef.current = avatarReaction;
  }, [avatarReaction]);

  useEffect(() => {
    performanceRef.current = performanceFrame;
  }, [performanceFrame]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    localReactionRef.current = localReaction;
  }, [localReaction]);

  useEffect(() => {
    return () => {
      if (localReactionTimeoutRef.current !== null) {
        window.clearTimeout(localReactionTimeoutRef.current);
      }
    };
  }, []);

  const chooseWeightedMotion = (
    candidates: Live2DMotionRef[],
    availableGroups: Record<string, number>,
    lastMotionKey: string | null
  ) => {
    const availableCandidates = candidates.filter((candidate) => {
      const count = availableGroups[candidate.group];
      if (typeof count !== 'number' || count <= 0) {
        return false;
      }
      const index = candidate.index ?? 0;
      return index >= 0 && index < count;
    });

    if (!availableCandidates.length) {
      return null;
    }

    const withoutLast = availableCandidates.filter((candidate) => `${candidate.group}:${candidate.index ?? 0}` !== lastMotionKey);
    const pool = withoutLast.length ? withoutLast : availableCandidates;
    const totalWeight = pool.reduce((sum, candidate) => sum + (candidate.weight ?? 1), 0);
    let cursor = Math.random() * totalWeight;
    for (const candidate of pool) {
      cursor -= candidate.weight ?? 1;
      if (cursor <= 0) {
        return candidate;
      }
    }
    return pool[pool.length - 1];
  };

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    let cancelled = false;
    let animationListener: (() => void) | null = null;
    let hitListener: ((areas: unknown) => void) | null = null;
    const mountNode = containerRef.current;

    const load = async () => {
      setLoadState('loading');
      setErrorMessage(null);

      try {
        await ensureLive2DCoreScript(manifest.coreScriptUrl);
        const PIXI = await import('pixi.js');
        (window as typeof window & { PIXI?: typeof PIXI }).PIXI = PIXI;
        const live2dModule = await import('pixi-live2d-display/cubism4') as Live2DModule;
        if (cancelled) return;

        const app = new PIXI.Application({
          resizeTo: mountNode,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
        }) as unknown as PixiAppLike;

        mountNode.replaceChildren(app.view);
        pixiAppRef.current = app;

        const model = await live2dModule.Live2DModel.from(manifest.modelJsonPath);
        if (cancelled) {
          app.destroy(true, { children: true });
          model.destroy?.({ children: true });
          return;
        }

        model.anchor.set(manifest.anchor.x, manifest.anchor.y);
        model.scale.set(manifest.scale);
        model.x = mountNode.clientWidth * manifest.position.x;
        model.y = mountNode.clientHeight * manifest.position.y;
        model.interactive = true;
        model.buttonMode = true;
        modelRef.current = model;
        lastMotionRef.current = null;
        lastMotionTriggerKeyRef.current = null;
        lastExpressionRef.current = null;
        app.stage.addChild(model);

        const settings = model.internalModel?.settings;
        const nextMotionGroupsRecord = Object.fromEntries(
          Object.entries(settings?.motions ?? {}).map(([groupName, entries]) => [groupName, Array.isArray(entries) ? entries.length : 0])
        );
        const nextMotionGroups = Object.keys(nextMotionGroupsRecord);
        const nextExpressions = (settings?.expressions ?? [])
          .map((entry) => entry.name ?? entry.Name ?? '')
          .filter(Boolean);
        availableMotionGroupsRef.current = nextMotionGroupsRecord;
        availableExpressionsRef.current = nextExpressions;
        setAvailableMotionGroups(nextMotionGroups);
        setAvailableExpressions(nextExpressions);

        hitListener = (areas) => {
          const hitAreas = Array.isArray(areas) ? areas : [];
          const firstArea = typeof hitAreas[0] === 'string' ? hitAreas[0] : 'body';
          const resolvedArea = resolveHitAreaName(manifest, firstArea);
          const instantReaction: AvatarReaction = {
            area: resolvedArea,
            affect: resolvedArea === 'head' || resolvedArea === 'face' ? 'curious' : 'affirming',
            motionGroup: resolvedArea === 'head'
              ? 'react_head'
              : resolvedArea === 'face'
                ? 'react_face'
                : 'react_body',
            subtitleText: resolvedArea === 'head' || resolvedArea === 'face' ? 'Oh?' : 'Ready.',
            durationMs: 700,
          };

          if (localReactionTimeoutRef.current !== null) {
            window.clearTimeout(localReactionTimeoutRef.current);
          }
          setLocalReaction(instantReaction);
          localReactionTimeoutRef.current = window.setTimeout(() => {
            setLocalReaction(null);
            localReactionTimeoutRef.current = null;
          }, instantReaction.durationMs);
          onAvatarHit?.(resolvedArea);
        };

        model.on('hit', hitListener);

        animationListener = () => {
          if (!modelRef.current || !containerRef.current) return;

          modelRef.current.x = containerRef.current.clientWidth * manifest.position.x;
          modelRef.current.y = containerRef.current.clientHeight * manifest.position.y;

          const effectiveReaction = localReactionRef.current ?? avatarReactionRef.current;
          const targets = buildLive2DParameterTargets({
            manifest,
            avatarState: avatarStateRef.current,
            avatarReaction: effectiveReaction,
            performance: performanceRef.current,
            audioLevel: audioLevelRef.current,
            pointerFocus: pointerFocusRef.current,
            now: performance.now(),
          });

          const coreModel = modelRef.current.internalModel?.coreModel;
          if (coreModel?.setParameterValueById) {
            for (const [parameterId, value] of Object.entries(targets.values)) {
              coreModel.setParameterValueById(parameterId, value);
            }
          }

          const motionTriggerKey = effectiveReaction
            ? `reaction:${effectiveReaction.motionGroup}:${effectiveReaction.area}`
            : `state:${avatarStateRef.current.dialogueState}:${targets.debug.motionKey}:${targets.emotionKey}`;
          if (motionTriggerKey !== lastMotionTriggerKeyRef.current) {
            lastMotionTriggerKeyRef.current = motionTriggerKey;
            const nextMotion = chooseWeightedMotion(
              targets.motionCandidates,
              availableMotionGroupsRef.current,
              lastMotionRef.current
            );
            if (nextMotion) {
              const motionKey = `${nextMotion.group}:${nextMotion.index ?? 0}`;
              lastMotionRef.current = motionKey;
              void modelRef.current.motion(nextMotion.group, nextMotion.index ?? 0);
            }
          }

          const nextExpression = targets.expressionCandidates.find((candidate) => availableExpressionsRef.current.includes(candidate))
            ?? (manifest.defaultExpression && availableExpressionsRef.current.includes(manifest.defaultExpression)
              ? manifest.defaultExpression
              : null);
          if (nextExpression && lastExpressionRef.current !== nextExpression) {
            lastExpressionRef.current = nextExpression;
            void modelRef.current.expression(nextExpression);
          }
        };

        app.ticker.add(animationListener);
        setLoadState('ready');
      } catch (loadError) {
        setLoadState('error');
        setErrorMessage(loadError instanceof Error ? loadError.message : 'Failed to load Live2D avatar');
      }
    };

    void load();

    return () => {
      cancelled = true;

      if (animationListener && pixiAppRef.current) {
        pixiAppRef.current.ticker.remove(animationListener);
      }

      if (hitListener && modelRef.current?.off) {
        modelRef.current.off('hit', hitListener);
      }

      if (modelRef.current && pixiAppRef.current) {
        pixiAppRef.current.stage.removeChild(modelRef.current);
        modelRef.current.destroy?.({ children: true });
      }

      modelRef.current = null;
      lastMotionRef.current = null;
      lastMotionTriggerKeyRef.current = null;
      lastExpressionRef.current = null;
      availableMotionGroupsRef.current = {};
      availableExpressionsRef.current = [];
      setAvailableMotionGroups([]);
      setAvailableExpressions([]);

      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true });
        pixiAppRef.current = null;
      }
    };
  }, [enabled, manifest, onAvatarHit]);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    pointerFocusRef.current = {
      x: Math.max(-1, Math.min(1, normalizedX)),
      y: Math.max(-1, Math.min(1, normalizedY)),
    };
  };

  const handlePointerLeave = () => {
    pointerFocusRef.current = { x: 0, y: 0 };
  };

  const handlePointerTap = (event: React.PointerEvent<HTMLDivElement>) => {
    const model = modelRef.current;
    if (!model?.tap || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    model.tap(x, y);
  };

  const effectiveReaction = localReaction ?? avatarReaction;
  const subtitleText = effectiveReaction?.subtitleText || avatarState.subtitleText;

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,#fff8f1_0%,#f2ede7_48%,#e7dfd4_100%)]">
      <div
        ref={containerRef}
        className="relative flex-1"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerUp={handlePointerTap}
      />

      {(loadState !== 'ready' || errorMessage) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]">
          <div className="pointer-events-auto flex max-w-xs flex-col items-center rounded-3xl border-3 border-foreground bg-card/95 px-5 py-6 text-center shadow-stamp">
            <img
              src={fallbackSrc}
              alt={title}
              className="mb-4 h-24 w-24 rounded-2xl border-3 border-foreground object-cover"
            />
            <p className="text-sm font-display font-bold text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {loadState === 'loading' ? 'Loading Live2D runtime…' : 'Live2D model not available yet.'}
            </p>
            {errorMessage ? (
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{errorMessage}</p>
            ) : null}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5">
        <div className="rounded-3xl border-3 border-foreground bg-card/92 px-4 py-3 shadow-stamp backdrop-blur-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{title}</p>
              <p className="mt-1 text-sm font-bold text-foreground">{statusLabel}</p>
            </div>
            {import.meta.env.DEV ? (
              <button
                type="button"
                className="pointer-events-auto rounded-xl border-2 border-border bg-secondary px-2 py-1 text-[10px] font-bold text-muted-foreground"
                onClick={() => setShowDebug((previous) => !previous)}
              >
                {showDebug ? 'Hide Debug' : 'Debug'}
              </button>
            ) : null}
          </div>

          {subtitleText ? (
            <p className="mt-3 rounded-2xl border-2 border-border bg-white/70 px-3 py-2 text-sm leading-6 text-foreground">
              {subtitleText}
            </p>
          ) : null}
        </div>
      </div>

      {import.meta.env.DEV && showDebug ? (
        <div className="absolute right-4 top-4 w-64 rounded-2xl border-3 border-foreground bg-card/95 p-3 text-[11px] leading-5 shadow-stamp">
          <p className="font-black text-primary">Live2D Debug</p>
          <p className="mt-1 text-muted-foreground">State: {avatarState.dialogueState}</p>
          <p className="text-muted-foreground">Affect: {avatarState.affect}</p>
          <p className="text-muted-foreground">Motion: {avatarState.motionGroup}</p>
          <p className="text-muted-foreground">Audio: {audioLevel.toFixed(3)}</p>
          <p className="text-muted-foreground">Load: {loadState}</p>
          <p className="mt-2 font-bold text-foreground">Expressions</p>
          <p className="text-muted-foreground">{availableExpressions.join(', ') || 'none'}</p>
          <p className="mt-2 font-bold text-foreground">Motion groups</p>
          <p className="max-h-20 overflow-auto text-muted-foreground">{availableMotionGroups.join(', ') || 'none'}</p>
          {effectiveReaction ? (
            <>
              <p className="mt-2 font-bold text-foreground">Reaction</p>
              <p className="text-muted-foreground">{effectiveReaction.area} / {effectiveReaction.motionGroup}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
