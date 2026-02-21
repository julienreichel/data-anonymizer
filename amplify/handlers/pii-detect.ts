import { ApiErrorCode, type ApiError } from '../core/errors';

/** Schema-valid stub response for POST /v1/pii/detect. */
export interface PiiDetectResponse {
  error: ApiError;
}

/** Stub — returns NOT_IMPLEMENTED until EPIC 3 implements detection logic. */
export function handlePiiDetect(): PiiDetectResponse {
  return {
    error: {
      code: ApiErrorCode.NOT_IMPLEMENTED,
      message: 'PII detection is not yet implemented.',
    },
  };
}
