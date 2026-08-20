import type { EnvironmentConfig, Manifest, Role, TaskDef } from '@roles/shared';

/** What the routes need from a roles API — satisfied by RolesApi and MockRolesApi. */
export interface RolesApiLike {
  getTasks(env: EnvironmentConfig): Promise<TaskDef[]>;
  getManifest(env: EnvironmentConfig): Promise<Manifest>;
  putManifest(env: EnvironmentConfig, roles: Role[], version: Manifest['version']): Promise<Manifest>;
}

/** Minimal surface RolesApi needs from the HTTP client (eases testing). */
export interface RequestClient {
  request<T>(env: EnvironmentConfig, method: 'GET' | 'PUT', path: string, body?: unknown): Promise<T>;
}

/** The Custom Roles API has exactly three endpoints; this is all of them. */
export class RolesApi {
  constructor(private readonly client: RequestClient) {}

  getTasks(env: EnvironmentConfig): Promise<TaskDef[]> {
    return this.client.request<TaskDef[]>(env, 'GET', '/tasks');
  }

  getManifest(env: EnvironmentConfig): Promise<Manifest> {
    return this.client.request<Manifest>(env, 'GET', '/roles');
  }

  /**
   * Full-replace PUT: the roles array must contain every role that should
   * survive. `version` is echoed back when the GET included one (optimistic
   * concurrency); omitted otherwise since it isn't documented for all orgs.
   */
  putManifest(
    env: EnvironmentConfig,
    roles: Role[],
    version: Manifest['version'],
  ): Promise<Manifest> {
    const body: { roles: Role[]; version?: Manifest['version'] } = { roles };
    if (version !== undefined) body.version = version;
    return this.client.request<Manifest>(env, 'PUT', '/roles', body);
  }
}
