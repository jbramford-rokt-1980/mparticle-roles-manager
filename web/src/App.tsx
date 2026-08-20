import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { useLockVault, useVaultStatus } from './api/vault';
import { ConnectorMark } from './components/ui/ConnectorMark';
import { UnlockPage } from './pages/UnlockPage';

export function App() {
  const { data, isLoading, isError, refetch } = useVaultStatus();

  if (isLoading) return null;
  if (isError) return <ServerDownNotice onRetry={() => void refetch()} />;
  if (!data || data.status !== 'unlocked') return <UnlockPage />;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Routes>
          <Route path="/" element={<Navigate to="/roles" replace />} />
          <Route path="/roles" element={<Placeholder title="Roles" />} />
          <Route path="/environments" element={<Placeholder title="Environments" />} />
          <Route path="/history" element={<Placeholder title="History" />} />
        </Routes>
      </main>
    </div>
  );
}

function AppHeader() {
  const lock = useLockVault();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-1 py-1 text-sm transition-colors ${
      isActive ? 'text-white' : 'text-white/60 hover:text-white'
    }`;

  return (
    <header className="bg-wine text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-8 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="font-medium">mParticle by Rokt</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/60">
            Custom Roles
          </span>
        </div>
        <nav className="flex items-center gap-5">
          <NavLink to="/roles" className={navClass}>
            Roles
          </NavLink>
          <NavLink to="/environments" className={navClass}>
            Environments
          </NavLink>
          <NavLink to="/history" className={navClass}>
            History
          </NavLink>
        </nav>
        <button
          onClick={() => lock.mutate()}
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.18em] text-white/60 transition-colors hover:text-white"
        >
          Lock vault
        </button>
      </div>
      <ConnectorMark className="block h-2 w-full opacity-90" />
    </header>
  );
}

function ServerDownNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">
        <ConnectorMark className="mb-8 h-4 w-28" />
        <h1 className="text-3xl font-medium">Local server unreachable</h1>
        <p className="mt-3 text-black/70">
          The app couldn&apos;t reach its local server. Make sure it&apos;s running with{' '}
          <code className="font-mono text-sm">npm run dev</code>, then retry.
        </p>
        <button
          onClick={onRetry}
          className="mt-8 border border-black px-5 py-2.5 font-medium transition-colors hover:bg-black hover:text-white"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-medium">{title}</h1>
      <p className="mt-2 text-black/60">Coming in a later milestone.</p>
    </div>
  );
}
