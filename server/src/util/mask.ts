import type { EnvironmentConfig, MaskedEnvironment } from '@roles/shared';

export function maskSecret(secret: string): string {
  if (secret.length <= 4) return '••••';
  return `••••${secret.slice(-4)}`;
}

/** The only environment shape allowed to leave the proxy. */
export function maskEnvironment(env: EnvironmentConfig): MaskedEnvironment {
  return {
    id: env.id,
    label: env.label,
    pod: env.pod,
    orgId: env.orgId,
    accountId: env.accountId,
    clientId: env.clientId,
    clientSecretMasked: maskSecret(env.clientSecret),
    createdAt: env.createdAt,
    updatedAt: env.updatedAt,
  };
}
