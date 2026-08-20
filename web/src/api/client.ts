import type { ApiErrorBody, ErrorCode } from '@roles/shared';
import { isErrorCode } from '@roles/shared';

export class ApiClientError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;
  readonly retryAfter?: number;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.code = body.code;
    this.httpStatus = body.httpStatus;
    this.details = body.details;
    this.retryAfter = body.retryAfter;
  }
}

export function isApiClientError(err: unknown, code?: ErrorCode): err is ApiClientError {
  if (!(err instanceof ApiClientError)) return false;
  return code === undefined || err.code === code;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const parsed = body as Partial<ApiErrorBody> | undefined;
    throw new ApiClientError({
      code: parsed && isErrorCode(parsed.code) ? parsed.code : 'INTERNAL',
      httpStatus: res.status,
      message: parsed?.message ?? `Request failed with status ${res.status}`,
      details: parsed?.details,
      retryAfter: parsed?.retryAfter,
    });
  }
  return (await res.json()) as T;
}
