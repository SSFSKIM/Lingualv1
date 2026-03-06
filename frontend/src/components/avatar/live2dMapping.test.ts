import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR_STATE, type AvatarReaction } from '@/types/avatarChat';
import { LINGUAL_TUTOR_LIVE2D_MANIFEST } from './live2dManifest';
import {
  buildLive2DParameterTargets,
  resolveHitAreaName,
  resolveMotionCandidates,
} from './live2dMapping';

describe('live2dMapping', () => {
  it('drives mouth open during speaking even with low audio to avoid a dead face', () => {
    const targets = buildLive2DParameterTargets({
      manifest: LINGUAL_TUTOR_LIVE2D_MANIFEST,
      avatarState: {
        ...DEFAULT_AVATAR_STATE,
        dialogueState: 'speaking',
        motionGroup: 'talk',
      },
      avatarReaction: null,
      audioLevel: 0,
      pointerFocus: { x: 0, y: 0 },
      now: 1_250,
    });

    expect(targets.values.ParamA).toBeGreaterThan(0.15);
    expect(targets.motionCandidates[0]).toMatchObject({ group: '', index: 0 });
    expect(targets.emotionKey).toBe('neutral');
  });

  it('prioritizes reaction motions ahead of dialogue motions', () => {
    const reaction: AvatarReaction = {
      area: 'head',
      affect: 'curious',
      motionGroup: 'react_head',
      subtitleText: 'Oh?',
      durationMs: 700,
    };

    const candidates = resolveMotionCandidates(
      LINGUAL_TUTOR_LIVE2D_MANIFEST,
      {
        ...DEFAULT_AVATAR_STATE,
        dialogueState: 'speaking',
        motionGroup: 'talk',
      },
      reaction
    );

    expect(candidates[0]).toMatchObject({ group: '', index: 3 });
    expect(candidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ group: '', index: 3 }),
      expect.objectContaining({ group: '', index: 5 }),
    ]));
  });

  it('maps raw live2d hit area aliases back into logical Lingual hit areas', () => {
    expect(resolveHitAreaName(LINGUAL_TUTOR_LIVE2D_MANIFEST, 'HitAreaHead')).toBe('head');
    expect(resolveHitAreaName(LINGUAL_TUTOR_LIVE2D_MANIFEST, 'Body')).toBe('body');
    expect(resolveHitAreaName(LINGUAL_TUTOR_LIVE2D_MANIFEST, 'unknown')).toBe('body');
  });

  it('uses richer facial parameters and emotion keys for corrective speech', () => {
    const targets = buildLive2DParameterTargets({
      manifest: LINGUAL_TUTOR_LIVE2D_MANIFEST,
      avatarState: {
        ...DEFAULT_AVATAR_STATE,
        dialogueState: 'speaking',
        affect: 'corrective',
        motionGroup: 'corrective',
        subtitleText: 'Try saying it this way.',
      },
      avatarReaction: null,
      audioLevel: 0.18,
      pointerFocus: { x: 0.15, y: -0.1 },
      now: 880,
      performance: {
        dialogueState: 'speaking',
        affect: 'corrective',
        intensity: 0.52,
        jawOpen: 0.34,
        mouthRound: 0.12,
        mouthSpread: 0.28,
        smile: 0.06,
        browInnerUp: 0.05,
        browOuterUp: 0.04,
        browDown: 0.31,
        blink: 0,
        gazeYaw: 0.04,
        gazePitch: -0.02,
        headPitch: 0.03,
        headYaw: 0.02,
        headRoll: 0.01,
        neckPitch: 0.01,
        chestPitch: 0.02,
        debug: {
          audioLevel: 0.18,
          transcript: 'Try saying it this way.',
          hasRemoteAudio: true,
          detectedExpressionKeys: [],
        },
      },
    });

    expect(targets.emotionKey).toBe('anger');
    expect(targets.values.ParamMouthAngry).toBeGreaterThan(0.3);
    expect(targets.values.ParamBrowLAngle).toBeLessThan(0);
    expect(targets.values.ParamBreath).toBeGreaterThan(0.2);
  });
});
