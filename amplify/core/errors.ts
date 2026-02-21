/**
 * Canonical API error codes returned by all v1 endpoints.
 * Keep minimal — EPIC 2 will expand the full response contract.
 */
export const ApiErrorCode = {
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/** Envelope returned in the `error` field of all error responses. */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
}
