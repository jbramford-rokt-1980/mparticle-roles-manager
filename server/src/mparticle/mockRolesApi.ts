import type { EnvironmentConfig, Manifest, Role, TaskDef } from '@roles/shared';

/**
 * In-memory fake of the Custom Roles API for MOCK_MPARTICLE=1.
 * Lets anyone exercise the full UI with zero credentials.
 * Task list mirrors the documented catalog (fixture only — the real app
 * always fetches /tasks live).
 */
const FIXTURE_TASKS: TaskDef[] = [
  { task_id: 'user:core', display_name: 'Core Access', description: 'Log in and view the dashboard (always included)' },
  { task_id: 'audiences:view', display_name: 'Audiences — View', description: 'View audiences' },
  { task_id: 'audiences:*', display_name: 'Audiences — Full Access', description: 'Create, edit, and delete audiences' },
  { task_id: 'composable_audiences:view', display_name: 'Composable Audiences — View', description: 'View composable audiences' },
  { task_id: 'composable_audiences:edit', display_name: 'Composable Audiences — Edit', description: 'Edit composable audiences' },
  { task_id: 'calculated_attributes:view', display_name: 'Calculated Attributes — View', description: 'View calculated attributes' },
  { task_id: 'calculated_attributes:draft', display_name: 'Calculated Attributes — Draft', description: 'Draft calculated attributes' },
  { task_id: 'calculated_attributes:*', display_name: 'Calculated Attributes — Full Access', description: 'Manage calculated attributes' },
  { task_id: 'connections:view', display_name: 'Connections — View', description: 'View connections' },
  { task_id: 'connections:connect_integration', display_name: 'Connections — Connect Integration', description: 'Connect new integrations' },
  { task_id: 'connections:connect_audiences', display_name: 'Connections — Connect Audiences', description: 'Connect audiences to outputs' },
  { task_id: 'connections:configure_inputs', display_name: 'Connections — Configure Inputs', description: 'Configure input platforms' },
  { task_id: 'connections:configure_outputs', display_name: 'Connections — Configure Outputs', description: 'Configure output platforms' },
  { task_id: 'connections:configure_warehouse_sync', display_name: 'Connections — Warehouse Sync', description: 'Configure warehouse sync pipelines' },
  { task_id: 'connections:*', display_name: 'Connections — Full Access', description: 'Full connections management' },
  { task_id: 'data_filter:view', display_name: 'Data Filter — View', description: 'View the data filter' },
  { task_id: 'data_filter:*', display_name: 'Data Filter — Full Access', description: 'Manage the data filter' },
  { task_id: 'data_plans:view', display_name: 'Data Plans — View', description: 'View data plans' },
  { task_id: 'data_plans:*', display_name: 'Data Plans — Full Access', description: 'Manage data plans' },
  { task_id: 'rules:view', display_name: 'Rules — View', description: 'View rules' },
  { task_id: 'rules:*', display_name: 'Rules — Full Access', description: 'Manage rules' },
  { task_id: 'live_stream:view', display_name: 'Live Stream — View', description: 'View the live stream' },
  { task_id: 'user_activity:view', display_name: 'User Activity — View', description: 'View user activity' },
  { task_id: 'catalog:*', display_name: 'Data Master Catalog — Full Access', description: 'Manage the catalog' },
  { task_id: 'user_management:view', display_name: 'User Management — View', description: 'View platform users' },
  { task_id: 'user_management:*', display_name: 'User Management — Full Access', description: 'Manage platform users and role assignment' },
  { task_id: 'user_groups:view', display_name: 'User Groups — View', description: 'View user groups' },
  { task_id: 'user_groups:*', display_name: 'User Groups — Full Access', description: 'Manage user groups' },
  { task_id: 'identity_settings:*', display_name: 'Identity Settings — Full Access', description: 'Manage IDSync settings' },
  { task_id: 'api_credentials:*', display_name: 'API Credentials — Full Access', description: 'Manage API credentials' },
  { task_id: 'privacy:settings', display_name: 'Privacy — View Settings', description: 'View privacy/DSR settings' },
  { task_id: 'privacy:*', display_name: 'Privacy — Full Access', description: 'Manage privacy/DSR settings' },
  { task_id: 'workspaces:*', display_name: 'Workspaces — Full Access', description: 'Manage workspaces' },
  { task_id: 'billing_report:view', display_name: 'Billing Report — View', description: 'View the billing report' },
  { task_id: 'tieredevents:*', display_name: 'Tiered Events — Full Access', description: 'Manage tiered events' },
];

const SEED_ROLES: Role[] = [
  {
    role_id: 'ad-sales-analyst',
    name: 'Ad Sales Analyst',
    description: 'Read-only view of audiences and user activity',
    tasks: [{ task_id: 'user:core' }, { task_id: 'audiences:view' }, { task_id: 'user_activity:view' }],
  },
  {
    role_id: 'ad-sales-manager',
    name: 'Ad Sales Manager',
    description: 'Full audience management plus connection configuration',
    tasks: [
      { task_id: 'user:core' },
      { task_id: 'audiences:*' },
      { task_id: 'connections:connect_audiences' },
      { task_id: 'user_activity:view' },
    ],
  },
  {
    role_id: 'agency-partner',
    name: 'Agency Partner',
    description: 'External partner access limited to audiences',
    tasks: [{ task_id: 'user:core' }, { task_id: 'audiences:view' }],
  },
  {
    role_id: 'marketing-manager',
    name: 'Marketing Manager',
    description: 'Audiences, calculated attributes, and data plans',
    tasks: [
      { task_id: 'user:core' },
      { task_id: 'audiences:*' },
      { task_id: 'calculated_attributes:view' },
      { task_id: 'data_plans:view' },
    ],
  },
];

export class MockRolesApi {
  private readonly manifests = new Map<string, Manifest>();

  private manifestFor(env: EnvironmentConfig): Manifest {
    const key = `${env.orgId}:${env.accountId}`;
    let manifest = this.manifests.get(key);
    if (!manifest) {
      manifest = {
        roles: structuredClone(SEED_ROLES),
        last_modified_on: '2026-08-01T09:30:00Z',
        last_modified_by: 'seed@mock.local',
        version: 12,
      };
      this.manifests.set(key, manifest);
    }
    return manifest;
  }

  getTasks(_env: EnvironmentConfig): Promise<TaskDef[]> {
    return Promise.resolve(structuredClone(FIXTURE_TASKS));
  }

  getManifest(env: EnvironmentConfig): Promise<Manifest> {
    return Promise.resolve(structuredClone(this.manifestFor(env)));
  }

  putManifest(env: EnvironmentConfig, roles: Role[], _version: Manifest['version']): Promise<Manifest> {
    const key = `${env.orgId}:${env.accountId}`;
    const previous = this.manifestFor(env);
    const next: Manifest = {
      roles: structuredClone(roles),
      last_modified_on: new Date().toISOString(),
      last_modified_by: 'you@mock.local',
      version: typeof previous.version === 'number' ? previous.version + 1 : previous.version,
    };
    this.manifests.set(key, next);
    return Promise.resolve(structuredClone(next));
  }
}
