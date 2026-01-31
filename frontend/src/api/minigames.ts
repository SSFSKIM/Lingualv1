// FLASHCARDFLIP

import api from './index';

export interface Flashcard {
  korean: string;
  english: string;
}

export async function generateFlashcards(chatId: string): Promise<Flashcard[]> {
  const response = await api.post('/minigames/flashcards', { chatId });
  return response.data.flashcards;
}

// FLASHCARDFLIP
