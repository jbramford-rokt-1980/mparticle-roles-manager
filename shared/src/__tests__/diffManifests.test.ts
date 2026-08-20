import { describe, expect, it } from 'vitest';

import { diffManifests } from '../diffManifests';
import type { Role } from '../types';

function role(id: string, name: string, tasks: string[], description = ''): Role {
  return { role_id: id, name, description, tasks: tasks.map((t) => ({ task_id: t })) };
}

describe('diffManifests', () => {
  it('reports identical manifests as unchanged', () => {
    const roles = [role('a', 'A', ['audiences:view'])];
    const diff = diffManifests(roles, roles);
    expect(diff.created).toEqual([]);
    expect(diff.deleted).toEqual([]);
    expect(diff.modified).toEqual([]);
    expect(diff.summary).toEqual({
      createdCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      unchangedCount: 1,
    });
  });

  it('detects created roles', () => {
    const diff = diffManifests([], [role('new', 'New Role', ['audiences:view'])]);
    expect(diff.created).toHaveLength(1);
    expect(diff.created[0]?.role_id).toBe('new');
    expect(diff.summary.createdCount).toBe(1);
  });

  it('detects deleted roles', () => {
    const diff = diffManifests([role('gone', 'Gone', ['audiences:view'])], []);
    expect(diff.deleted).toHaveLength(1);
    expect(diff.deleted[0]?.role_id).toBe('gone');
  });

  it('detects added and removed tasks, insensitive to order and duplicates', () => {
    const before = [role('r', 'R', ['audiences:view', 'rules:view'])];
    const after = [role('r', 'R', ['rules:view', 'rules:view', 'data_plans:view'])];
    const diff = diffManifests(before, after);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0]?.addedTasks).toEqual(['data_plans:view']);
    expect(diff.modified[0]?.removedTasks).toEqual(['audiences:view']);
  });

  it('task reordering alone is not a modification', () => {
    const before = [role('r', 'R', ['audiences:view', 'rules:view'])];
    const after = [role('r', 'R', ['rules:view', 'audiences:view'])];
    expect(diffManifests(before, after).summary.unchangedCount).toBe(1);
  });

  it('detects name and description changes', () => {
    const before = [role('r', 'Old Name', [], 'old desc')];
    const after = [role('r', 'New Name', [], 'new desc')];
    const diff = diffManifests(before, after);
    expect(diff.modified[0]?.nameChanged).toBe(true);
    expect(diff.modified[0]?.descriptionChanged).toBe(true);
    expect(diff.modified[0]?.before.name).toBe('Old Name');
    expect(diff.modified[0]?.after.name).toBe('New Name');
  });

  it('normalizes user:core into both sides so it never shows as a change', () => {
    const before = [role('r', 'R', ['audiences:view'])];
    const after = [role('r', 'R', ['user:core', 'audiences:view'])];
    expect(diffManifests(before, after).summary.unchangedCount).toBe(1);
  });

  it('trims whitespace before comparing', () => {
    const before = [role('r', 'Name', [])];
    const after = [role('r', '  Name  ', [])];
    expect(diffManifests(before, after).summary.unchangedCount).toBe(1);
  });

  it('sorts every list deterministically by role_id / task_id', () => {
    const diff = diffManifests(
      [],
      [role('zeta', 'Z', ['rules:view', 'audiences:view']), role('alpha', 'A', [])],
    );
    expect(diff.created.map((r) => r.role_id)).toEqual(['alpha', 'zeta']);
    expect(diff.created[1]?.tasks).toEqual(['audiences:view', 'rules:view', 'user:core']);
  });

  it('handles a combined create + modify + delete in one diff', () => {
    const before = [role('keep', 'Keep', ['audiences:view']), role('gone', 'Gone', [])];
    const after = [role('keep', 'Keep', ['audiences:*']), role('new', 'New', [])];
    const diff = diffManifests(before, after);
    expect(diff.summary).toEqual({
      createdCount: 1,
      modifiedCount: 1,
      deletedCount: 1,
      unchangedCount: 0,
    });
  });
});
