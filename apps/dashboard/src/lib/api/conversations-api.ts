import type { ConversationDTO, ConversationDetailDTO, ApiListResponse } from '@/types/api';
import { apiGet } from '@/lib/fetch';

// API functions - can be used in both server and client components
export async function fetchConversations(): Promise<ApiListResponse<ConversationDTO>> {
  return apiGet('/conversations');
}

export async function fetchConversationById(id: number): Promise<ConversationDetailDTO> {
  return apiGet(`/conversations/${id}`);
}

// Alias for backward compatibility
export const fetchConversation = fetchConversationById;

// Legacy API object for backward compatibility - safe for server components
export const conversationsApi = {
  list: fetchConversations,
  get: fetchConversationById,
};
