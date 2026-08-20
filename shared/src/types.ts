import type { ErrorCode } from './errorCodes';
import type { PodId } from './pods';

/** A single permission reference inside a role, as the API represents it. */
export interface RoleTaskRef {
  task_id: string;
}

/** A custom role as stored in the org's role manifest. */
export interface Role {
  /** Unique identifier, max 64 chars. Immutable across updates. */
  role_id: string;
  /** Display name, max 64 chars. */
  name: string;
  /** Optional description, max 256 chars. */
  description?: string;
  tasks: RoleTaskRef[];
}

/**
 * The full custom-role manifest for an organization.
 * The PUT endpoint replaces this wholesale, so it always travels as a unit.
 * `version` is used for optimistic concurrency but is not documented for all
 * orgs — treat it as optional and pass it through when present.
 */
export interface Manifest {
  roles: Role[];
  last_modified_on?: string;
  last_modified_by?: string;
  version?: number | string;
}

/**
 * One assignable permission from GET /tasks.
 * The live API returns null display_name/description (verified against a
 * real org), so consumers must be able to label tasks from the id alone.
 */
export interface TaskDef {
  task_id: string;
  display_name: string | null;
  description: string | null;
}

/** A saved customer environment, as stored (decrypted) in the vault. */
export interface EnvironmentConfig {
  id: string;
  label: string;
  pod: PodId;
  orgId: number;
  accountId: number;
  clientId: string;
  clientSecret: string;
  createdAt: string;
  updatedAt: string;
}

/** Environment shape the browser is allowed to see — secret masked. */
export interface MaskedEnvironment {
  id: string;
  label: string;
  pod: PodId;
  orgId: number;
  accountId: number;
  clientId: string;
  /** Always of the form "••••1234" (last 4 chars only). */
  clientSecretMasked: string;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating/updating an environment. Secret omitted on update = keep existing. */
export interface EnvironmentInput {
  label: string;
  pod: PodId;
  orgId: number;
  accountId: number;
  clientId: string;
  clientSecret?: string;
}

/** What the user wants to do; the server turns this into a full-manifest PUT. */
export type MutationIntent =
  | { type: 'upsertRole'; role: Role }
  | { type: 'deleteRole'; roleId: string }
  | { type: 'restoreSnapshot'; historyEntryId: string };

/** Normalized error envelope returned by the proxy for every failure. */
export interface ApiErrorBody {
  code: ErrorCode;
  httpStatus: number;
  message: string;
  details?: unknown;
  /** Seconds to wait, present for RATE_LIMITED. */
  retryAfter?: number;
}

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';
