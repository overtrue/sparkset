import type { ConversationDTO, ConversationDetailDTO, ApiListResponse } from '@/types/api';
import { apiGet } from '@/lib/fetch';

// API functions - can be used in both server and client components
export async function fetchConversations(): Promise<ApiListResponse<ConversationDTO>> {
  return apiGet('/conversations');
}

export async function fetchConversationById(id: number): Promise<ConversationDetailDTO> {
  return apiGet(`/conversations/${id}`);
}
