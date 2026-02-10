import { apiClient } from './client';
import type { Invite, Guild, CreateInviteRequest, InviteAcceptResponse } from '../types';

export const inviteApi = {
  get: (code: string) => apiClient.get<Invite>(`/invites/${code}`),
  accept: (code: string) => apiClient.post<InviteAcceptResponse | Guild>(`/invites/${code}`),
  create: (channelId: string, data?: CreateInviteRequest) =>
    apiClient.post<Invite>(`/channels/${channelId}/invites`, data),
  delete: (code: string) => apiClient.delete(`/invites/${code}`),
};
