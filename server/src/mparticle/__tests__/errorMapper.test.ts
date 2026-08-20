import { describe, expect, it } from 'vitest';

import { mapUpstreamError } from '../errorMapper';

describe('mapUpstreamError', () => {
  it('maps 400 with an assigned-role message to ASSIGNED_ROLE_DELETE', () => {
    const err = mapUpstreamError(
      400,
      'Custom role is assigned to a user and may not be deleted',
    );
    expect(err.code).toBe('ASSIGNED_ROLE_DELETE');
    expect(err.httpStatus).toBe(400);
    expect(err.message).toMatch(/user management/i);
  });

  it('maps other 400s to VALIDATION with the upstream message preserved', () => {
    const err = mapUpstreamError(400, 'Tasks not found: bogus:task');
    expect(err.code).toBe('VALIDATION');
    expect(err.message).toContain('bogus:task');
  });

  it('maps 401 to AUTH_FAILED', () => {
    expect(mapUpstreamError(401, '').code).toBe('AUTH_FAILED');
  });

  it('maps 403 and 404 to POD_MISMATCH with diagnostic guidance', () => {
    for (const status of [403, 404]) {
      const err = mapUpstreamError(status, '');
      expect(err.code).toBe('POD_MISMATCH');
      expect(err.message).toMatch(/pod|org/i);
    }
  });

  it('maps 409 to DUPLICATE_NAME', () => {
    expect(mapUpstreamError(409, 'Conflict').code).toBe('DUPLICATE_NAME');
  });

  it('maps 429 to RATE_LIMITED and parses Retry-After', () => {
    const err = mapUpstreamError(429, '', '30');
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.retryAfter).toBe(30);
  });

  it('defaults Retry-After to 60 when the header is missing', () => {
    expect(mapUpstreamError(429, '').retryAfter).toBe(60);
  });

  it('maps 5xx to UPSTREAM_ERROR', () => {
    expect(mapUpstreamError(503, 'oops').code).toBe('UPSTREAM_ERROR');
  });
});
