import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Role } from '@roles/shared';

import { NEW_ROLE_VALUE, RoleSelect } from '../RoleSelect';

const roles: Role[] = [
  { role_id: 'a', name: 'Ad Sales Analyst', description: '', tasks: [] },
  { role_id: 'b', name: 'Marketing Manager', description: '', tasks: [] },
];

describe('RoleSelect', () => {
  it('styles New role as a primary button whether or not a role is selected', () => {
    const { rerender } = render(
      <RoleSelect roles={roles} value="a" onChange={() => undefined} />,
    );
    const idle = screen.getByRole('button', { name: /new role/i });
    expect(idle.className).toContain('bg-beetroot');

    rerender(<RoleSelect roles={roles} value={NEW_ROLE_VALUE} onChange={() => undefined} />);
    const creating = screen.getByRole('button', { name: /new role/i });
    expect(creating.className).toContain('bg-beetroot');
  });

  it('matches the button height to the role dropdown height', () => {
    render(<RoleSelect roles={roles} value="a" onChange={() => undefined} />);
    const button = screen.getByRole('button', { name: /new role/i });
    const select = screen.getByLabelText(/^role$/i);
    const heightClass = /\bh-\d+\b/;

    const buttonHeight = button.className.match(heightClass)?.[0];
    const selectHeight = select.className.match(heightClass)?.[0];
    expect(buttonHeight).toBeDefined();
    expect(selectHeight).toBe(buttonHeight);
  });
});
