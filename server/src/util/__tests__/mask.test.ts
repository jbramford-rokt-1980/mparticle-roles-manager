import { describe, expect, it } from 'vitest';

import { maskEnvironment, maskSecret } from '../mask';

describe('maskSecret', () => {
  it('shows only the last four characters', () => {
    expect(maskSecret('abcdefgh1234')).toBe('••••1234');
  });

  it('fully masks very short secrets', () => {
    expect(maskSecret('abc')).toBe('••••');
  });
});

describe('maskEnvironment', () => {
  it('replaces clientSecret with a masked variant', () => {
    const masked = maskEnvironment({
      id: 'e',
      label: 'L',
      pod: 'us1',
      orgId: 1,
      accountId: 2,
      clientId: 'cid',
      clientSecret: 'topsecret9999',
      createdAt: 'a',
      updatedAt: 'b',
    });
    expect(masked.clientSecretMasked).toBe('••••9999');
    expect(JSON.stringify(masked)).not.toContain('topsecret9999');
    expect('clientSecret' in masked).toBe(false);
  });
});
