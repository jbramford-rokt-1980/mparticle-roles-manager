import { describe, expect, it } from 'vitest';

import { validateRole } from '../validateRole';
import type { Role } from '../types';

const validTaskIds = new Set(['user:core', 'audiences:view', 'audiences:*']);

function role(overrides: Partial<Role> = {}): Role {
  return {
    role_id: 'my-role',
    name: 'My Role',
    description: 'A role',
    tasks: [{ task_id: 'audiences:view' }],
    ...overrides,
  };
}

function fields(errors: { field: string }[]): string[] {
  return errors.map((e) => e.field);
}

describe('validateRole', () => {
  const context = { existingRoleIds: new Set<string>(), validTaskIds, totalRolesAfter: 5 };

  it('accepts a valid role', () => {
    expect(validateRole(role(), context)).toEqual([]);
  });

  it('requires name and role_id', () => {
    const errors = validateRole(role({ name: '  ', role_id: '' }), context);
    expect(fields(errors)).toEqual(expect.arrayContaining(['name', 'role_id']));
  });

  it('enforces the 64/64/256 length limits', () => {
    const errors = validateRole(
      role({ name: 'x'.repeat(65), role_id: 'y'.repeat(65), description: 'z'.repeat(257) }),
      context,
    );
    expect(fields(errors)).toEqual(expect.arrayContaining(['name', 'role_id', 'description']));
  });

  it('rejects a duplicate role_id when creating', () => {
    const errors = validateRole(role(), {
      ...context,
      existingRoleIds: new Set(['my-role']),
    });
    expect(fields(errors)).toContain('role_id');
    expect(errors.find((e) => e.field === 'role_id')?.message).toMatch(/already exists/i);
  });

  it('rejects unknown task ids, listing them', () => {
    const errors = validateRole(
      role({ tasks: [{ task_id: 'bogus:*' }, { task_id: 'audiences:view' }] }),
      context,
    );
    const taskError = errors.find((e) => e.field === 'tasks');
    expect(taskError?.message).toContain('bogus:*');
  });

  it('rejects when the org would exceed 100 roles', () => {
    const errors = validateRole(role(), { ...context, totalRolesAfter: 101 });
    expect(fields(errors)).toContain('manifest');
  });

  it('skips task validation when the catalog is unavailable', () => {
    const errors = validateRole(role({ tasks: [{ task_id: 'anything:goes' }] }), {
      ...context,
      validTaskIds: undefined,
    });
    expect(errors).toEqual([]);
  });
});
