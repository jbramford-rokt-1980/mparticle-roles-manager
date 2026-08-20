import type { Role } from '@roles/shared';

import { Button } from './ui/Button';
import { Select } from './ui/Select';

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
  const creating = value === NEW_ROLE_VALUE;
  const options = [...roles]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((role) => ({
      value: role.role_id,
      label: role.name,
      detail: role.role_id,
    }));

  return (
    <div className="flex flex-wrap items-end gap-4">
      {roles.length > 0 ? (
        <Select
          label="Role"
          value={creating ? '' : value}
          options={options}
          onChange={onChange}
          placeholder="Select a role…"
          className="w-full max-w-xs"
        />
      ) : (
        <p className="text-black/60">No custom roles in this org yet — create the first one.</p>
      )}
      <Button type="button" onClick={() => onChange(NEW_ROLE_VALUE)}>
        New role
      </Button>
    </div>
  );
}
