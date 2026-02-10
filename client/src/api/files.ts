import { apiClient } from './client';
import type { Attachment } from '../types';

export const fileApi = {
  upload: (channelId: string, file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<Attachment>(`/channels/${channelId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
  download: (id: string) => apiClient.get(`/attachments/${id}`, { responseType: 'blob' }),
  delete: (id: string) => apiClient.delete(`/attachments/${id}`),
};
