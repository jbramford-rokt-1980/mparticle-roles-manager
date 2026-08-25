import { describe, expect, it } from 'vitest';

import { groupTasksBySection } from '../groupTasks';
import { allTaskIds, applyTaskGrant } from '../taskGrants';
import type { TaskDef } from '../types';

const task = (id: string): TaskDef => ({ task_id: id, display_name: null, description: null });

const CATALOG = [
  task('audiences:view'),
  task('audiences:edit'),
  task('audiences:*'),
  task('composable_audiences:view'),
  task('composable_audiences:*'),
  task('live_stream:view'),
  task('connections:view'),
  task('connections:configure_inputs'),
  task('connections:*'),
];

function groupsFor(labels: string[]) {
  return groupTasksBySection(CATALOG)
    .filter((s) => labels.includes(s.label))
    .flatMap((s) => s.groups);
}

describe('applyTaskGrant', () => {
  it('adds a grant', () => {
    expect([...applyTaskGrant(new Set(), 'audiences:view', true)]).toEqual(['audiences:view']);
  });

  it('removes a grant', () => {
    const result = applyTaskGrant(new Set(['audiences:view']), 'audiences:view', false);
    expect([...result]).toEqual([]);
  });

  it('full access supersedes narrower grants in the same feature', () => {
    const result = applyTaskGrant(
      new Set(['audiences:view', 'audiences:edit', 'rules:view']),
      'audiences:*',
      true,
    );
    expect([...result].sort()).toEqual(['audiences:*', 'rules:view']);
  });

  it('a narrower grant clears full access for that feature', () => {
    const result = applyTaskGrant(new Set(['audiences:*']), 'audiences:view', true);
    expect([...result]).toEqual(['audiences:view']);
  });

  it('leaves other features untouched', () => {
    const result = applyTaskGrant(new Set(['rules:*']), 'audiences:*', true);
    expect([...result].sort()).toEqual(['audiences:*', 'rules:*']);
  });

  it('does not mutate the set it is given', () => {
    const original = new Set(['audiences:view']);
    applyTaskGrant(original, 'audiences:*', true);
    expect([...original]).toEqual(['audiences:view']);
  });
});

describe('allTaskIds', () => {
  it('lists every task in the groups, full access included', () => {
    const groups = groupsFor(['Audiences & Activation']);
    expect(allTaskIds(groups).sort()).toEqual([
      'audiences:*',
      'audiences:edit',
      'audiences:view',
      'composable_audiences:*',
      'composable_audiences:view',
    ]);
  });
});
