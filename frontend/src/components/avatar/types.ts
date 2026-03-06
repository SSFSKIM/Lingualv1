export type AvatarChatMode = 'text' | 'realtime';

export type AvatarDialogueState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'pre_speaking'
  | 'speaking'
  | 'post_speaking';

export type AvatarAffect =
  | 'neutral'
  | 'encouraging'
  | 'curious'
  | 'corrective'
  | 'affirming'
  | 'apologetic';

export type AvatarPerformanceSource = {
  mode: AvatarChatMode;
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  remoteAudioStream: MediaStream | null;
  assistantTranscriptDelta: string;
  assistantTranscriptFinal: string;
  assistantSpeechStartedAt: number | null;
  assistantSpeechEndedAt: number | null;
  now: number;
};

export type AvatarPerformanceDebug = {
  audioLevel: number;
  transcript: string;
  hasRemoteAudio: boolean;
  detectedExpressionKeys: string[];
};

export type AvatarPerformanceFrame = {
  dialogueState: AvatarDialogueState;
  affect: AvatarAffect;
  intensity: number;
  jawOpen: number;
  mouthRound: number;
  mouthSpread: number;
  smile: number;
  browInnerUp: number;
  browOuterUp: number;
  browDown: number;
  blink: number;
  gazeYaw: number;
  gazePitch: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  neckPitch: number;
  chestPitch: number;
  debug: AvatarPerformanceDebug;
};
