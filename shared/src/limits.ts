/** Field and manifest limits enforced by the Custom Roles API. */
export const NAME_MAX = 64;
export const ROLE_ID_MAX = 64;
export const DESCRIPTION_MAX = 256;
export const MAX_ROLES_PER_ORG = 100;

/** Mandatory permission auto-included in every role (log in + view dashboard). */
export const CORE_TASK = 'user:core';

/** Documented API rate limit; the proxy budgets below this. */
export const API_REQUESTS_PER_MINUTE = 100;
