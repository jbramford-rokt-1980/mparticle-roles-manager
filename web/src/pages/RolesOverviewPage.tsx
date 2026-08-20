import { Link } from 'react-router-dom';

import { MAX_ROLES_PER_ORG, type Manifest } from '@roles/shared';

import { useManifest } from '../api/roles';
import { EnvSwitcher } from '../components/EnvSwitcher';
import { useSelectedEnv } from '../state/SelectedEnvContext';

export function RolesOverviewPage() {
  const { selected, environments, isLoading: envsLoading } = useSelectedEnv();
  const { data: manifest, isLoading } = useManifest(selected?.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Roles</h1>
          <p className="mt-1 text-black/60">
            Every custom role in the org — click one to inspect or edit it.
          </p>
        </div>
        <EnvSwitcher />
      </div>

      {!envsLoading && environments.length === 0 && (
        <div className="mt-10 border border-dashed border-black/25 px-6 py-10 text-center text-black/60">
          Add an environment first — roles are always read live from a customer org.
        </div>
      )}

      {selected && (
        <>
          {manifest && <ManifestMeta manifest={manifest} />}
          {isLoading && <p className="mt-8 text-black/50">Loading roles…</p>}
          {manifest && <RolesTable manifest={manifest} />}
        </>
      )}
    </div>
  );
}

function ManifestMeta({ manifest }: { manifest: Manifest }) {
  const count = manifest.roles.length;
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-black/10 py-3">
      <span className="text-sm">
        <span className="font-medium">{count} of {MAX_ROLES_PER_ORG} roles</span>
        <span
          className="ml-3 inline-block h-1.5 w-32 bg-black/10 align-middle"
          role="presentation"
        >
          <span
            className="block h-full bg-beetroot"
            style={{ width: `${Math.min(100, (count / MAX_ROLES_PER_ORG) * 100)}%` }}
          />
        </span>
      </span>
      {manifest.version !== undefined && (
        <span className="font-mono text-xs text-black/50">version {manifest.version}</span>
      )}
      {manifest.last_modified_on && (
        <span className="text-sm text-black/60">
          Last modified {new Date(manifest.last_modified_on).toLocaleString()}
          {manifest.last_modified_by ? ` by ${manifest.last_modified_by}` : ''}
        </span>
      )}
    </div>
  );
}

function RolesTable({ manifest }: { manifest: Manifest }) {
  if (manifest.roles.length === 0) {
    return (
      <div className="mt-8 border border-dashed border-black/25 px-6 py-10 text-center text-black/60">
        No custom roles in this org yet.{' '}
        <Link to="/roles/editor" className="text-beetroot underline underline-offset-4">
          Create the first one
        </Link>
        .
      </div>
    );
  }

  return (
    <table className="mt-6 w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-black">
          <Th>Name</Th>
          <Th>Role ID</Th>
          <Th>Description</Th>
          <Th className="text-right">Permissions</Th>
        </tr>
      </thead>
      <tbody>
        {[...manifest.roles]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((role) => (
            <tr key={role.role_id} className="border-b border-black/10 hover:bg-wine-tint/40">
              <td className="py-3 pr-4">
                <Link
                  to={`/roles/editor?role=${encodeURIComponent(role.role_id)}`}
                  className="font-medium hover:text-beetroot"
                >
                  {role.name}
                </Link>
              </td>
              <td className="py-3 pr-4 font-mono text-[13px] text-black/70">{role.role_id}</td>
              <td className="max-w-md truncate py-3 pr-4 text-black/70">{role.description}</td>
              <td className="py-3 text-right font-mono text-[13px]">{role.tasks.length}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.18em] text-black/50 ${className}`}
    >
      {children}
    </th>
  );
}
