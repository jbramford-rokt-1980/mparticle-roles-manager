import { useId } from 'react';

import type { Role } from '@roles/shared';

import { Button } from './ui/Button';

export const NEW_ROLE_VALUE = '__new__';

export interface RoleSelectProps {
  roles: Role[];
  /** role_id of the selected role, or NEW_ROLE_VALUE while creating. */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Existing-role picker plus an explicit "New role" button — creation is a
 * visible action, not an option buried in the dropdown. With no roles yet,
 * the dropdown is replaced by an empty-state message.
 */
export function RoleSelect({ roles, value, onChange }: RoleSelectProps) {
  const id = useId();
  const creating = value === NEW_ROLE_VALUE;

  return (
    <div className="flex flex-wrap items-end gap-4">
      {roles.length > 0 ? (
        <div>
          <label
            htmlFor={id}
            className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.18em] text-black/60"
          >
            Role
          </label>
          <select
            id={id}
            value={creating ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            className="w-auto min-w-56 border border-black/25 bg-white px-3.5 py-2.5 pr-9 text-[15px] outline-none focus:border-beetroot"
          >
            {creating && (
              <option value="" disabled>
                Select a role…
              </option>
            )}
            {[...roles]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.name}
                </option>
              ))}
          </select>
        </div>
      ) : (
        <p className="text-black/60">No custom roles in this org yet — create the first one.</p>
      )}
      <Button
        type="button"
        variant={creating ? 'primary' : 'secondary'}
        onClick={() => onChange(NEW_ROLE_VALUE)}
      >
        New role
      </Button>
    </div>
  );
}
