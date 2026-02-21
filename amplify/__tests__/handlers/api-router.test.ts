import { describe, expect, it } from 'vitest';
import { handler, type ApiGatewayEvent } from '../../functions/api/handler';
import { ApiErrorCode } from '../../core/errors';

function makeEvent(httpMethod: string, path: string): ApiGatewayEvent {
  return { httpMethod, path };
}

describe('GET /v1/health', () => {
  it('returns 200 with ok status and Content-Type header', async () => {
    const result = await handler(makeEvent('GET', '/v1/health'));
    expect(result.statusCode).toBe(200);
    expect(result.headers['Content-Type']).toBe('application/json');
  });

  it('returns schema-valid JSON body', async () => {
    const result = await handler(makeEvent('GET', '/v1/health'));
    expect(JSON.parse(result.body)).toStrictEqual({ status: 'ok', version: 'v1' });
  });
});

describe('POST /v1/pii/detect', () => {
  it('returns 501 with NOT_IMPLEMENTED error', async () => {
    const result = await handler(makeEvent('POST', '/v1/pii/detect'));
    expect(result.statusCode).toBe(501);
    expect(JSON.parse(result.body)).toMatchObject({
      error: { code: ApiErrorCode.NOT_IMPLEMENTED },
    });
  });
});

describe('POST /v1/pii/anonymize', () => {
  it('returns 501 with NOT_IMPLEMENTED error', async () => {
    const result = await handler(makeEvent('POST', '/v1/pii/anonymize'));
    expect(result.statusCode).toBe(501);
    expect(JSON.parse(result.body)).toMatchObject({
      error: { code: ApiErrorCode.NOT_IMPLEMENTED },
    });
  });
});

describe('POST /v1/pii/detect-and-anonymize', () => {
  it('returns 501 with NOT_IMPLEMENTED error', async () => {
    const result = await handler(makeEvent('POST', '/v1/pii/detect-and-anonymize'));
    expect(result.statusCode).toBe(501);
    expect(JSON.parse(result.body)).toMatchObject({
      error: { code: ApiErrorCode.NOT_IMPLEMENTED },
    });
  });
});

describe('unknown route', () => {
  it('returns 404 with NOT_FOUND error', async () => {
    const result = await handler(makeEvent('GET', '/unknown'));
    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toMatchObject({
      error: { code: ApiErrorCode.NOT_FOUND },
    });
  });
});

