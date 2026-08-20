import type { ApiErrorBody, ErrorCode } from '@roles/shared';

/** Throwable normalized error; the global handler turns it into the response envelope. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details?: unknown;
  readonly retryAfter?: number;

  constructor(
    code: ErrorCode,
    httpStatus: number,
    message: string,
    extra: { details?: unknown; retryAfter?: number } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = extra.details;
    this.retryAfter = extra.retryAfter;
  }

  toBody(): ApiErrorBody {
    return {
      code: this.code,
      httpStatus: this.httpStatus,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
      ...(this.retryAfter !== undefined ? { retryAfter: this.retryAfter } : {}),
    };
  }
}
