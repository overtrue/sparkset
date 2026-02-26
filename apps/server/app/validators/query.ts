import { z } from 'zod';
import { QUERY_REQUEST_LIMIT_MAX, QUERY_REQUEST_QUESTION_MAX_LENGTH } from '@sparkset/core';

const intMessage = (name: string) => `${name} must be a positive integer`;

export const queryRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, {
      message: 'question is required',
    })
    .max(QUERY_REQUEST_QUESTION_MAX_LENGTH, {
      message: `question must not exceed ${QUERY_REQUEST_QUESTION_MAX_LENGTH} characters`,
    }),
  datasource: z.coerce
    .number()
    .int(intMessage('datasource'))
    .positive(intMessage('datasource'))
    .optional(),
  action: z.coerce.number().int(intMessage('action')).positive(intMessage('action')).optional(),
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(QUERY_REQUEST_LIMIT_MAX, {
      message: `limit must be less than or equal to ${QUERY_REQUEST_LIMIT_MAX}`,
    })
    .optional(),
  aiProvider: z.coerce
    .number()
    .int(intMessage('aiProvider'))
    .positive(intMessage('aiProvider'))
    .optional(),
  conversationId: z.coerce
    .number()
    .int(intMessage('conversationId'))
    .positive(intMessage('conversationId'))
    .optional(),
});
