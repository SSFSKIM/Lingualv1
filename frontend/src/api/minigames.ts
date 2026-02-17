// FLASHCARDFLIP

import api from './index';
import type { MinigameAttempt, MinigameSummary } from '@/types';

export interface Flashcard {
  korean: string;
  english: string;
}

export async function generateFlashcards(chatId: string): Promise<Flashcard[]> {
  const response = await api.post('/minigames/flashcards', { chatId });
  return response.data.flashcards;
}

interface SaveMinigameAttemptResponse {
  success: boolean;
  attemptId?: string;
  error?: string;
}

interface GetMinigameSummaryResponse {
  success: boolean;
  summary?: MinigameSummary;
  error?: string;
}

export async function saveMinigameAttempt(payload: MinigameAttempt): Promise<{ attemptId: string }> {
  const response = await api.post<SaveMinigameAttemptResponse>('/minigames/attempts', payload);
  if (response.data.success && response.data.attemptId) {
    return { attemptId: response.data.attemptId };
  }
  throw new Error(response.data.error || 'Failed to save minigame attempt');
}

export async function getMinigameSummary(limit = 200): Promise<MinigameSummary> {
  const response = await api.get<GetMinigameSummaryResponse>('/minigames/summary', {
    params: { limit },
  });
  if (response.data.success && response.data.summary) {
    return response.data.summary;
  }
  throw new Error(response.data.error || 'Failed to load minigame summary');
}

// FLASHCARDFLIP
