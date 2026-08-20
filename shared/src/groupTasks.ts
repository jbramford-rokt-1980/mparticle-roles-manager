import { CORE_TASK } from './limits';
import {
  FEATURE_NAMES,
  PERMISSION_SECTIONS,
  TASK_DESCRIPTIONS,
  UNDOCUMENTED_TASKS,
} from './taskHelp';
import type { TaskDef } from './types';

export interface TaskOption extends TaskDef {
  /** The action part of `feature:action`; '*' means full access. */
  action: string;
  /** Human-readable label: API display_name, else generated from the product name. */
  label: string;
  /** What this grants: API description, else curated docs text. */
  help?: string;
  /** True when mParticle's public docs don't describe this permission. */
  undocumented: boolean;
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

function featureName(feature: string): string {
  return FEATURE_NAMES[feature] ?? humanize(feature);
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

/** Label for a task outside group context (e.g. `audiences:view` → "Real-time Audiences — View"). */
export function taskLabel(task: TaskDef): string {
  if (task.display_name) return task.display_name;
  const separator = task.task_id.indexOf(':');
  if (separator === -1) return humanize(task.task_id);
  const feature = task.task_id.slice(0, separator);
  const action = task.task_id.slice(separator + 1);
  return `${featureName(feature)} — ${actionLabel(action)}`;
}

/** Best available description for a task id. */
export function taskHelp(task: TaskDef): string | undefined {
  return task.description ?? TASK_DESCRIPTIONS[task.task_id];
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
    const label = task.display_name || `${featureName(feature)} — ${actionLabel(action)}`;
    const help = task.description ?? TASK_DESCRIPTIONS[task.task_id];
    options.push({
      ...task,
      action,
      label,
      undocumented: UNDOCUMENTED_TASKS.has(task.task_id),
      ...(help !== undefined ? { help } : {}),
    });
    byFeature.set(feature, options);
  }

  return [...byFeature.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([feature, options]) => ({
      feature,
      label: featureName(feature),
      options: options.sort(
        (a, b) => actionRank(a.action) - actionRank(b.action) || a.action.localeCompare(b.action),
      ),
    }));
}

export interface TaskSection {
  label: string;
  groups: TaskGroup[];
}

/**
 * Top-level grouping of the permission grid, ordered the way data moves
 * through the platform: ingestion → connections → features → admin.
 * Features outside the known sections land in a trailing "Other" section.
 */
export function groupTasksBySection(tasks: TaskDef[]): TaskSection[] {
  const groups = groupTasks(tasks);
  const remaining = new Map(groups.map((g) => [g.feature, g]));
  const sections: TaskSection[] = [];

  for (const section of PERMISSION_SECTIONS) {
    const sectionGroups: TaskGroup[] = [];
    for (const feature of section.features) {
      const group = remaining.get(feature);
      if (group) {
        sectionGroups.push(group);
        remaining.delete(feature);
      }
    }
    if (sectionGroups.length > 0) {
      sections.push({ label: section.label, groups: sectionGroups });
    }
  }

  if (remaining.size > 0) {
    sections.push({ label: 'Other', groups: [...remaining.values()] });
  }

  return sections;
}
