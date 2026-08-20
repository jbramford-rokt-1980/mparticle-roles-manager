import { ApiError } from '../plugins/apiError';

/**
 * Normalize an mParticle API failure into an ApiError with actionable copy.
 * The assigned-role detection is a message heuristic — the API returns a
 * plain 400 for that case; integration tests pin the mapping.
 */
export function mapUpstreamError(
  status: number,
  bodyText: string,
  retryAfterHeader?: string,
): ApiError {
  if (status === 400) {
    if (/assigned/i.test(bodyText)) {
      return new ApiError(
        'ASSIGNED_ROLE_DELETE',
        400,
        'mParticle rejected the change: the role is assigned to at least one user. ' +
          'Unassign it in the mParticle UI (Settings → User Management) first — ' +
          'there is no API for assignments. No roles were changed.',
        { details: bodyText },
      );
    }
    return new ApiError(
      'VALIDATION',
      400,
      `mParticle rejected the manifest: ${bodyText || 'validation error'}. No roles were changed.`,
    );
  }
  if (status === 401) {
    return new ApiError(
      'AUTH_FAILED',
      401,
      'mParticle rejected the credentials — re-check client_id and client_secret for this environment',
    );
  }
  if (status === 403 || status === 404) {
    return new ApiError(
      'POD_MISMATCH',
      status,
      'mParticle returned ' +
        status +
        '. Usual causes: wrong pod selected for this customer, wrong orgId/accountId, ' +
        'or the credential is not provisioned for the Custom Roles API.',
    );
  }
  if (status === 409) {
    return new ApiError(
      'DUPLICATE_NAME',
      409,
      'A role with this name already exists in the organization',
    );
  }
  if (status === 429) {
    const parsed = Number.parseInt(retryAfterHeader ?? '', 10);
    const retryAfter = Number.isNaN(parsed) ? 60 : parsed;
    return new ApiError(
      'RATE_LIMITED',
      429,
      `mParticle rate limit reached (100 requests/minute). Retry in ${retryAfter}s.`,
      { retryAfter },
    );
  }
  return new ApiError(
    'UPSTREAM_ERROR',
    502,
    `mParticle returned an unexpected ${status}${bodyText ? `: ${bodyText.slice(0, 300)}` : ''}`,
  );
}
