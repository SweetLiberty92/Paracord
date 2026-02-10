import { apiClient } from './client';
import type { Channel } from '../types';

export const dmApi = {
  list: () => apiClient.get<Channel[]>('/users/@me/dms'),
  create: (recipientId: string) =>
    apiClient.post<Channel>('/users/@me/dms', { recipient_id: recipientId }),
};
