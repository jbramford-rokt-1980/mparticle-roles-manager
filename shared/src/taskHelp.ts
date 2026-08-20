/**
 * Curated help for permission tasks, sourced from
 * docs.mparticle.com/developers/apis/custom-roles/ (verified 2026-08-20).
 * The live /tasks endpoint returns null display_name/description, so this
 * catalog is what makes the permission grid readable. API-provided text,
 * when it exists, always wins over these entries.
 */

/** Product names for feature prefixes (task_id = `feature:action`). */
export const FEATURE_NAMES: Record<string, string> = {
  user: 'User',
  user_activity: 'User Activity',
  user_groups: 'Household Reach',
  user_management: 'User Management',
  catalog: 'Data Master Catalog',
  data_plans: 'Data Plans',
  live_stream: 'Live Stream',
  calculated_attributes: 'Calculated Attributes',
  rules: 'Rules',
  composable_audiences: 'Composable Audiences',
  audiences: 'Real-time Audiences',
  audience: 'Audience',
  audience_resource_restrictions: 'Audience Resource Restrictions',
  connections: 'Connections',
  data_filter: 'Filters',
  privacy: 'Privacy',
  workspaces: 'Workspaces',
  identity_settings: 'Identity Settings',
  api_credentials: 'API Credentials',
  billing_report: 'Usage & Billing',
  tieredevents: 'Tiered Events',
  journeys: 'Journeys',
  observability: 'Observability',
  dataingest_connections: 'Data Ingest Connections',
  dataingest_datamodels: 'Data Ingest Data Models',
};

export const TASK_DESCRIPTIONS: Record<string, string> = {
  'user:core': 'Log in and view the dashboard. Included in every role automatically.',
  'user_activity:view':
    'Search for any user and view their details, workspace usage, device info, attributes, and audience membership.',
  'user_groups:view': 'View the Household Reach page.',
  'user_groups:*': 'View, edit, and delete households.',
  'catalog:*': 'View the Data Master Catalog and annotate data points.',
  'data_plans:view': 'View existing data plans.',
  'data_plans:*': 'View, create, edit, activate, and delete data plans.',
  'live_stream:view': 'View Live Stream and examine individual events.',
  'calculated_attributes:view': 'View calculated attributes.',
  'calculated_attributes:draft': 'View, create, and delete calculated attributes in Draft mode.',
  'calculated_attributes:*': 'View, create, and delete calculated attributes.',
  'rules:view': 'View all rules.',
  'rules:*': 'View, create, edit, and delete rules.',
  'composable_audiences:view': 'View all composable audiences and insights.',
  'composable_audiences:edit': 'View, create, modify, and activate composable audiences.',
  'composable_audiences:*': 'View, create, modify, activate, and delete composable audiences.',
  'audiences:view': 'View all audiences, audience estimates, and audience insights.',
  'audiences:edit': 'View, create, modify, activate, and delete audiences.',
  'audiences:*': 'View, create, modify, activate, download, and delete audiences.',
  'audiences:draft': 'Create and work on audiences in Draft mode without activating them.',
  'audience:manage': 'Manage audiences. Confirm the exact scope in the mParticle UI before relying on it.',
  'audience_resource_restrictions:*': 'Manage restrictions on which audience resources a user can reach.',
  'connections:view': 'View connections.',
  'connections:connect_integration':
    'Create a connection between an input and an output, with setup details and credentials visible.',
  'connections:connect_audiences':
    'Create a connection between an audience and an output, with setup details and credentials hidden.',
  'connections:configure_inputs': 'Configure an input.',
  'connections:configure_warehouse_sync': 'Configure Warehouse Sync inputs.',
  'connections:configure_outputs': 'Configure an output.',
  'connections:*': 'Create, delete, and activate or deactivate connections between inputs and outputs.',
  'data_filter:view': 'View current data filters.',
  'data_filter:*': 'View and create filters.',
  'privacy:settings': 'View enabled privacy settings.',
  'privacy:*': 'View and modify privacy settings, including data subject requests.',
  'workspaces:*': 'View, create, and delete workspaces.',
  'user_management:view': 'View users with access to the account.',
  'user_management:*': 'View, create, delete, and assign roles to users in the account.',
  'identity_settings:*': 'View and modify identity (IDSync) settings.',
  'api_credentials:*': 'View, create, delete, and assign API credentials.',
  'billing_report:view': 'Access the Usage and Billing page and download invoices.',
  'tieredevents:*': 'Manage Tiered Events configuration.',
  'journeys:view': 'View journeys.',
  'journeys:*': 'View, create, edit, and delete journeys.',
  'observability:view': 'View Observability dashboards and pipeline health.',
  'dataingest_connections:view': 'View data ingest (Warehouse Sync) connections.',
  'dataingest_connections:*': 'Create, edit, and delete data ingest (Warehouse Sync) connections.',
  'dataingest_datamodels:view': 'View data ingest (Warehouse Sync) data models.',
  'dataingest_datamodels:*': 'Create, edit, and delete data ingest (Warehouse Sync) data models.',
};

/**
 * Task ids the live API returns that mParticle's public Custom Roles docs
 * don't describe (44 live vs ~35 documented, verified 2026-08-20). Their
 * descriptions here are inferred from the product area, so the UI marks
 * them and users can confirm scope in the mParticle UI before relying on it.
 */
export const UNDOCUMENTED_TASKS: ReadonlySet<string> = new Set([
  'audiences:draft',
  'audiences:edit',
  'audience:manage',
  'audience_resource_restrictions:*',
  'journeys:view',
  'journeys:*',
  'observability:view',
  'dataingest_connections:view',
  'dataingest_connections:*',
  'dataingest_datamodels:view',
  'dataingest_datamodels:*',
]);

/**
 * Sections mirroring how the mParticle platform is actually organized —
 * data flows in, gets connected, powers features, and is administered.
 * Drives the top-level grouping of the permission grid.
 */
export const PERMISSION_SECTIONS: ReadonlyArray<{ label: string; features: string[] }> = [
  {
    label: 'Data Ingestion',
    features: ['dataingest_connections', 'dataingest_datamodels'],
  },
  {
    label: 'Connections & Integrations',
    features: ['connections', 'data_filter'],
  },
  {
    label: 'Data Platform & Quality',
    features: ['data_plans', 'rules', 'catalog', 'live_stream', 'tieredevents'],
  },
  {
    label: 'Identity & Customer 360',
    features: ['user_activity', 'calculated_attributes', 'user_groups'],
  },
  {
    label: 'Audiences & Activation',
    features: [
      'audiences',
      'composable_audiences',
      'journeys',
      'audience',
      'audience_resource_restrictions',
    ],
  },
  {
    label: 'Oversight & Privacy',
    features: ['privacy', 'observability'],
  },
  {
    label: 'Platform Administration',
    features: [
      'workspaces',
      'user_management',
      'api_credentials',
      'identity_settings',
      'billing_report',
    ],
  },
];

/**
 * Default view-only capabilities bundled into every custom role with no task
 * ids of their own (from the docs): system alerts dashboard, Event Forwarding
 * report, Data Master Catalog view/annotate, Integrations Directory, and
 * workspace access.
 */
export const IMPLICIT_ROLE_CAPABILITIES =
  'Every role also includes: system alerts, the Event Forwarding report, Data Master Catalog viewing, the Integrations Directory, and workspace access.';
