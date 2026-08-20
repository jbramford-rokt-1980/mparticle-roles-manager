import { useState } from 'react';

import type { DiffRole, ManifestDiff, ModifiedRole } from '@roles/shared';

import { Button } from './ui/Button';

export interface DiffPreviewModalProps {
  diff: ManifestDiff;
  warnings?: string[];
  /** Set when the previous confirm attempt failed; shown inside the modal. */
  errorMessage?: string;
  committing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The safety gate: every PUT-bound change is reviewed here first.
 * Deletions additionally require an explicit acknowledgement.
 */
export function DiffPreviewModal({
  diff,
  warnings = [],
  errorMessage,
  committing,
  onConfirm,
  onCancel,
}: DiffPreviewModalProps) {
  const [acknowledgedDelete, setAcknowledgedDelete] = useState(false);
  const hasDeletions = diff.summary.deletedCount > 0;
  const confirmDisabled = committing || (hasDeletions && !acknowledgedDelete);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-black bg-white">
        <div className="border-b border-black/10 px-6 py-4">
          <h2 className="text-xl font-medium">Review changes</h2>
          <p className="mt-1 font-mono text-[12px] text-black/60">
            <span>{diff.summary.createdCount} created</span>
            {' · '}
            <span>{diff.summary.modifiedCount} modified</span>
            {' · '}
            <span>{diff.summary.deletedCount} deleted</span>
            {' · '}
            <span>{diff.summary.unchangedCount} unchanged</span>
          </p>
        </div>

        <div className="space-y-6 px-6 py-5">
          {warnings.map((w) => (
            <p key={w} className="border border-black/20 bg-wine-tint/60 px-4 py-3 text-sm">
              {w}
            </p>
          ))}

          {diff.deleted.length > 0 && (
            <section>
              <SectionTitle tone="danger">Deleted</SectionTitle>
              <div className="mt-2 space-y-2 border border-beetroot bg-beetroot-tint px-4 py-3">
                {diff.deleted.map((role) => (
                  <RoleCard key={role.role_id} role={role} />
                ))}
                <p className="text-sm">
                  These roles will be removed from the org for everyone. If a role is still
                  assigned to a user, mParticle will reject the whole change.
                </p>
              </div>
            </section>
          )}

          {diff.created.length > 0 && (
            <section>
              <SectionTitle tone="accent">Created</SectionTitle>
              <div className="mt-2 space-y-3">
                {diff.created.map((role) => (
                  <RoleCard key={role.role_id} role={role} showTasks />
                ))}
              </div>
            </section>
          )}

          {diff.modified.length > 0 && (
            <section>
              <SectionTitle>Modified</SectionTitle>
              <div className="mt-2 space-y-4">
                {diff.modified.map((change) => (
                  <ModifiedCard key={change.role_id} change={change} />
                ))}
              </div>
            </section>
          )}

          {errorMessage && (
            <p role="alert" className="border border-beetroot bg-beetroot-tint px-4 py-3 text-sm">
              {errorMessage}
            </p>
          )}

          {hasDeletions && (
            <label className="flex items-start gap-3 border-t border-black/10 pt-4">
              <input
                type="checkbox"
                className="mt-1 accent-beetroot"
                checked={acknowledgedDelete}
                onChange={(e) => setAcknowledgedDelete(e.target.checked)}
              />
              <span className="text-sm">
                I understand this permanently deletes{' '}
                {diff.summary.deletedCount === 1 ? 'a role' : `${diff.summary.deletedCount} roles`}{' '}
                from the customer org.
              </span>
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-black/10 px-6 py-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={committing}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={confirmDisabled}>
            {committing ? 'Writing…' : 'Confirm and write to org'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: 'accent' | 'danger';
}) {
  const color =
    tone === 'danger' ? 'text-beetroot' : tone === 'accent' ? 'text-beetroot' : 'text-black/60';
  return (
    <h3 className={`font-mono text-[11px] uppercase tracking-[0.18em] ${color}`}>{children}</h3>
  );
}

function RoleCard({ role, showTasks = false }: { role: DiffRole; showTasks?: boolean }) {
  return (
    <div>
      <span className="font-medium">{role.name}</span>
      <span className="ml-2 font-mono text-[12px] text-black/50">{role.role_id}</span>
      {showTasks && (
        <p className="mt-1 font-mono text-[12px] leading-5 text-black/60">
          {role.tasks.join('  ')}
        </p>
      )}
    </div>
  );
}

function ModifiedCard({ change }: { change: ModifiedRole }) {
  return (
    <div className="border border-black/15 px-4 py-3">
      <span className="font-medium">{change.after.name}</span>
      <span className="ml-2 font-mono text-[12px] text-black/50">{change.role_id}</span>
      <div className="mt-2 space-y-1 text-sm">
        {change.nameChanged && (
          <p>
            Name: <s className="text-black/50">{change.before.name}</s> → {change.after.name}
          </p>
        )}
        {change.descriptionChanged && (
          <p>
            Description: <s className="text-black/50">{change.before.description || '(empty)'}</s>{' '}
            → {change.after.description || '(empty)'}
          </p>
        )}
        {change.addedTasks.map((task) => (
          <p key={task} className="font-mono text-[13px]">
            <span className="text-beetroot">+</span> {task}
          </p>
        ))}
        {change.removedTasks.map((task) => (
          <p key={task} className="font-mono text-[13px] text-black/50">
            <span>−</span> <s>{task}</s>
          </p>
        ))}
      </div>
    </div>
  );
}
