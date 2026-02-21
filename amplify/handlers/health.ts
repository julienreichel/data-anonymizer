/** Stable response shape for GET /v1/health. */
export interface HealthResponse {
  status: 'ok';
  version: string;
}

/** Returns a schema-valid health payload. No side effects. */
export function handleHealth(): HealthResponse {
  return { status: 'ok', version: 'v1' };
}
