import apiClient from './client';
import { APIResponse } from '../types/api';
import { ChatMessage, ChatSession, ActionConfirmResponse } from '../types/chat';

export const chatApi = {
  sendMessage: async (
    content: string,
    sessionId?: string
  ): Promise<APIResponse<ChatMessage>> => {
    const response = await apiClient.post<APIResponse<ChatMessage>>('/chat/message', {
      content,
      session_id: sessionId || null,
    });
    return response.data;
  },

  confirmAction: async (
    sessionId: string,
    actionId: string,
    confirm: boolean
  ): Promise<APIResponse<ActionConfirmResponse>> => {
    const response = await apiClient.post<APIResponse<ActionConfirmResponse>>('/chat/confirm', {
      session_id: sessionId,
      action_id: actionId,
      confirm,
    });
    return response.data;
  },

  getSessions: async (): Promise<APIResponse<ChatSession[]>> => {
    const response = await apiClient.get<APIResponse<ChatSession[]>>('/chat/sessions');
    return response.data;
  },

  getSession: async (sessionId: string): Promise<APIResponse<ChatSession>> => {
    const response = await apiClient.get<APIResponse<ChatSession>>(`/chat/sessions/${sessionId}`);
    return response.data;
  },
};
