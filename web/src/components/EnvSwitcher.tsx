import { Link } from 'react-router-dom';

import { useSelectedEnv } from '../state/SelectedEnvContext';
import { Select } from './ui/Select';

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
    <Select
      label="Environment"
      inlineLabel
      size="sm"
      value={selected?.id ?? ''}
      onChange={setSelectedId}
      className="min-w-64"
      options={environments.map((env) => ({
        value: env.id,
        label: env.label,
        detail: `${env.pod.toUpperCase()} · org ${env.orgId}`,
      }))}
    />
  );
}
