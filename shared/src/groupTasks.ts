import { CORE_TASK } from './limits';
import type { TaskDef } from './types';

export interface TaskOption extends TaskDef {
  /** The action part of `feature:action`; '*' means full access. */
  action: string;
  /** Human-readable label: API display_name when present, generated otherwise. */
  label: string;
}

export interface TaskGroup {
  feature: string;
  /** Humanized feature name, e.g. "calculated_attributes" → "Calculated Attributes". */
  label: string;
  options: TaskOption[];
}

function humanize(feature: string): string {
  return feature
    .split('_')
    .map((word) => (word ? word[0]?.toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function actionRank(action: string): number {
  if (action === 'view') return 0;
  if (action === '*') return 2;
  return 1;
}

function actionLabel(action: string): string {
  if (action === '*') return 'Full access';
  const words = action.split('_').join(' ');
  return words ? words[0]?.toUpperCase() + words.slice(1) : words;
}

/** Label for a task outside group context (e.g. `user:core` → "User — Core"). */
export function taskLabel(task: TaskDef): string {
  if (task.display_name) return task.display_name;
  const separator = task.task_id.indexOf(':');
  if (separator === -1) return humanize(task.task_id);
  const feature = task.task_id.slice(0, separator);
  const action = task.task_id.slice(separator + 1);
  return `${humanize(feature)} — ${actionLabel(action)}`;
}

/**
 * Turn the flat /tasks catalog into feature groups for the permission grid.
 * `user:core` is excluded — it is mandatory and rendered separately.
 */
export function groupTasks(tasks: TaskDef[]): TaskGroup[] {
  const byFeature = new Map<string, TaskOption[]>();

  for (const task of tasks) {
    if (task.task_id === CORE_TASK) continue;
    const separator = task.task_id.indexOf(':');
    const feature = separator === -1 ? task.task_id : task.task_id.slice(0, separator);
    const action = separator === -1 ? task.task_id : task.task_id.slice(separator + 1);
    const options = byFeature.get(feature) ?? [];
    const label = task.display_name || `${humanize(feature)} — ${actionLabel(action)}`;
    options.push({ ...task, action, label });
    byFeature.set(feature, options);
  }

  return [...byFeature.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([feature, options]) => ({
      feature,
      label: humanize(feature),
      options: options.sort(
        (a, b) => actionRank(a.action) - actionRank(b.action) || a.action.localeCompare(b.action),
      ),
    }));
}
