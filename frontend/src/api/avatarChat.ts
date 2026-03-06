import api from './index';
import type { AvatarSessionParams } from '@/types/avatarChat';

type CreateAvatarChatSessionResponse = {
  success: boolean;
  sessionId: string;
  wsUrl: string;
  chatId?: string | null;
  error?: string;
};

export async function createAvatarChatSession(params: AvatarSessionParams = {}) {
  const response = await api.post<CreateAvatarChatSessionResponse>('/avatar-chat/sessions', params);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to create avatar chat session');
  }
  return response.data;
}
