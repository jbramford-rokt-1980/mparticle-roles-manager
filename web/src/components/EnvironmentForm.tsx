import type { FormEvent } from 'react';
import { useState } from 'react';

import type { EnvironmentInput, MaskedEnvironment, PodId } from '@roles/shared';
import { PODS, POD_IDS } from '@roles/shared';

import { Button } from './ui/Button';
import { Field } from './ui/Field';
import { Select } from './ui/Select';

export interface EnvironmentFormProps {
  /** When set, the form edits this environment; otherwise it creates one. */
  existing?: MaskedEnvironment;
  onSubmit: (input: EnvironmentInput) => void;
  onCancel: () => void;
  submitting: boolean;
}

export function EnvironmentForm({ existing, onSubmit, onCancel, submitting }: EnvironmentFormProps) {
  const [label, setLabel] = useState(existing?.label ?? '');
  const [pod, setPod] = useState<PodId>(existing?.pod ?? 'us1');
  const [orgId, setOrgId] = useState(existing ? String(existing.orgId) : '');
  const [accountId, setAccountId] = useState(existing ? String(existing.accountId) : '');
  const [clientId, setClientId] = useState(existing?.clientId ?? '');
  const [clientSecret, setClientSecret] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const input: EnvironmentInput = {
      label: label.trim(),
      pod,
      orgId: Number.parseInt(orgId, 10),
      accountId: Number.parseInt(accountId, 10),
      clientId: clientId.trim(),
      ...(clientSecret ? { clientSecret } : {}),
    };
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-black/15 bg-wine-tint/40 p-6">
      <h2 className="text-xl font-medium">
        {existing ? `Edit ${existing.label}` : 'New environment'}
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Label"
          required
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Customer name + pod"
        />
        <Select
          label="Pod"
          value={pod}
          onChange={(next) => setPod(next as PodId)}
          hint="Only changes the API host — check which pod the customer's dashboard runs on"
          options={POD_IDS.map((id) => ({
            value: id,
            label: PODS[id].label,
            detail: PODS[id].apiBase.replace('https://', ''),
          }))}
        />
        <Field
          label="Org ID"
          required
          inputMode="numeric"
          pattern="[0-9]*"
          value={orgId}
          onChange={(e) => setOrgId(e.target.value.replace(/\D/g, ''))}
          hint="No API to discover this — read orgId from the mParticle UI page source"
        />
        <Field
          label="Account ID"
          required
          inputMode="numeric"
          pattern="[0-9]*"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value.replace(/\D/g, ''))}
        />
        <Field
          label="Client ID"
          required
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          hint="Platform API credential with Custom Roles access"
        />
        <Field
          label="Client secret"
          type="password"
          autoComplete="off"
          required={!existing}
          value={clientSecret}
          onChange={(e) => setClientSecret(e.target.value)}
          hint={existing ? 'Leave blank to keep the stored secret' : 'Stored encrypted in your vault'}
        />
      </div>
      <div className="mt-7 flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save environment'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
