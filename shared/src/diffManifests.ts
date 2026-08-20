import { CORE_TASK } from './limits';
import type { Role } from './types';

/** A role normalized for comparison: trimmed strings, sorted deduped tasks incl. core. */
export interface DiffRole {
  role_id: string;
  name: string;
  description: string;
  tasks: string[];
}

export interface ModifiedRole {
  role_id: string;
  before: DiffRole;
  after: DiffRole;
  nameChanged: boolean;
  descriptionChanged: boolean;
  addedTasks: string[];
  removedTasks: string[];
}

export interface DiffSummary {
  createdCount: number;
  modifiedCount: number;
  deletedCount: number;
  unchangedCount: number;
}

export interface ManifestDiff {
  created: DiffRole[];
  deleted: DiffRole[];
  modified: ModifiedRole[];
  unchanged: DiffRole[];
  summary: DiffSummary;
}

function normalize(role: Role): DiffRole {
  const tasks = new Set(role.tasks.map((t) => t.task_id.trim()));
  // user:core is mandatory and auto-included by the API; normalizing it into
  // both sides keeps it out of every diff regardless of whether the API echoes it.
  tasks.add(CORE_TASK);
  return {
    role_id: role.role_id.trim(),
    name: role.name.trim(),
    description: (role.description ?? '').trim(),
    tasks: [...tasks].sort(),
  };
}

function byRoleId(a: { role_id: string }, b: { role_id: string }): number {
  return a.role_id.localeCompare(b.role_id);
}

/**
 * Pure diff between two role manifests, keyed by role_id.
 * Powers the mandatory diff-preview gate before every full-replace PUT.
 */
export function diffManifests(before: Role[], after: Role[]): ManifestDiff {
  const beforeMap = new Map(before.map((r) => [r.role_id.trim(), normalize(r)]));
  const afterMap = new Map(after.map((r) => [r.role_id.trim(), normalize(r)]));

  const created: DiffRole[] = [];
  const deleted: DiffRole[] = [];
  const modified: ModifiedRole[] = [];
  const unchanged: DiffRole[] = [];

  for (const [id, afterRole] of afterMap) {
    if (!beforeMap.has(id)) created.push(afterRole);
  }
  for (const [id, beforeRole] of beforeMap) {
    const afterRole = afterMap.get(id);
    if (!afterRole) {
      deleted.push(beforeRole);
      continue;
    }
    const beforeTasks = new Set(beforeRole.tasks);
    const afterTasks = new Set(afterRole.tasks);
    const addedTasks = afterRole.tasks.filter((t) => !beforeTasks.has(t));
    const removedTasks = beforeRole.tasks.filter((t) => !afterTasks.has(t));
    const nameChanged = beforeRole.name !== afterRole.name;
    const descriptionChanged = beforeRole.description !== afterRole.description;

    if (nameChanged || descriptionChanged || addedTasks.length || removedTasks.length) {
      modified.push({
        role_id: id,
        before: beforeRole,
        after: afterRole,
        nameChanged,
        descriptionChanged,
        addedTasks,
        removedTasks,
      });
    } else {
      unchanged.push(afterRole);
    }
  }

  created.sort(byRoleId);
  deleted.sort(byRoleId);
  modified.sort(byRoleId);
  unchanged.sort(byRoleId);

  return {
    created,
    deleted,
    modified,
    unchanged,
    summary: {
      createdCount: created.length,
      modifiedCount: modified.length,
      deletedCount: deleted.length,
      unchangedCount: unchanged.length,
    },
  };
}
