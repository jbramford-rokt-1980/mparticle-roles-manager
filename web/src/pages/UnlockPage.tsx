import type { FormEvent } from 'react';
import { useState } from 'react';

import { isApiClientError } from '../api/client';
import { useInitVault, useUnlockVault, useVaultStatus } from '../api/vault';
import { Button } from '../components/ui/Button';
import { ConnectorMark } from '../components/ui/ConnectorMark';
import { Field } from '../components/ui/Field';

export function UnlockPage() {
  const { data } = useVaultStatus();
  if (!data || data.status === 'unlocked') return null;
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">
        <ConnectorMark className="mb-8 h-4 w-28" />
        {data.status === 'uninitialized' ? <CreateVaultForm /> : <UnlockForm />}
        <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.18em] text-black/40">
          Credentials are stored encrypted on this machine only
        </p>
      </div>
    </div>
  );
}

function CreateVaultForm() {
  const init = useInitVault();
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passphrase !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    init.mutate(passphrase);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-3xl font-medium">Create your vault</h1>
      <p className="mt-3 text-black/70">
        Pick a passphrase to encrypt customer API credentials on this machine. There is no
        recovery — if you forget it, you re-enter the credentials.
      </p>
      <Field
        label="Passphrase"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        className="mt-8"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        hint="At least 8 characters"
      />
      <Field
        label="Confirm passphrase"
        type="password"
        autoComplete="new-password"
        required
        className="mt-5"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={mismatch ? 'Passphrases do not match' : undefined}
      />
      {init.isError && <ErrorNote error={init.error} />}
      <Button type="submit" className="mt-8 w-full" disabled={init.isPending}>
        {init.isPending ? 'Creating…' : 'Create vault'}
      </Button>
    </form>
  );
}

function UnlockForm() {
  const unlock = useUnlockVault();
  const [passphrase, setPassphrase] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    unlock.mutate(passphrase);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <h1 className="text-3xl font-medium">Unlock</h1>
      <p className="mt-3 text-black/70">
        Enter your vault passphrase to load saved customer environments.
      </p>
      <Field
        label="Passphrase"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        className="mt-8"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
      />
      {unlock.isError && <ErrorNote error={unlock.error} />}
      <Button type="submit" className="mt-8 w-full" disabled={unlock.isPending}>
        {unlock.isPending ? 'Unlocking…' : 'Unlock'}
      </Button>
    </form>
  );
}

function ErrorNote({ error }: { error: unknown }) {
  const message = isApiClientError(error)
    ? error.message
    : 'Something went wrong — is the local server running?';
  return (
    <p role="alert" className="mt-5 border border-beetroot/40 bg-beetroot-tint px-4 py-3 text-sm">
      {message}
    </p>
  );
}
