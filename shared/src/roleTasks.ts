import { CORE_TASK } from './limits';
import type { Role } from './types';

/** Task IDs granted beyond mandatory core access. */
export function grantedTaskIds(role: Role): string[] {
  return role.tasks.map((task) => task.task_id).filter((taskId) => taskId !== CORE_TASK);
}

/** Number of permissions granted beyond mandatory core access. */
export function grantedPermissionCount(role: Role): number {
  return grantedTaskIds(role).length;
}
