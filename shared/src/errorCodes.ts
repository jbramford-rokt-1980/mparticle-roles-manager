/** Normalized error codes the proxy returns; the UI maps each to actionable copy. */
export const ERROR_CODES = [
  'AUTH_FAILED',
  'ASSIGNED_ROLE_DELETE',
  'VALIDATION',
  'POD_MISMATCH',
  'DUPLICATE_NAME',
  'RATE_LIMITED',
  'VERSION_CONFLICT',
  'VAULT_LOCKED',
  'VAULT_BAD_PASSPHRASE',
  'VAULT_UNINITIALIZED',
  'NOT_FOUND',
  'UPSTREAM_ERROR',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
}
