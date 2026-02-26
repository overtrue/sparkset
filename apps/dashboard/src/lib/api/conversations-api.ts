import type {
  ApiListResponse,
  ConversationDTO,
  ConversationDetailDTO,
  MessageDTO,
} from '@/types/api';
import { apiGet, apiPost } from '@/lib/fetch';

// API functions - can be used in both server and client components
export async function fetchConversations(): Promise<ApiListResponse<ConversationDTO>> {
  return apiGet('/conversations');
}

type ConversationShowPayload =
  | ConversationDetailDTO
  | { conversation?: ConversationDTO; messages?: unknown[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasConversationFields(value: unknown): value is ConversationDTO {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    (typeof value.createdAt === 'string' || value.createdAt instanceof Date) &&
    (typeof value.updatedAt === 'string' || value.updatedAt instanceof Date)
  );
}

function hasMessageList(value: unknown): value is { messages: unknown[] } {
  return (
    isRecord(value) &&
    'messages' in value &&
    Array.isArray((value as { messages?: unknown[] }).messages)
  );
}

function normalizeConversationDetail(payload: ConversationShowPayload): ConversationDetailDTO {
  if (hasConversationFields(payload) && hasMessageList(payload)) {
    return payload as ConversationDetailDTO;
  }

  const conversation = isRecord(payload) ? payload.conversation : undefined;
  if (!isRecord(payload) || !hasMessageList(payload) || !hasConversationFields(conversation)) {
    throw new Error('Unexpected conversation detail response format');
  }

  return {
    ...conversation,
    messages: payload.messages as MessageDTO[],
  };
}

export async function fetchConversationById(id: number): Promise<ConversationDetailDTO> {
  const payload = await apiGet<ConversationShowPayload>(`/conversations/${id}`);
  return normalizeConversationDetail(payload);
}

export async function createConversation(
  body: Pick<ConversationDTO, 'title'> = {},
): Promise<ConversationDTO> {
  return apiPost('/conversations', body);
}
