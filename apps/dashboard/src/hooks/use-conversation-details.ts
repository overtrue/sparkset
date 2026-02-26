import { useCallback, useState } from 'react';

import { fetchConversationById } from '@/lib/api/conversations-api';
import { parseQueryError, type QueryError, type QueryTranslation } from '@/lib/query-errors';
import type { ConversationDetailDTO } from '@/types/api';

interface UseConversationDetailsOptions {
  t: QueryTranslation;
  fallbackErrorMessage: string;
}

interface UseConversationDetailsResult {
  details: Map<number, ConversationDetailDTO>;
  detailErrors: Map<number, QueryError>;
  loadingId: number | null;
  loadConversationDetail: (
    id: number,
    options?: {
      force?: boolean;
    },
  ) => Promise<ConversationDetailDTO | null>;
  clearConversationDetails: () => void;
}

export function useConversationDetails({
  t,
  fallbackErrorMessage,
}: UseConversationDetailsOptions): UseConversationDetailsResult {
  const [details, setDetails] = useState<Map<number, ConversationDetailDTO>>(new Map());
  const [detailErrors, setDetailErrors] = useState<Map<number, QueryError>>(new Map());
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const clearConversationDetails = useCallback(() => {
    setDetails(new Map());
    setDetailErrors(new Map());
    setLoadingId(null);
  }, []);

  const loadConversationDetail = useCallback(
    async (
      id: number,
      options: { force?: boolean } = {},
    ): Promise<ConversationDetailDTO | null> => {
      const { force = false } = options;

      if (loadingId === id) {
        return details.get(id) ?? null;
      }

      if (!force && details.has(id) && !detailErrors.has(id)) {
        return details.get(id) ?? null;
      }

      setLoadingId(id);
      setDetailErrors((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });

      try {
        const detail = await fetchConversationById(id);
        setDetails((prev) => {
          const next = new Map(prev);
          next.set(id, detail);
          return next;
        });
        return detail;
      } catch (error) {
        const parsedError = parseQueryError(error, fallbackErrorMessage, t);
        setDetailErrors((prev) => {
          const next = new Map(prev);
          next.set(id, parsedError);
          return next;
        });
        return null;
      } finally {
        setLoadingId((currentId) => (currentId === id ? null : currentId));
      }
    },
    [detailErrors, details, fallbackErrorMessage, loadingId, t],
  );

  return {
    details,
    detailErrors,
    loadingId,
    loadConversationDetail,
    clearConversationDetails,
  };
}
