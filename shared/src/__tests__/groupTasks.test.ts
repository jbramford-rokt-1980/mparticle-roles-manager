import { describe, expect, it } from 'vitest';

import { groupTasks } from '../groupTasks';
import type { TaskDef } from '../types';

const tasks: TaskDef[] = [
  { task_id: 'audiences:view', display_name: 'Audiences View', description: 'View audiences' },
  { task_id: 'audiences:*', display_name: 'Audiences Full', description: 'Full audiences' },
  { task_id: 'connections:configure_inputs', display_name: 'Configure Inputs', description: '' },
  { task_id: 'connections:*', display_name: 'Connections Full', description: '' },
  { task_id: 'catalog:*', display_name: 'Catalog', description: '' },
  { task_id: 'user:core', display_name: 'Core', description: 'Log in' },
];

describe('groupTasks', () => {
  it('groups tasks by feature, excluding the mandatory core task', () => {
    const groups = groupTasks(tasks);
    expect(groups.map((g) => g.feature)).toEqual(['audiences', 'catalog', 'connections']);
  });

  it('orders options within a group: view, granular actions, then full access', () => {
    const groups = groupTasks(tasks);
    const connections = groups.find((g) => g.feature === 'connections');
    expect(connections?.options.map((o) => o.task_id)).toEqual([
      'connections:configure_inputs',
      'connections:*',
    ]);
    const audiences = groups.find((g) => g.feature === 'audiences');
    expect(audiences?.options.map((o) => o.task_id)).toEqual(['audiences:view', 'audiences:*']);
  });

  it('produces a readable feature label', () => {
    const groups = groupTasks([
      { task_id: 'calculated_attributes:view', display_name: 'CA View', description: '' },
    ]);
    expect(groups[0]?.label).toBe('Calculated Attributes');
  });

  it('keeps tasks with unexpected formats in their own group', () => {
    const groups = groupTasks([{ task_id: 'oddball', display_name: 'Odd', description: '' }]);
    expect(groups[0]?.feature).toBe('oddball');
    expect(groups[0]?.options).toHaveLength(1);
  });

  it('generates labels with real product names when display_name is null (live API behavior)', () => {
    const groups = groupTasks([
      { task_id: 'audiences:view', display_name: null, description: null },
      { task_id: 'audiences:*', display_name: null, description: null },
      { task_id: 'user_groups:view', display_name: null, description: null },
      { task_id: 'connections:configure_inputs', display_name: null, description: null },
    ]);
    const labels = groups.flatMap((g) => g.options.map((o) => o.label));
    expect(labels).toEqual([
      'Real-time Audiences — View',
      'Real-time Audiences — Full access',
      'Connections — Configure inputs',
      'Household Reach — View',
    ]);
  });

  it('falls back to curated docs descriptions when the API returns null', () => {
    const groups = groupTasks([
      { task_id: 'audiences:view', display_name: null, description: null },
      { task_id: 'made_up:action', display_name: null, description: null },
    ]);
    const audiencesView = groups
      .flatMap((g) => g.options)
      .find((o) => o.task_id === 'audiences:view');
    expect(audiencesView?.help).toMatch(/view all audiences/i);
    const unknown = groups.flatMap((g) => g.options).find((o) => o.task_id === 'made_up:action');
    expect(unknown?.help).toBeUndefined();
  });

  it('prefers the API description over the curated one', () => {
    const groups = groupTasks([
      { task_id: 'audiences:view', display_name: null, description: 'API-provided text' },
    ]);
    expect(groups[0]?.options[0]?.help).toBe('API-provided text');
  });

  it('prefers the API display_name for the label when present', () => {
    const groups = groupTasks([
      { task_id: 'audiences:view', display_name: 'Audiences View (custom)', description: '' },
    ]);
    expect(groups[0]?.options[0]?.label).toBe('Audiences View (custom)');
  });
});
