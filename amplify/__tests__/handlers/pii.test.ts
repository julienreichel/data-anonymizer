import { describe, expect, it } from 'vitest';
import { handlePiiDetect } from '../../handlers/pii-detect';
import { handlePiiAnonymize } from '../../handlers/pii-anonymize';
import { handlePiiDetectAndAnonymize } from '../../handlers/pii-detect-and-anonymize';
import { ApiErrorCode } from '../../core/errors';

describe('handlePiiDetect', () => {
  it('returns NOT_IMPLEMENTED error code', () => {
    expect(handlePiiDetect().error.code).toBe(ApiErrorCode.NOT_IMPLEMENTED);
  });

  it('returns a schema-valid response with error envelope', () => {
    const result = handlePiiDetect();
    expect(result).toHaveProperty('error.code');
    expect(result).toHaveProperty('error.message');
    expect(typeof result.error.message).toBe('string');
  });
});

describe('handlePiiAnonymize', () => {
  it('returns NOT_IMPLEMENTED error code', () => {
    expect(handlePiiAnonymize().error.code).toBe(ApiErrorCode.NOT_IMPLEMENTED);
  });

  it('returns a schema-valid response with error envelope', () => {
    const result = handlePiiAnonymize();
    expect(result).toHaveProperty('error.code');
    expect(result).toHaveProperty('error.message');
    expect(typeof result.error.message).toBe('string');
  });
});

describe('handlePiiDetectAndAnonymize', () => {
  it('returns NOT_IMPLEMENTED error code', () => {
    expect(handlePiiDetectAndAnonymize().error.code).toBe(ApiErrorCode.NOT_IMPLEMENTED);
  });

  it('returns a schema-valid response with error envelope', () => {
    const result = handlePiiDetectAndAnonymize();
    expect(result).toHaveProperty('error.code');
    expect(result).toHaveProperty('error.message');
    expect(typeof result.error.message).toBe('string');
  });
});
