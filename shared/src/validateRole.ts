import { CORE_TASK, DESCRIPTION_MAX, MAX_ROLES_PER_ORG, NAME_MAX, ROLE_ID_MAX } from './limits';
import type { Role } from './types';

export interface RoleValidationError {
  /** 'name' | 'role_id' | 'description' | 'tasks' | 'manifest' */
  field: string;
  message: string;
}

export interface RoleValidationContext {
  /** role_ids already in the manifest, excluding the role being edited. */
  existingRoleIds: ReadonlySet<string>;
  /** Known task_ids from the live catalog; undefined skips task validation. */
  validTaskIds?: ReadonlySet<string>;
  /** How many roles the manifest would contain after this change. */
  totalRolesAfter: number;
}

/**
 * Client- and server-shared validation against the API's documented limits.
 * The server runs this before every PUT; the UI runs it live in the editor,
 * so both always agree.
 */
export function validateRole(role: Role, context: RoleValidationContext): RoleValidationError[] {
  const errors: RoleValidationError[] = [];
  const name = role.name.trim();
  const roleId = role.role_id.trim();
  const description = (role.description ?? '').trim();

  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.length > NAME_MAX) {
    errors.push({ field: 'name', message: `Name must be at most ${NAME_MAX} characters` });
  }

  if (!roleId) {
    errors.push({ field: 'role_id', message: 'Role ID is required' });
  } else if (roleId.length > ROLE_ID_MAX) {
    errors.push({ field: 'role_id', message: `Role ID must be at most ${ROLE_ID_MAX} characters` });
  } else if (context.existingRoleIds.has(roleId)) {
    errors.push({ field: 'role_id', message: `A role with ID "${roleId}" already exists` });
  }

  if (description.length > DESCRIPTION_MAX) {
    errors.push({
      field: 'description',
      message: `Description must be at most ${DESCRIPTION_MAX} characters`,
    });
  }

  if (context.validTaskIds) {
    const unknown = role.tasks
      .map((t) => t.task_id)
      .filter((id) => id !== CORE_TASK && !context.validTaskIds?.has(id));
    if (unknown.length > 0) {
      errors.push({ field: 'tasks', message: `Unknown permission task ids: ${unknown.join(', ')}` });
    }
  }

  if (context.totalRolesAfter > MAX_ROLES_PER_ORG) {
    errors.push({
      field: 'manifest',
      message: `The org would have ${context.totalRolesAfter} roles — the API limit is ${MAX_ROLES_PER_ORG}`,
    });
  }

  return errors;
}
