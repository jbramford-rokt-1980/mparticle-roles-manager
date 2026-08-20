/**
 * mParticle deployment pods. A customer environment lives on exactly one pod.
 * The pod changes ONLY the API host — paths and payloads are identical.
 */
export const PODS = {
  us1: { label: 'US1 (default)', apiBase: 'https://api.mparticle.com' },
  us2: { label: 'US2', apiBase: 'https://api.us2.mparticle.com' },
  eu1: { label: 'EU1', apiBase: 'https://api.eu1.mparticle.com' },
  au1: { label: 'AU1', apiBase: 'https://api.au1.mparticle.com' },
} as const;

export type PodId = keyof typeof PODS;

export const POD_IDS = Object.keys(PODS) as PodId[];

export const TOKEN_URL = 'https://sso.auth.mparticle.com/oauth/token';

/**
 * The OAuth audience claim is ALWAYS the US1 host, even for tokens used
 * against us2/eu1/au1 — pod-specific audiences are rejected with 403
 * "Service not enabled within domain" (verified empirically).
 */
export const TOKEN_AUDIENCE = 'https://api.mparticle.com';

export const PLATFORM_PATH_PREFIX = '/platform/v2';
