import { useCallback, useEffect, useRef, useState } from 'react';
import { createAvatarChatSession } from '@/api/avatarChat';
import type {
  AvatarChatMessage,
  AvatarReaction,
  AvatarServerEvent,
  AvatarSessionParams,
  AvatarState,
  AvatarDialogueState,
  AvatarClientEvent,
} from '@/types/avatarChat';
import { DEFAULT_AVATAR_STATE } from '@/types/avatarChat';

type UseAvatarChatSessionOptions = {
  onMessage?: (role: 'user' | 'assistant', content: string) => void;
  sessionParams?: AvatarSessionParams;
};

type UseAvatarChatSessionReturn = {
  isConnected: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  dialogueState: AvatarDialogueState;
  messages: AvatarChatMessage[];
  remoteAudioStream: MediaStream | null;
  assistantTranscriptDelta: string;
  assistantTranscriptFinal: string;
  assistantSpeechStartedAt: number | null;
  assistantSpeechEndedAt: number | null;
  avatarState: AvatarState;
  avatarReaction: AvatarReaction | null;
  assistantAudioLevel: number;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  sendAvatarHit: (area: string) => void;
  clearMessages: () => void;
};

const INPUT_VAD_THRESHOLD = 0.02;
const INPUT_VAD_SILENCE_MS = 650;
const INPUT_VAD_MAX_RECORDING_MS = 14_000;

type AssistantAudioSegment = {
  chunks: Uint8Array[];
  mimeType: string;
  isFinal: boolean;
};

function createEmptyAssistantTimestamps() {
  return {
    startedAt: null as number | null,
    endedAt: null as number | null,
  };
}

function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function encodeArrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildWebSocketUrl(path: string): string {
  const explicitOrigin = import.meta.env.VITE_AVATAR_CHAT_WS_ORIGIN?.trim();
  if (explicitOrigin) {
    const originUrl = new URL(explicitOrigin, window.location.origin);
    originUrl.protocol = originUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return new URL(path, originUrl.toString()).toString();
  }

  const currentUrl = new URL(window.location.href);
  if (import.meta.env.DEV && (currentUrl.port === '5173' || currentUrl.port === '3000')) {
    const backendUrl = new URL(`${currentUrl.protocol}//${currentUrl.hostname}:5001`);
    backendUrl.protocol = backendUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return new URL(path, backendUrl.toString()).toString();
  }

  currentUrl.protocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  currentUrl.pathname = path;
  currentUrl.search = '';
  currentUrl.hash = '';
  return currentUrl.toString();
}

