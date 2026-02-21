import { ApiErrorCode, type ApiError } from '../core/errors';

/** Schema-valid stub response for POST /v1/pii/detect-and-anonymize. */
export interface PiiDetectAndAnonymizeResponse {
  error: ApiError;
}

/** Stub — returns NOT_IMPLEMENTED until EPIC 5 implements combined pipeline. */
export function handlePiiDetectAndAnonymize(): PiiDetectAndAnonymizeResponse {
  return {
    error: {
      code: ApiErrorCode.NOT_IMPLEMENTED,
      message: 'Combined PII detect-and-anonymize is not yet implemented.',
    },
  };
}
