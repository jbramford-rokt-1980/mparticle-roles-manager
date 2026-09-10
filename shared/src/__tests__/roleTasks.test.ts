import { describe, expect, it } from 'vitest';

import { grantedPermissionCount, grantedTaskIds } from '../roleTasks';
import type { Role } from '../types';

const adSalesAnalyst: Role = {
  role_id: 'ad-sales-analyst',
  name: 'Ad Sales Analyst',
  description: 'Read-only audiences',
  tasks: [{ task_id: 'user:core' }, { task_id: 'audiences:view' }],
};

const marketingManager: Role = {
  role_id: 'marketing-manager',
  name: 'Marketing Manager',
  description: 'Full audiences and data plans',
  tasks: [{ task_id: 'user:core' }, { task_id: 'audiences:*' }, { task_id: 'data_plans:view' }],
};

describe('role tasks', () => {
  it('returns granted task ids without mandatory core access', () => {
    expect(grantedTaskIds(adSalesAnalyst)).toEqual(['audiences:view']);
    expect(grantedTaskIds(marketingManager)).toEqual(['audiences:*', 'data_plans:view']);
  });

  it('counts permissions beyond mandatory core access', () => {
    expect(grantedPermissionCount(adSalesAnalyst)).toBe(1);
    expect(grantedPermissionCount(marketingManager)).toBe(2);
  });
});
