import { Link } from 'react-router-dom';

import { useSelectedEnv } from '../state/SelectedEnvContext';

export function EnvSwitcher() {
  const { environments, selected, setSelectedId } = useSelectedEnv();

  if (environments.length === 0) {
    return (
      <Link to="/environments" className="text-sm text-beetroot underline underline-offset-4">
        Add an environment
      </Link>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/50">
        Environment
      </span>
      <select
        value={selected?.id ?? ''}
        onChange={(e) => setSelectedId(e.target.value)}
        className="border border-black/25 bg-white px-3 py-1.5 text-sm outline-none focus:border-beetroot"
      >
        {environments.map((env) => (
          <option key={env.id} value={env.id}>
            {env.label} ({env.pod.toUpperCase()})
          </option>
        ))}
      </select>
    </label>
  );
}
