import type {
  AvatarBlinkMode,
  AvatarDialogueState,
  AvatarMotionGroup,
  AvatarState,
} from '@/types/avatarChat';
import type { AvatarPerformanceFrame } from './types';

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function resolveDialogueState(dialogueState: AvatarPerformanceFrame['dialogueState']): AvatarDialogueState {
  if (dialogueState === 'pre_speaking') {
    return 'speaking';
  }
  return dialogueState;
}

function resolveMotionGroup(frame: AvatarPerformanceFrame): AvatarMotionGroup {
  switch (frame.dialogueState) {
    case 'listening':
      return 'listen';
    case 'thinking':
      return 'think';
    case 'idle':
    case 'post_speaking':
      return 'idle';
    default:
      switch (frame.affect) {
        case 'curious':
          return 'question';
        case 'corrective':
          return 'corrective';
        case 'affirming':
          return 'affirm';
        case 'apologetic':
          return 'apology';
        default:
          return 'talk';
      }
  }
}

function resolveBlinkMode(dialogueState: AvatarPerformanceFrame['dialogueState']): AvatarBlinkMode {
  switch (dialogueState) {
    case 'listening':
      return 'focused';
    case 'thinking':
    case 'post_speaking':
      return 'soft';
    default:
      return 'auto';
  }
}

export function buildLive2DAvatarStateFromPerformance(frame: AvatarPerformanceFrame): AvatarState {
  return {
    dialogueState: resolveDialogueState(frame.dialogueState),
    affect: frame.affect,
    motionGroup: resolveMotionGroup(frame),
    gaze: {
      x: clamp(frame.gazeYaw * 9 + frame.headYaw * 12, -1, 1),
      y: clamp(frame.gazePitch * 10 + frame.headPitch * 10, -1, 1),
    },
    bodySway: clamp(0.08 + frame.intensity * 0.42 + Math.abs(frame.headRoll) * 3, 0.08, 0.36),
    blinkMode: resolveBlinkMode(frame.dialogueState),
    subtitleText: frame.debug.transcript,
    visemeHint: null,
  };
}
