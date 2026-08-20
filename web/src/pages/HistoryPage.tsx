import { useState } from 'react';

import { isApiClientError } from '../api/client';
import { useHistory, type HistoryListEntry } from '../api/history';
import { usePlanRoles, useCommitRoles, type PlanResult } from '../api/mutations';
import { DiffPreviewModal } from '../components/DiffPreviewModal';
import { EnvSwitcher } from '../components/EnvSwitcher';
import { Button } from '../components/ui/Button';
import { useSelectedEnv } from '../state/SelectedEnvContext';

export function HistoryPage() {
  const { selected } = useSelectedEnv();
  const { data: entries, isLoading } = useHistory(selected?.id);
  const plan = usePlanRoles(selected?.id);
  const commit = useCommitRoles(selected?.id);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [restoredNote, setRestoredNote] = useState(false);

  const startRestore = (entryId: string) => {
    setRestoredNote(false);
    commit.reset();
    plan.mutate({ type: 'restoreSnapshot', historyEntryId: entryId }, { onSuccess: setPlanResult });
  };

  const confirmRestore = () => {
    if (!planResult) return;
    commit.mutate(
      { proposedRoles: planResult.proposedRoles, baseVersion: planResult.baseVersion },
      {
        onSuccess: () => {
          setPlanResult(null);
          setRestoredNote(true);
        },
      },
    );
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">History</h1>
          <p className="mt-1 text-black/60">
            Every change this app has written for the selected environment, plus the org&apos;s
            starting state. Restore rolls back through the same diff-review gate.
          </p>
        </div>
        <EnvSwitcher />
      </div>

      {restoredNote && (
        <p className="mt-6 border border-black/15 bg-wine-tint/60 px-4 py-3 text-sm">
          Restored — the org&apos;s manifest was updated.
        </p>
      )}
      {plan.isError && (
        <p role="alert" className="mt-6 border border-beetroot bg-beetroot-tint px-4 py-3 text-sm">
          {isApiClientError(plan.error) ? plan.error.message : 'Planning the restore failed'}
        </p>
      )}

      {isLoading && <p className="mt-8 text-black/50">Loading history…</p>}

      <ol className="mt-8 space-y-4">
        {entries?.map((entry) => (
          <HistoryRow
            key={entry.id}
            entry={entry}
            onRestore={() => startRestore(entry.id)}
            restoring={plan.isPending}
          />
        ))}
      </ol>

      {entries?.length === 0 && (
        <div className="mt-8 border border-dashed border-black/25 px-6 py-10 text-center text-black/60">
          No history yet for this environment — it starts with the first roles fetch.
        </div>
      )}

      {planResult && (
        <DiffPreviewModal
          diff={planResult.diff}
          warnings={planResult.warnings}
          errorMessage={
            commit.isError
              ? isApiClientError(commit.error)
                ? commit.error.message
                : 'Restore failed'
              : undefined
          }
          committing={commit.isPending}
          onConfirm={confirmRestore}
          onCancel={() => {
            setPlanResult(null);
            commit.reset();
          }}
        />
      )}
    </div>
  );
}

function HistoryRow({
  entry,
  onRestore,
  restoring,
}: {
  entry: HistoryListEntry;
  onRestore: () => void;
  restoring: boolean;
}) {
  return (
    <li className="border border-black/15 px-5 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/50">
          {entry.action}
        </span>
        <span className="font-medium">{entry.summary}</span>
        <span className="ml-auto flex items-center gap-4">
          <span className="font-mono text-[12px] text-black/50">
            {entry.versionBefore !== null ? `v${entry.versionBefore} → ` : ''}v
            {entry.versionAfter ?? '?'}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={restoring}
            onClick={onRestore}
          >
            Restore this state
          </Button>
        </span>
      </div>
      <p className="mt-1.5 text-sm text-black/60">
        {new Date(entry.timestamp).toLocaleString()} · {entry.roleCountAfter} roles after this
        change
      </p>
    </li>
  );
}
