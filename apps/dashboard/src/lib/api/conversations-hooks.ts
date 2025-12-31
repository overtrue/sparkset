import useSWR from 'swr';
import { fetchConversations, fetchConversationById } from './conversations-api';

// SWR Hooks - only for client components
export function useConversations() {
  return useSWR('/conversations', fetchConversations);
}

export function useConversation(id: number | null) {
  return useSWR(id ? `/conversations/${id}` : null, () => fetchConversationById(id!));
}
