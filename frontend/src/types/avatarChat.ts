export type AvatarDialogueState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'post_speaking';

export type AvatarAffect =
  | 'neutral'
  | 'encouraging'
  | 'curious'
  | 'corrective'
  | 'affirming'
  | 'apologetic';

export type AvatarMotionGroup =
  | 'idle'
  | 'listen'
  | 'think'
  | 'talk'
  | 'question'
  | 'affirm'
  | 'corrective'
  | 'apology'
  | 'react_head'
  | 'react_body'
  | 'react_face';

export type AvatarBlinkMode = 'auto' | 'focused' | 'soft';

export type AvatarGaze = {
  x: number;
  y: number;
};

export type AvatarState = {
  dialogueState: AvatarDialogueState;
  affect: AvatarAffect;
  motionGroup: AvatarMotionGroup;
  gaze: AvatarGaze;
  bodySway: number;
  blinkMode: AvatarBlinkMode;
  subtitleText: string;
  visemeHint?: string | null;
};

export type AvatarReaction = {
  area: string;
  affect: AvatarAffect;
  motionGroup: Extract<AvatarMotionGroup, 'react_head' | 'react_body' | 'react_face'>;
  subtitleText: string;
  durationMs: number;
};

export type AvatarChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isFinal?: boolean;
  sortOrder: number;
};

export type AvatarSessionParams = {
  uiLanguage?: string;
  chatId?: string | null;
  practice?: unknown;
};

export type AvatarClientEvent =
  | { type: 'mic.audio.chunk'; audioBase64: string; mimeType: string }
  | { type: 'mic.audio.end' }
  | { type: 'chat.interrupt' }
  | { type: 'avatar.hit'; area: string }
  | { type: 'session.close' };

export type AvatarServerEvent =
  | { type: 'session.ready'; sessionId: string; chatId?: string | null }
  | { type: 'turn.state'; state: AvatarDialogueState }
  | { type: 'transcript.user.partial'; itemId: string; text: string }
  | { type: 'transcript.user.final'; itemId: string; text: string; timestamp: string }
  | { type: 'assistant.reply.delta'; itemId: string; delta: string }
  | { type: 'assistant.reply.final'; itemId: string; text: string; timestamp: string }
  | { type: 'assistant.audio.chunk'; itemId: string; audioBase64: string; mimeType: string; chunkIndex: number; segmentIndex?: number }
  | { type: 'assistant.audio.done'; itemId: string; mimeType: string; segmentIndex?: number; isFinal?: boolean }
  | { type: 'avatar.state'; dialogueState: AvatarDialogueState; affect: AvatarAffect; motionGroup: AvatarMotionGroup; gaze: AvatarGaze; bodySway: number; blinkMode: AvatarBlinkMode; subtitleText: string; visemeHint?: string | null }
  | { type: 'avatar.reaction'; area: string; affect: AvatarAffect; motionGroup: Extract<AvatarMotionGroup, 'react_head' | 'react_body' | 'react_face'>; subtitleText: string; durationMs: number }
  | { type: 'error'; message: string };

export const DEFAULT_AVATAR_STATE: AvatarState = {
  dialogueState: 'idle',
  affect: 'neutral',
  motionGroup: 'idle',
  gaze: { x: 0, y: -0.08 },
  bodySway: 0.22,
  blinkMode: 'auto',
  subtitleText: '',
  visemeHint: null,
};