export function useAvatarChatSession(
  options?: UseAvatarChatSessionOptions
): UseAvatarChatSessionReturn {
  const onMessageCallback = options?.onMessage;
  const sessionParams = options?.sessionParams;
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [dialogueState, setDialogueState] = useState<AvatarDialogueState>('idle');
  const [messages, setMessages] = useState<AvatarChatMessage[]>([]);
  const [assistantTranscriptDelta, setAssistantTranscriptDelta] = useState('');
  const [assistantTranscriptFinal, setAssistantTranscriptFinal] = useState('');
  const [assistantSpeechStartedAt, setAssistantSpeechStartedAt] = useState<number | null>(null);
  const [assistantSpeechEndedAt, setAssistantSpeechEndedAt] = useState<number | null>(null);
  const [avatarState, setAvatarState] = useState<AvatarState>(DEFAULT_AVATAR_STATE);
  const [avatarReaction, setAvatarReaction] = useState<AvatarReaction | null>(null);
  const [assistantAudioLevel, setAssistantAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioMeterFrameRef = useRef<number | null>(null);
  const micVadFrameRef = useRef<number | null>(null);
  const pendingAudioChunksRef = useRef<Uint8Array[]>([]);
  const pendingAudioMimeTypeRef = useRef<string>('audio/mpeg');
  const playbackQueueRef = useRef<AssistantAudioSegment[]>([]);
  const playbackUrlRef = useRef<string | null>(null);
  const reactionTimeoutRef = useRef<number | null>(null);
  const resumeListeningTimeoutRef = useRef<number | null>(null);
  const postSpeakingTimeoutRef = useRef<number | null>(null);
  const finalizedIdsRef = useRef<Set<string>>(new Set());
  const messageOrderRef = useRef<Map<string, number>>(new Map());
  const nextMessageOrderRef = useRef(0);
  const dialogueStateRef = useRef<AvatarDialogueState>('idle');
  const isConnectedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isPlaybackActiveRef = useRef(false);
  const autoResumeRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const silenceStartedAtRef = useRef<number | null>(null);
  const recorderStartedAtRef = useRef<number | null>(null);
  const assistantTimestampsRef = useRef(createEmptyAssistantTimestamps());
  const startListeningRef = useRef<() => Promise<void>>(async () => undefined);
  const setLocalDialogueStateRef = useRef<(nextState: AvatarDialogueState) => void>(() => undefined);
  const playNextAssistantAudioSegmentRef = useRef<() => Promise<void>>(async () => undefined);

  const clearReactionTimeout = useCallback(() => {
    if (reactionTimeoutRef.current === null) return;
    window.clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = null;
  }, []);

  const resetAssistantTimestamps = useCallback(() => {
    assistantTimestampsRef.current = createEmptyAssistantTimestamps();
    setAssistantSpeechStartedAt(null);
    setAssistantSpeechEndedAt(null);
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (audioMeterFrameRef.current !== null) {
      window.cancelAnimationFrame(audioMeterFrameRef.current);
      audioMeterFrameRef.current = null;
    }
    setAssistantAudioLevel(0);
  }, []);

  const clearResumeListeningTimeout = useCallback(() => {
    if (resumeListeningTimeoutRef.current === null) return;
    window.clearTimeout(resumeListeningTimeoutRef.current);
    resumeListeningTimeoutRef.current = null;
  }, []);

  const clearPostSpeakingTimeout = useCallback(() => {
    if (postSpeakingTimeoutRef.current === null) return;
    window.clearTimeout(postSpeakingTimeoutRef.current);
    postSpeakingTimeoutRef.current = null;
  }, []);

  const stopMicVadLoop = useCallback(() => {
    if (micVadFrameRef.current !== null) {
      window.cancelAnimationFrame(micVadFrameRef.current);
      micVadFrameRef.current = null;
    }
    speechDetectedRef.current = false;
    silenceStartedAtRef.current = null;
    recorderStartedAtRef.current = null;
  }, []);

  const resetAudioPlayback = useCallback(() => {
    stopAudioMeter();
    clearPostSpeakingTimeout();
    pendingAudioChunksRef.current = [];
    pendingAudioMimeTypeRef.current = 'audio/mpeg';
    playbackQueueRef.current = [];
    isPlaybackActiveRef.current = false;

    const audioElement = audioElementRef.current;
    if (audioElement) {
      audioElement.onended = null;
      audioElement.pause();
      audioElement.removeAttribute('src');
      audioElement.load();
    }

    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
    }
  }, [clearPostSpeakingTimeout, stopAudioMeter]);

  const ensureAudioGraph = useCallback(async () => {
    if (!audioElementRef.current) {
      const audioElement = new Audio();
      audioElement.preload = 'auto';
      audioElement.crossOrigin = 'anonymous';
      audioElementRef.current = audioElement;
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 1024;
    }

    if (!audioSourceNodeRef.current && audioElementRef.current) {
      audioSourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioElementRef.current);
      audioSourceNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return analyserRef.current;
  }, []);

  const ensureMicAnalyser = useCallback(async () => {
    if (!mediaStreamRef.current) {
      return null;
    }

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (!micAnalyserRef.current) {
      micAnalyserRef.current = audioContextRef.current.createAnalyser();
      micAnalyserRef.current.fftSize = 1024;
      micAnalyserRef.current.smoothingTimeConstant = 0.18;
    }

    if (!micSourceNodeRef.current) {
      micSourceNodeRef.current = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      micSourceNodeRef.current.connect(micAnalyserRef.current);
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return micAnalyserRef.current;
  }, []);

  const startAudioMeter = useCallback(() => {
    const analyser = analyserRef.current;
    const audioElement = audioElementRef.current;
    if (!analyser || !audioElement) return;

    const waveform = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current || !audioElementRef.current) {
        audioMeterFrameRef.current = null;
        return;
      }

      analyserRef.current.getByteTimeDomainData(waveform);
      let sum = 0;
      for (let index = 0; index < waveform.length; index += 1) {
        const normalized = (waveform[index] - 128) / 128;
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / waveform.length);
      const active = !audioElementRef.current.paused && !audioElementRef.current.ended;
      setAssistantAudioLevel(active ? Math.min(1, rms * 5.2) : 0);

      audioMeterFrameRef.current = window.requestAnimationFrame(tick);
    };

    stopAudioMeter();
    audioMeterFrameRef.current = window.requestAnimationFrame(tick);
  }, [stopAudioMeter]);

  const scheduleAutoResumeListening = useCallback(() => {
    clearResumeListeningTimeout();
    if (
      !autoResumeRef.current ||
      !isConnectedRef.current ||
      mediaRecorderRef.current ||
      isSpeakingRef.current ||
      isPlaybackActiveRef.current ||
      playbackQueueRef.current.length > 0
    ) {
      return;
    }

    resumeListeningTimeoutRef.current = window.setTimeout(() => {
      void startListeningRef.current().catch((resumeError) => {
        setError(resumeError instanceof Error ? resumeError.message : 'Failed to resume listening');
      });
    }, 250);
  }, [clearResumeListeningTimeout]);

  const finalizeAssistantPlayback = useCallback(() => {
    clearPostSpeakingTimeout();
    setLocalDialogueStateRef.current('post_speaking');
    setAvatarState((previous) => ({
      ...previous,
      dialogueState: 'post_speaking',
      motionGroup: 'idle',
      subtitleText: '',
      gaze: { x: 0, y: -0.08 },
      bodySway: 0.12,
      blinkMode: 'soft',
      visemeHint: null,
    }));

    postSpeakingTimeoutRef.current = window.setTimeout(() => {
      postSpeakingTimeoutRef.current = null;
      setLocalDialogueStateRef.current('idle');
      setAvatarState((previous) => ({
        ...previous,
        dialogueState: 'idle',
        motionGroup: 'idle',
        subtitleText: '',
        gaze: { x: 0, y: -0.08 },
        bodySway: 0.22,
        blinkMode: 'auto',
        visemeHint: null,
      }));
      scheduleAutoResumeListening();
    }, 180);
  }, [clearPostSpeakingTimeout, scheduleAutoResumeListening]);

  const playNextAssistantAudioSegment = useCallback(async () => {
    if (isPlaybackActiveRef.current || playbackQueueRef.current.length === 0) {
      return;
    }

    const nextSegment = playbackQueueRef.current.shift();
    if (!nextSegment) {
      return;
    }

    const analyser = await ensureAudioGraph();
    if (!audioElementRef.current) {
      return;
    }

    const blobParts = nextSegment.chunks.map((chunk) => {
      const copy = new Uint8Array(chunk.byteLength);
      copy.set(chunk);
      return copy;
    });
    const blob = new Blob(blobParts, { type: nextSegment.mimeType });

    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
    }

    playbackUrlRef.current = URL.createObjectURL(blob);
    audioElementRef.current.src = playbackUrlRef.current;
    isPlaybackActiveRef.current = true;
    audioElementRef.current.onended = () => {
      stopAudioMeter();
      isPlaybackActiveRef.current = false;

      if (nextSegment.isFinal && playbackQueueRef.current.length === 0) {
        finalizeAssistantPlayback();
        return;
      }

      void playNextAssistantAudioSegmentRef.current();
    };

    try {
      if (analyser) {
        startAudioMeter();
      }
      await audioElementRef.current.play();
    } catch (playError) {
      stopAudioMeter();
      isPlaybackActiveRef.current = false;
      setError(playError instanceof Error ? playError.message : 'Failed to play assistant audio');
    }
  }, [ensureAudioGraph, finalizeAssistantPlayback, startAudioMeter, stopAudioMeter]);

  const enqueueAssistantAudioSegment = useCallback((mimeType: string, isFinal: boolean) => {
    const nextChunks = pendingAudioChunksRef.current;
    pendingAudioChunksRef.current = [];
    pendingAudioMimeTypeRef.current = 'audio/mpeg';

    if (!nextChunks.length) {
      if (isFinal && !isPlaybackActiveRef.current && playbackQueueRef.current.length === 0) {
        finalizeAssistantPlayback();
      }
      return;
    }

    playbackQueueRef.current.push({
      chunks: nextChunks,
      mimeType,
      isFinal,
    });
    void playNextAssistantAudioSegmentRef.current();
  }, [finalizeAssistantPlayback]);

  const updateMessage = useCallback((
    role: 'user' | 'assistant',
    itemId: string,
    content: string,
    {
      timestamp,
      isFinal,
      append,
    }: {
      timestamp: string;
      isFinal: boolean;
      append: boolean;
    },
  ) => {
    const order = messageOrderRef.current.get(itemId) ?? nextMessageOrderRef.current;
    if (!messageOrderRef.current.has(itemId)) {
      messageOrderRef.current.set(itemId, order);
      nextMessageOrderRef.current += 1;
    }

    setMessages((previous) => {
      const existingIndex = previous.findIndex((message) => message.id === itemId);
      if (existingIndex === -1) {
        return [
          ...previous,
          {
            id: itemId,
            role,
            content,
            timestamp,
            isFinal,
            sortOrder: order,
          },
        ].sort((first, second) => first.sortOrder - second.sortOrder);
      }

      const existing = previous[existingIndex];
      const nextContent = append ? `${existing.content}${content}` : content;
      const nextMessages = [...previous];
      nextMessages[existingIndex] = {
        ...existing,
        content: nextContent,
        timestamp,
        isFinal,
      };
      return nextMessages;
    });
  }, []);

  const setLocalDialogueState = useCallback((nextState: AvatarDialogueState) => {
    dialogueStateRef.current = nextState;
    setDialogueState(nextState);

    const nextIsListening = nextState === 'listening';
    const nextIsSpeaking = nextState === 'speaking';
    isSpeakingRef.current = nextIsSpeaking;
    setIsListening(nextIsListening);
    setIsSpeaking(nextIsSpeaking);

    if (nextIsSpeaking && assistantTimestampsRef.current.startedAt === null) {
      assistantTimestampsRef.current.startedAt = Date.now();
      assistantTimestampsRef.current.endedAt = null;
      setAssistantSpeechStartedAt(assistantTimestampsRef.current.startedAt);
      setAssistantSpeechEndedAt(null);
    }

    if (!nextIsSpeaking && assistantTimestampsRef.current.startedAt !== null && assistantTimestampsRef.current.endedAt === null) {
      assistantTimestampsRef.current.endedAt = Date.now();
      setAssistantSpeechEndedAt(assistantTimestampsRef.current.endedAt);
    }
  }, []);

  useEffect(() => {
    setLocalDialogueStateRef.current = setLocalDialogueState;
  }, [setLocalDialogueState]);

  const sendClientEvent = useCallback((payload: AvatarClientEvent) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return false;
    }
    wsRef.current.send(JSON.stringify(payload));
    return true;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setAssistantTranscriptDelta('');
    setAssistantTranscriptFinal('');
    finalizedIdsRef.current.clear();
    messageOrderRef.current.clear();
    nextMessageOrderRef.current = 0;
    clearReactionTimeout();
    setAvatarReaction(null);
    setAvatarState(DEFAULT_AVATAR_STATE);
    setLocalDialogueState('idle');
    resetAssistantTimestamps();
  }, [clearReactionTimeout, resetAssistantTimestamps, setLocalDialogueState]);

  const disconnect = useCallback(() => {
    autoResumeRef.current = false;
    clearResumeListeningTimeout();
    sendClientEvent({ type: 'session.close' });

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    clearReactionTimeout();
    setAvatarReaction(null);
    resetAudioPlayback();
    stopMicVadLoop();
    setIsConnected(false);
    isConnectedRef.current = false;
    setError(null);
    setAvatarState(DEFAULT_AVATAR_STATE);
    setLocalDialogueState('idle');
    resetAssistantTimestamps();
  }, [
    clearResumeListeningTimeout,
    clearReactionTimeout,
    resetAudioPlayback,
    resetAssistantTimestamps,
    sendClientEvent,
    setLocalDialogueState,
    stopMicVadLoop,
  ]);

  const startMicVadLoop = useCallback(async () => {
    const analyser = await ensureMicAnalyser();
    if (!analyser) return;

    stopMicVadLoop();
    speechDetectedRef.current = false;
    silenceStartedAtRef.current = null;
    recorderStartedAtRef.current = performance.now();
    const waveform = new Uint8Array(analyser.fftSize);

    const tick = () => {
      const recorder = mediaRecorderRef.current;
      const currentAnalyser = micAnalyserRef.current;

      if (!recorder || recorder.state !== 'recording' || !currentAnalyser) {
        micVadFrameRef.current = null;
        return;
      }

      currentAnalyser.getByteTimeDomainData(waveform);
      let sum = 0;
      for (let index = 0; index < waveform.length; index += 1) {
        const normalized = (waveform[index] - 128) / 128;
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / waveform.length);
      const now = performance.now();

      if (rms >= INPUT_VAD_THRESHOLD) {
        speechDetectedRef.current = true;
        silenceStartedAtRef.current = null;
      } else if (speechDetectedRef.current) {
        if (silenceStartedAtRef.current === null) {
          silenceStartedAtRef.current = now;
        } else if (now - silenceStartedAtRef.current >= INPUT_VAD_SILENCE_MS) {
          recorder.stop();
          micVadFrameRef.current = null;
          return;
        }
      }

      if (
        speechDetectedRef.current &&
        recorderStartedAtRef.current !== null &&
        now - recorderStartedAtRef.current >= INPUT_VAD_MAX_RECORDING_MS
      ) {
        recorder.stop();
        micVadFrameRef.current = null;
        return;
      }

      micVadFrameRef.current = window.requestAnimationFrame(tick);
    };

    micVadFrameRef.current = window.requestAnimationFrame(tick);
  }, [ensureMicAnalyser, stopMicVadLoop]);

  const handleServerEvent = useCallback(async (event: AvatarServerEvent) => {
    switch (event.type) {
      case 'session.ready':
        setIsConnected(true);
        isConnectedRef.current = true;
        return;

      case 'turn.state':
        clearResumeListeningTimeout();
        if (
          event.state === 'idle' &&
          (isPlaybackActiveRef.current || playbackQueueRef.current.length > 0)
        ) {
          return;
        }
        setLocalDialogueState(event.state);
        if (
          event.state === 'idle' &&
          !isPlaybackActiveRef.current &&
          playbackQueueRef.current.length === 0
        ) {
          scheduleAutoResumeListening();
        }
        return;

      case 'transcript.user.partial':
        updateMessage('user', event.itemId, event.text, {
          timestamp: new Date().toISOString(),
          isFinal: false,
          append: false,
        });
        return;

      case 'transcript.user.final':
        updateMessage('user', event.itemId, event.text, {
          timestamp: event.timestamp,
          isFinal: true,
          append: false,
        });
        if (!finalizedIdsRef.current.has(event.itemId)) {
          finalizedIdsRef.current.add(event.itemId);
          onMessageCallback?.('user', event.text.trim());
        }
        return;

      case 'assistant.reply.delta':
        updateMessage('assistant', event.itemId, event.delta, {
          timestamp: new Date().toISOString(),
          isFinal: false,
          append: true,
        });
        setAssistantTranscriptDelta((previous) => `${previous}${event.delta}`);
        return;

      case 'assistant.reply.final':
        updateMessage('assistant', event.itemId, event.text, {
          timestamp: event.timestamp,
          isFinal: true,
          append: false,
        });
        setAssistantTranscriptDelta(event.text);
        setAssistantTranscriptFinal(event.text);
        if (!finalizedIdsRef.current.has(event.itemId)) {
          finalizedIdsRef.current.add(event.itemId);
          onMessageCallback?.('assistant', event.text.trim());
        }
        return;

      case 'assistant.audio.chunk':
        pendingAudioChunksRef.current.push(decodeBase64ToUint8Array(event.audioBase64));
        pendingAudioMimeTypeRef.current = event.mimeType || 'audio/mpeg';
        return;

      case 'assistant.audio.done':
        enqueueAssistantAudioSegment(
          event.mimeType || pendingAudioMimeTypeRef.current || 'audio/mpeg',
          Boolean(event.isFinal)
        );
        return;

      case 'avatar.state':
        setAvatarState({
          dialogueState: event.dialogueState,
          affect: event.affect,
          motionGroup: event.motionGroup,
          gaze: event.gaze,
          bodySway: event.bodySway,
          blinkMode: event.blinkMode,
          subtitleText: event.subtitleText,
          visemeHint: event.visemeHint ?? null,
        });
        return;

      case 'avatar.reaction':
        clearReactionTimeout();
        setAvatarReaction({
          area: event.area,
          affect: event.affect,
          motionGroup: event.motionGroup,
          subtitleText: event.subtitleText,
          durationMs: event.durationMs,
        });
        reactionTimeoutRef.current = window.setTimeout(() => {
          setAvatarReaction(null);
          reactionTimeoutRef.current = null;
        }, event.durationMs);
        return;

      case 'error':
        clearResumeListeningTimeout();
        setError(event.message);
        return;
    }
  }, [
    clearReactionTimeout,
    clearResumeListeningTimeout,
    enqueueAssistantAudioSegment,
    onMessageCallback,
    scheduleAutoResumeListening,
    updateMessage,
    setLocalDialogueState,
  ]);

  const connect = useCallback(async () => {
    if (wsRef.current && isConnectedRef.current) {
      return;
    }

    setError(null);
    resetAudioPlayback();
    autoResumeRef.current = true;

    const session = await createAvatarChatSession(sessionParams ?? {});
    const wsUrl = buildWebSocketUrl(session.wsUrl);

    await new Promise<void>((resolve, reject) => {
      let resolved = false;
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      const cleanupPending = () => {
        socket.onopen = null;
        socket.onerror = null;
      };

      socket.onopen = () => {
        cleanupPending();
      };

      socket.onmessage = (messageEvent) => {
        try {
          const event = JSON.parse(messageEvent.data) as AvatarServerEvent;
          void handleServerEvent(event);
          if (!resolved && event.type === 'session.ready') {
            resolved = true;
            resolve();
          }
        } catch (socketError) {
          const nextError = socketError instanceof Error ? socketError.message : 'Invalid avatar websocket payload';
          setError(nextError);
          if (!resolved) {
            resolved = true;
            reject(new Error(nextError));
          }
        }
      };

      socket.onerror = () => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Failed to connect avatar websocket'));
        }
      };

      socket.onclose = () => {
        wsRef.current = null;
        setIsConnected(false);
        isConnectedRef.current = false;
        setLocalDialogueState('idle');
      };
    });
  }, [handleServerEvent, resetAudioPlayback, sessionParams, setLocalDialogueState]);

  const startListening = useCallback(async () => {
    if (!isConnectedRef.current) {
      throw new Error('Avatar chat session is not connected');
    }

    clearResumeListeningTimeout();
    setError(null);

    if (isSpeakingRef.current || dialogueStateRef.current === 'post_speaking') {
      sendClientEvent({ type: 'chat.interrupt' });
      resetAudioPlayback();
      setAvatarState(DEFAULT_AVATAR_STATE);
      setLocalDialogueState('idle');
    }

    if (!mediaStreamRef.current) {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      return;
    }

    const mimeType = pickRecorderMimeType();
    const recorder = mimeType
      ? new MediaRecorder(mediaStreamRef.current, { mimeType })
      : new MediaRecorder(mediaStreamRef.current);

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = async (recordingEvent) => {
      if (!recordingEvent.data.size) return;
      const audioBuffer = await recordingEvent.data.arrayBuffer();
      sendClientEvent({
        type: 'mic.audio.chunk',
        audioBase64: encodeArrayBufferToBase64(audioBuffer),
        mimeType: recordingEvent.data.type || recorder.mimeType || mimeType || 'audio/webm',
      });
    };

    recorder.onstop = () => {
      stopMicVadLoop();
      sendClientEvent({ type: 'mic.audio.end' });
      mediaRecorderRef.current = null;
      setLocalDialogueState('thinking');
      setAvatarState((previous) => ({
        ...previous,
        dialogueState: 'thinking',
        motionGroup: 'think',
        subtitleText: '',
      }));
    };

    recorder.start(250);
    await startMicVadLoop();
    resetAssistantTimestamps();
    setAssistantTranscriptDelta('');
    setAssistantTranscriptFinal('');
    setLocalDialogueState('listening');
    setAvatarState((previous) => ({
      ...previous,
      dialogueState: 'listening',
      motionGroup: 'listen',
      subtitleText: '',
      gaze: { x: 0, y: -0.05 },
      bodySway: 0.14,
      blinkMode: 'focused',
    }));
  }, [
    clearResumeListeningTimeout,
    resetAudioPlayback,
    resetAssistantTimestamps,
    sendClientEvent,
    setLocalDialogueState,
    startMicVadLoop,
    stopMicVadLoop,
  ]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      return;
    }

    setLocalDialogueState('thinking');
    setAvatarState((previous) => ({
      ...previous,
      dialogueState: 'thinking',
      motionGroup: 'think',
      subtitleText: '',
    }));
  }, [setLocalDialogueState]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  useEffect(() => {
    playNextAssistantAudioSegmentRef.current = playNextAssistantAudioSegment;
  }, [playNextAssistantAudioSegment]);

  const sendAvatarHit = useCallback((area: string) => {
    sendClientEvent({ type: 'avatar.hit', area });
  }, [sendClientEvent]);

  useEffect(() => {
    return () => {
      autoResumeRef.current = false;
      clearResumeListeningTimeout();
      stopMicVadLoop();
      disconnect();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [clearResumeListeningTimeout, disconnect, stopMicVadLoop]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    dialogueState,
    messages,
    remoteAudioStream: null,
    assistantTranscriptDelta,
    assistantTranscriptFinal,
    assistantSpeechStartedAt,
    assistantSpeechEndedAt,
    avatarState,
    avatarReaction,
    assistantAudioLevel,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendAvatarHit,
    clearMessages,
  };
}
