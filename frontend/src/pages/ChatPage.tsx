import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useChat } from '../hooks/useChat';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { getUserProfile } from '../api/user';
import { Card, Alert, AlertDescription } from '@/components/ui';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { messageVariants } from '@/lib/animations';
import {
  ChatMessage,
  ChatInput,
  VoiceRecorder,
  ModeToggle,
  ProfileSidebar,
} from '../components/chat';
import type { UserProfile, ChatMessage as ChatMessageType } from '../types';

type Mode = 'text' | 'voice';

export function ChatPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<Mode>('text');
  const [inputValue, setInputValue] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [aiState, setAiState] = useState<'speak' | 'notalk' | 'bruh'>('notalk');
  const [audioElement] = useState(() => new Audio());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialMessages: ChatMessageType[] = [
    {
      id: 'welcome',
      role: 'assistant',
      content: t('chat.welcome'),
      timestamp: new Date().toISOString(),
    },
  ];

  const {
    messages,
    isLoading,
    error,
    sendTextMessage,
    sendAudioMessage,
    clearChat,
  } = useChat(initialMessages);

  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearAudio,
  } = useVoiceRecorder();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (audioBlob && !isRecording) {
      handleSendVoiceMessage();
    }
  }, [audioBlob, isRecording]);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendText = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue;
    setInputValue('');
    setAiState('speak');

    await sendTextMessage(message);
    setAiState('notalk');
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const handleSendVoiceMessage = async () => {
    if (!audioBlob) return;

    setAiState('speak');
    const result = await sendAudioMessage(audioBlob);

    if (result?.audioUrl) {
      audioElement.src = result.audioUrl;
      audioElement.play();
    }

    clearAudio();
    setAiState('notalk');
  };

  const handleClearChat = async () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      await clearChat();
    }
  };

  return (
    <AnimatedPage className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto flex gap-6">
        {/* Main Chat Area */}
        <Card className="flex-1 flex flex-col h-[calc(100vh-2rem)] shadow-lg">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-b border-gray-100"
          >
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-accent">
                  {t('chat.title')}
                </h1>
                <p className="text-sm text-muted-foreground">{t('chat.subtitle')}</p>
              </div>
              <ModeToggle mode={mode} onModeChange={setMode} />
            </div>
          </motion.div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  variants={messageVariants}
                  initial="initial"
                  animate="animate"
                  layout
                >
                  <ChatMessage
                    role={message.role}
                    content={message.content}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 className="h-5 w-5 text-primary" />
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border-t border-gray-100"
          >
            <AnimatePresence mode="wait">
              {mode === 'text' ? (
                <motion.div
                  key="text-input"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSendText}
                    disabled={isLoading}
                    placeholder={t('chat.placeholder')}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="voice-input"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex justify-center"
                >
                  <VoiceRecorder
                    isRecording={isRecording}
                    onToggleRecording={handleToggleRecording}
                    disabled={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Card>

        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden lg:block w-72"
        >
          <ProfileSidebar
            level={profile?.sklcLevel}
            goals={profile?.goals}
            onClearChat={handleClearChat}
            aiState={aiState}
          />
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
