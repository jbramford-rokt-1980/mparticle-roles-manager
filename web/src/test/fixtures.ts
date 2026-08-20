import type { Manifest, MaskedEnvironment, TaskDef } from '@roles/shared';

export const fixtureEnv: MaskedEnvironment = {
  id: 'env-1',
  label: 'Demo Org EU1',
  pod: 'eu1',
  orgId: 4000155,
  accountId: 622,
  clientId: 'client-abc',
  clientSecretMasked: '••••4321',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

export const fixtureTasks: TaskDef[] = [
  { task_id: 'user:core', display_name: 'Core Access', description: 'Always included' },
  { task_id: 'audiences:view', display_name: 'Audiences — View', description: 'View audiences' },
  { task_id: 'audiences:*', display_name: 'Audiences — Full Access', description: 'Manage audiences' },
  { task_id: 'data_plans:view', display_name: 'Data Plans — View', description: 'View data plans' },
];

export const fixtureManifest: Manifest = {
  roles: [
    {
      role_id: 'ad-sales-analyst',
      name: 'Ad Sales Analyst',
      description: 'Read-only audiences',
      tasks: [{ task_id: 'user:core' }, { task_id: 'audiences:view' }],
    },
    {
      role_id: 'marketing-manager',
      name: 'Marketing Manager',
      description: 'Full audiences and data plans',
      tasks: [{ task_id: 'user:core' }, { task_id: 'audiences:*' }, { task_id: 'data_plans:view' }],
    },
  ],
  last_modified_on: '2026-08-01T09:30:00Z',
  last_modified_by: 'someone@rokt.com',
  version: 4,
};
