import { apiClient } from './client';
import type { Channel, Message, SendMessageRequest, PaginationParams } from '../types';

export const channelApi = {
  get: (id: string) => apiClient.get<Channel>(`/channels/${id}`),
  update: (id: string, data: Partial<Channel>) => apiClient.patch<Channel>(`/channels/${id}`, data),
  delete: (id: string) => apiClient.delete(`/channels/${id}`),

  getMessages: (id: string, params?: PaginationParams) =>
    apiClient.get<Message[]>(`/channels/${id}/messages`, { params }),
  searchMessages: (id: string, q: string, limit = 20) =>
    apiClient.get<Message[]>(`/channels/${id}/messages/search`, { params: { q, limit } }),
  bulkDeleteMessages: (id: string, messageIds: string[]) =>
    apiClient.post<{ deleted: number }>(`/channels/${id}/messages/bulk-delete`, { message_ids: messageIds }),
  sendMessage: (id: string, data: SendMessageRequest) =>
    apiClient.post<Message>(`/channels/${id}/messages`, data),
  editMessage: (channelId: string, messageId: string, content: string) =>
    apiClient.patch<Message>(`/channels/${channelId}/messages/${messageId}`, { content }),
  deleteMessage: (channelId: string, messageId: string) =>
    apiClient.delete(`/channels/${channelId}/messages/${messageId}`),

  getPins: (id: string) => apiClient.get<Message[]>(`/channels/${id}/pins`),
  pinMessage: (channelId: string, messageId: string) =>
    apiClient.put(`/channels/${channelId}/pins/${messageId}`),
  unpinMessage: (channelId: string, messageId: string) =>
    apiClient.delete(`/channels/${channelId}/pins/${messageId}`),

  addReaction: (channelId: string, messageId: string, emoji: string) =>
    apiClient.put(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`
    ),
  removeReaction: (channelId: string, messageId: string, emoji: string) =>
    apiClient.delete(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`
    ),

  triggerTyping: (id: string) => apiClient.post(`/channels/${id}/typing`),
  updateReadState: (id: string, lastMessageId?: string) =>
    apiClient.put(`/channels/${id}/read`, { last_message_id: lastMessageId }),
};
