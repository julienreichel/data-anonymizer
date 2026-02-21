import { describe, expect, it } from 'vitest';
import { handleHealth, type HealthResponse } from '../../handlers/health';

describe('handleHealth', () => {
  it('returns status ok', () => {
    const result = handleHealth();
    expect(result.status).toBe('ok');
  });

  it('returns version v1', () => {
    const result = handleHealth();
    expect(result.version).toBe('v1');
  });

  it('is a stable, schema-valid response', () => {
    const result: HealthResponse = handleHealth();
    expect(result).toStrictEqual({ status: 'ok', version: 'v1' });
  });

  it('is deterministic — same output on repeated calls', () => {
    expect(handleHealth()).toStrictEqual(handleHealth());
  });
});
