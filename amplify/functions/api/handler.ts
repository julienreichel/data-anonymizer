import { handleHealth } from '../../handlers/health';
import { handlePiiDetect } from '../../handlers/pii-detect';
import { handlePiiAnonymize } from '../../handlers/pii-anonymize';
import { handlePiiDetectAndAnonymize } from '../../handlers/pii-detect-and-anonymize';
import { ApiErrorCode } from '../../core/errors';

/** Minimal subset of the API Gateway Lambda proxy request event. */
export interface ApiGatewayEvent {
  httpMethod: string;
  path: string;
}

/** Minimal subset of the API Gateway Lambda proxy response. */
export interface ApiGatewayResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

type RouteHandler = () => unknown;

const routes: Record<string, RouteHandler> = {
  'GET /v1/health': handleHealth,
  'POST /v1/pii/detect': handlePiiDetect,
  'POST /v1/pii/anonymize': handlePiiAnonymize,
  'POST /v1/pii/detect-and-anonymize': handlePiiDetectAndAnonymize,
};

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

function jsonResponse(statusCode: number, body: unknown): ApiGatewayResult {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

/**
 * Lambda entry point — thin router dispatching to per-route handler functions.
 * No request body is read or logged (zero data retention policy).
 */
export const handler = async (event: ApiGatewayEvent): Promise<ApiGatewayResult> => {
  const routeKey = `${event.httpMethod} ${event.path}`;
  const routeHandler = routes[routeKey];

  if (routeHandler === undefined) {
    return jsonResponse(404, {
      error: { code: ApiErrorCode.NOT_FOUND, message: 'Route not found.' },
    });
  }

  const statusCode = event.httpMethod === 'GET' ? 200 : 501;
  return jsonResponse(statusCode, routeHandler());
};
