import { useState } from 'react';

import type { EnvironmentInput, MaskedEnvironment } from '@roles/shared';

import {
  useCreateEnvironment,
  useDeleteEnvironment,
  useEnvironments,
  useUpdateEnvironment,
} from '../api/environments';
import { EnvironmentForm } from '../components/EnvironmentForm';
import { TestConnectionButton } from '../components/TestConnectionButton';
import { Button } from '../components/ui/Button';

export function EnvironmentsPage() {
  const { data: environments, isLoading } = useEnvironments();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const create = useCreateEnvironment();

  const handleCreate = (input: EnvironmentInput) => {
    create.mutate(input, { onSuccess: () => setAdding(false) });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Environments</h1>
          <p className="mt-1 text-black/60">
            One entry per customer org — credentials stay encrypted in your vault.
          </p>
        </div>
        {!adding && (
          <Button type="button" onClick={() => setAdding(true)}>
            Add environment
          </Button>
        )}
      </div>

      {adding && (
        <div className="mt-8">
          <EnvironmentForm
            onSubmit={handleCreate}
            onCancel={() => setAdding(false)}
            submitting={create.isPending}
          />
        </div>
      )}

      <div className="mt-8 space-y-4">
        {isLoading && <p className="text-black/50">Loading…</p>}
        {environments?.length === 0 && !adding && (
          <div className="border border-dashed border-black/25 px-6 py-10 text-center text-black/60">
            No environments yet. Add the first customer org to get started.
          </div>
        )}
        {environments?.map((env) =>
          editingId === env.id ? (
            <EditForm key={env.id} env={env} onDone={() => setEditingId(null)} />
          ) : (
            <EnvironmentRow key={env.id} env={env} onEdit={() => setEditingId(env.id)} />
          ),
        )}
      </div>
    </div>
  );
}

function EditForm({ env, onDone }: { env: MaskedEnvironment; onDone: () => void }) {
  const update = useUpdateEnvironment(env.id);
  return (
    <EnvironmentForm
      existing={env}
      submitting={update.isPending}
      onCancel={onDone}
      onSubmit={(input) => update.mutate(input, { onSuccess: onDone })}
    />
  );
}

function EnvironmentRow({ env, onEdit }: { env: MaskedEnvironment; onEdit: () => void }) {
  return (
    <div className="border border-black/15 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-lg font-medium">{env.label}</span>
        <span className="bg-wine px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-white">
          {env.pod.toUpperCase()}
        </span>
        <span className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" className="px-2 py-1 text-sm" onClick={onEdit}>
            Edit
          </Button>
          <DeleteButton id={env.id} />
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm sm:grid-cols-4">
        <MetaItem term="Org ID" value={String(env.orgId)} />
        <MetaItem term="Account ID" value={String(env.accountId)} />
        <MetaItem term="Client ID" value={env.clientId} />
        <MetaItem term="Secret" value={env.clientSecretMasked} />
      </dl>
      <div className="mt-4">
        <TestConnectionButton environmentId={env.id} />
      </div>
    </div>
  );
}

function MetaItem({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">{term}</dt>
      <dd className="truncate font-mono text-[13px]">{value}</dd>
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const del = useDeleteEnvironment();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="px-2 py-1 text-sm"
        onClick={() => setConfirming(true)}
      >
        Delete
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="danger"
      className="px-2 py-1 text-sm"
      disabled={del.isPending}
      onClick={() => del.mutate(id)}
    >
      Confirm delete
    </Button>
  );
}
