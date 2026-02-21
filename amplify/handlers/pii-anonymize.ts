import { ApiErrorCode, type ApiError } from '../core/errors';

/** Schema-valid stub response for POST /v1/pii/anonymize. */
export interface PiiAnonymizeResponse {
  error: ApiError;
}

/** Stub — returns NOT_IMPLEMENTED until EPIC 4 implements anonymization logic. */
export function handlePiiAnonymize(): PiiAnonymizeResponse {
  return {
    error: {
      code: ApiErrorCode.NOT_IMPLEMENTED,
      message: 'PII anonymization is not yet implemented.',
    },
  };
}
