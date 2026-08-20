import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CORE_TASK, type Role } from '@roles/shared';

import { useManifest, useTasks } from '../api/roles';
import { EnvSwitcher } from '../components/EnvSwitcher';
import { PermissionGrid } from '../components/PermissionGrid';
import { NEW_ROLE_VALUE, RoleSelect } from '../components/RoleSelect';
import { Field } from '../components/ui/Field';
import { useSelectedEnv } from '../state/SelectedEnvContext';

export function RoleEditorPage() {
  const { selected } = useSelectedEnv();
  const { data: manifest } = useManifest(selected?.id);
  const { data: tasks } = useTasks(selected?.id);
  const [searchParams] = useSearchParams();

  const initialRoleId = searchParams.get('role') ?? NEW_ROLE_VALUE;
  const [roleValue, setRoleValue] = useState(initialRoleId);

  const activeRole: Role | undefined = useMemo(
    () => manifest?.roles.find((r) => r.role_id === roleValue),
    [manifest, roleValue],
  );

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [granted, setGranted] = useState<ReadonlySet<string>>(new Set());

  // Re-seed the form whenever a different role is picked (or its data loads).
  useEffect(() => {
    if (activeRole) {
      setName(activeRole.name);
      setDescription(activeRole.description ?? '');
      setGranted(new Set(activeRole.tasks.map((t) => t.task_id).filter((t) => t !== CORE_TASK)));
    } else {
      setName('');
      setDescription('');
      setGranted(new Set());
    }
  }, [activeRole]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Role editor</h1>
          <p className="mt-1 text-black/60">
            Pick an existing role to see exactly what it grants, or start a new one.
          </p>
        </div>
        <EnvSwitcher />
      </div>

      {manifest && tasks && (
        <div className="mt-8 space-y-8">
          <RoleSelect roles={manifest.roles} value={roleValue} onChange={setRoleValue} />

          <div className="grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Name" value={name} readOnly onChange={() => undefined} />
            <Field
              label="Role ID"
              value={activeRole?.role_id ?? ''}
              readOnly
              onChange={() => undefined}
              hint={activeRole ? 'Immutable — changing it would delete and recreate the role' : undefined}
            />
            <Field
              label="Description"
              className="sm:col-span-2"
              value={description}
              readOnly
              onChange={() => undefined}
            />
          </div>

          <PermissionGrid tasks={tasks} granted={granted} readOnly />
          <p className="text-sm text-black/50">
            Editing and saving arrive in the next milestone — this view is read-only.
          </p>
        </div>
      )}
    </div>
  );
}
