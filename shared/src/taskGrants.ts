import type { TaskGroup } from './groupTasks';

/** Feature prefix of a `feature:action` task id. */
function featureOf(taskId: string): string {
  const separator = taskId.indexOf(':');
  return separator === -1 ? taskId : taskId.slice(0, separator);
}

/**
 * Add or remove one permission, keeping a feature's grants coherent:
 * full access supersedes narrower options, and picking a narrower option
 * drops full access. Returns a new set — the input is never mutated.
 */
export function applyTaskGrant(
  granted: ReadonlySet<string>,
  taskId: string,
  checked: boolean,
): Set<string> {
  const next = new Set(granted);
  if (!checked) {
    next.delete(taskId);
    return next;
  }

  const feature = featureOf(taskId);
  if (taskId.endsWith(':*')) {
    for (const existing of next) {
      if (featureOf(existing) === feature) next.delete(existing);
    }
  } else {
    next.delete(`${feature}:*`);
  }
  next.add(taskId);
  return next;
}

/** Every task id in these groups. */
export function allTaskIds(groups: TaskGroup[]): string[] {
  return groups.flatMap((group) => group.options.map((option) => option.task_id));
}
