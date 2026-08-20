import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { useLockVault, useVaultStatus } from './api/vault';
import { Button } from './components/ui/Button';
import { MParticleLogo } from './components/ui/MParticleLogo';
import { EnvironmentsPage } from './pages/EnvironmentsPage';
import { HistoryPage } from './pages/HistoryPage';
import { RoleEditorPage } from './pages/RoleEditorPage';
import { RolesOverviewPage } from './pages/RolesOverviewPage';
import { UnlockPage } from './pages/UnlockPage';
import { SelectedEnvProvider } from './state/SelectedEnvContext';

export function App() {
  const { data, isLoading, isError, refetch } = useVaultStatus();

  if (isLoading) return null;
  if (isError) return <ServerDownNotice onRetry={() => void refetch()} />;
  if (!data || data.status !== 'unlocked') return <UnlockPage />;

  return (
    <SelectedEnvProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
          <Routes>
            <Route path="/" element={<Navigate to="/roles" replace />} />
            <Route path="/roles" element={<RolesOverviewPage />} />
            <Route path="/roles/editor" element={<RoleEditorPage />} />
            <Route path="/environments" element={<EnvironmentsPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </SelectedEnvProvider>
  );
}

function AppHeader() {
  const lock = useLockVault();
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `border-b-2 pb-1 text-sm transition-colors ${
      isActive
        ? 'border-beetroot text-white'
        : 'border-transparent text-white/60 hover:text-white'
    }`;

  return (
    <header className="bg-wine text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-10 gap-y-4 px-6 py-5">
        <div className="flex items-center gap-3">
          <MParticleLogo className="h-6 w-auto text-white" />
          <span className="border-l border-white/25 pl-3 font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
            Custom Roles
          </span>
        </div>
        <nav className="flex items-center gap-6">
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
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-white/45 sm:inline">
            Vault unlocked
          </span>
          <Button
            size="sm"
            variant="inverse"
            title="Wipe the decrypted credentials from memory and return to the passphrase screen. Nothing on disk is deleted."
            onClick={() => lock.mutate()}
          >
            Lock vault
          </Button>
        </div>
      </div>
      <div className="h-px w-full bg-beetroot" />
    </header>
  );
}

function ServerDownNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">
        <MParticleLogo className="mb-10 h-7 w-auto text-black" />
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-beetroot">
          Not connected
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight">Local server unreachable</h1>
        <p className="mt-3 text-black/70">
          The app couldn&apos;t reach its local server. Make sure it&apos;s running with{' '}
          <code className="font-mono text-sm">npm run dev</code>, then retry.
        </p>
        <Button className="mt-8" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}
