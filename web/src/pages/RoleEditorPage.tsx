import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  CORE_TASK,
  DESCRIPTION_MAX,
  NAME_MAX,
  ROLE_ID_MAX,
  validateRole,
  type MutationIntent,
  type Role,
} from '@roles/shared';

import { isApiClientError } from '../api/client';
import { usePlanRoles, useCommitRoles, type PlanResult } from '../api/mutations';
import { useManifest, useTasks } from '../api/roles';
import { DiffPreviewModal } from '../components/DiffPreviewModal';
import { EnvSwitcher } from '../components/EnvSwitcher';
import { PermissionGrid } from '../components/PermissionGrid';
import { RoleGrantsSummary } from '../components/RoleGrantsSummary';
import { NEW_ROLE_VALUE, RoleSelect } from '../components/RoleSelect';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { useSelectedEnv } from '../state/SelectedEnvContext';

export function RoleEditorPage() {
  const { selected } = useSelectedEnv();
  const { data: manifest } = useManifest(selected?.id);
  const { data: tasks } = useTasks(selected?.id);
  const [searchParams] = useSearchParams();

  const [roleValue, setRoleValue] = useState(searchParams.get('role') ?? NEW_ROLE_VALUE);
  const creating = roleValue === NEW_ROLE_VALUE;
  const activeRole: Role | undefined = useMemo(
    () => manifest?.roles.find((r) => r.role_id === roleValue),
    [manifest, roleValue],
  );

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [description, setDescription] = useState('');
  const [granted, setGranted] = useState<ReadonlySet<string>>(new Set());
  const [showErrors, setShowErrors] = useState(false);

  const plan = usePlanRoles(selected?.id);
  const commit = useCommitRoles(selected?.id);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [pendingIntent, setPendingIntent] = useState<MutationIntent | null>(null);
  const [conflictNote, setConflictNote] = useState(false);
  const [savedNote, setSavedNote] = useState(false);

  // Re-seed the form whenever a different role is picked (or its data loads).
  useEffect(() => {
    if (activeRole) {
      setName(activeRole.name);
      setRoleId(activeRole.role_id);
      setDescription(activeRole.description ?? '');
      setGranted(new Set(activeRole.tasks.map((t) => t.task_id).filter((t) => t !== CORE_TASK)));
    } else {
      setName('');
      setRoleId('');
      setDescription('');
      setGranted(new Set());
    }
    setShowErrors(false);
  }, [activeRole]);

  const buildRole = (): Role => ({
    role_id: creating ? roleId.trim() : (activeRole?.role_id ?? roleId.trim()),
    name,
    description,
    tasks: [...granted].map((task_id) => ({ task_id })),
  });

  const errors = useMemo(() => {
    if (!manifest) return [];
    return validateRole(buildRole(), {
      existingRoleIds: creating ? new Set(manifest.roles.map((r) => r.role_id)) : new Set(),
      validTaskIds: tasks ? new Set(tasks.map((t) => t.task_id)) : undefined,
      totalRolesAfter: creating ? manifest.roles.length + 1 : manifest.roles.length,
    });
  }, [manifest, tasks, creating, name, roleId, description, granted, activeRole]);

  const fieldError = (field: string) =>
    showErrors ? errors.find((e) => e.field === field)?.message : undefined;

  const toggleTask = (taskId: string, checked: boolean) => {
    setSavedNote(false);
    setGranted((prev) => {
      const next = new Set(prev);
      if (!checked) {
        next.delete(taskId);
        return next;
      }
      const separator = taskId.indexOf(':');
      const feature = separator === -1 ? taskId : taskId.slice(0, separator);
      if (taskId.endsWith(':*')) {
        // Full access supersedes every other grant in the feature.
        for (const existing of [...next]) {
          if (existing.startsWith(`${feature}:`)) next.delete(existing);
        }
      } else {
        next.delete(`${feature}:*`);
      }
      next.add(taskId);
      return next;
    });
  };

  const startReview = (intent: MutationIntent) => {
    setSavedNote(false);
    if (intent.type === 'upsertRole' && errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setPendingIntent(intent);
    setConflictNote(false);
    commit.reset();
    plan.mutate(intent, { onSuccess: setPlanResult });
  };

  const confirmCommit = () => {
    if (!planResult) return;
    commit.mutate(
      { proposedRoles: planResult.proposedRoles, baseVersion: planResult.baseVersion },
      {
        onSuccess: () => {
          setPlanResult(null);
          setSavedNote(true);
          if (pendingIntent?.type === 'deleteRole') {
            setRoleValue(NEW_ROLE_VALUE);
          } else if (creating) {
            setRoleValue(roleId.trim());
          }
        },
        onError: (err) => {
          if (isApiClientError(err, 'VERSION_CONFLICT') && pendingIntent) {
            // Someone changed the org in between — re-plan and show the fresh diff.
            plan.mutate(pendingIntent, {
              onSuccess: (fresh) => {
                setPlanResult(fresh);
                setConflictNote(true);
              },
            });
          }
        },
      },
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Role editor</h1>
          <p className="mt-1 text-black/60">
            Pick an existing role to see exactly what it grants, or start a new one. Nothing is
            written until you confirm a reviewed diff.
          </p>
        </div>
        <EnvSwitcher />
      </div>

      {manifest && tasks && (
        <div className="mt-8 space-y-8">
          <RoleSelect
            roles={manifest.roles}
            value={roleValue}
            onChange={(v) => {
              setRoleValue(v);
              setSavedNote(false);
            }}
          />

          <div className="grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={NAME_MAX}
              hint={`${name.length}/${NAME_MAX}`}
              error={fieldError('name')}
            />
            <Field
              label="Role ID"
              value={creating ? roleId : (activeRole?.role_id ?? '')}
              onChange={(e) => setRoleId(e.target.value)}
              readOnly={!creating}
              maxLength={ROLE_ID_MAX}
              hint={
                creating
                  ? `${roleId.length}/${ROLE_ID_MAX} — permanent identifier`
                  : 'Immutable — changing it would delete and recreate the role'
              }
              error={fieldError('role_id')}
            />
            <Field
              label="Description"
              className="sm:col-span-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={DESCRIPTION_MAX}
              hint={`${description.length}/${DESCRIPTION_MAX}`}
              error={fieldError('description')}
            />
          </div>

          {activeRole && <RoleGrantsSummary role={activeRole} tasks={tasks} />}

          <PermissionGrid tasks={tasks} granted={granted} onToggle={toggleTask} />

          {fieldError('tasks') && <p className="text-sm text-beetroot">{fieldError('tasks')}</p>}
          {fieldError('manifest') && (
            <p className="text-sm text-beetroot">{fieldError('manifest')}</p>
          )}
          {plan.isError && (
            <p role="alert" className="border border-beetroot bg-beetroot-tint px-4 py-3 text-sm">
              {isApiClientError(plan.error) ? plan.error.message : 'Planning failed'}
            </p>
          )}
          {savedNote && (
            <p className="border border-black/15 bg-wine-tint/60 px-4 py-3 text-sm">
              Saved — the org&apos;s manifest was updated.
            </p>
          )}

          <div className="flex items-center gap-4">
            <Button
              type="button"
              onClick={() => startReview({ type: 'upsertRole', role: buildRole() })}
              disabled={plan.isPending}
            >
              {plan.isPending ? 'Preparing diff…' : 'Review changes'}
            </Button>
            {!creating && activeRole && (
              <Button
                type="button"
                variant="danger"
                onClick={() => startReview({ type: 'deleteRole', roleId: activeRole.role_id })}
                disabled={plan.isPending}
              >
                Delete role
              </Button>
            )}
          </div>
        </div>
      )}

      {planResult && (
        <DiffPreviewModal
          diff={planResult.diff}
          warnings={[
            ...(conflictNote
              ? ['The org changed while you were reviewing — this is the refreshed diff.']
              : []),
            ...planResult.warnings,
          ]}
          errorMessage={
            commit.isError && !isApiClientError(commit.error, 'VERSION_CONFLICT')
              ? isApiClientError(commit.error)
                ? commit.error.message
                : 'Commit failed'
              : undefined
          }
          committing={commit.isPending || plan.isPending}
          onConfirm={confirmCommit}
          onCancel={() => {
            setPlanResult(null);
            commit.reset();
          }}
        />
      )}
    </div>
  );
}
