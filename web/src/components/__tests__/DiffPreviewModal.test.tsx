import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { diffManifests, type Role } from '@roles/shared';

import { DiffPreviewModal } from '../DiffPreviewModal';

function role(id: string, name: string, tasks: string[]): Role {
  return { role_id: id, name, description: '', tasks: tasks.map((t) => ({ task_id: t })) };
}

describe('DiffPreviewModal', () => {
  it('shows created, modified, and unchanged sections with a summary', async () => {
    const diff = diffManifests(
      [role('keep', 'Keep', ['audiences:view']), role('edit', 'Edit', ['audiences:view'])],
      [
        role('keep', 'Keep', ['audiences:view']),
        role('edit', 'Edit', ['audiences:*']),
        role('new', 'Brand New', ['rules:view']),
      ],
    );
    render(
      <DiffPreviewModal diff={diff} committing={false} onConfirm={() => undefined} onCancel={() => undefined} />,
    );
    expect(screen.getByText(/1 created/i)).toBeInTheDocument();
    expect(screen.getByText(/1 modified/i)).toBeInTheDocument();
    expect(screen.getByText(/1 unchanged/i)).toBeInTheDocument();
    expect(screen.getByText('Brand New')).toBeInTheDocument();
    expect(screen.getByText('audiences:*')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeEnabled();
  });

  it('gates confirmation behind an acknowledgement when roles are deleted', async () => {
    const diff = diffManifests([role('gone', 'Doomed Role', ['audiences:view'])], []);
    const onConfirm = vi.fn();
    render(
      <DiffPreviewModal diff={diff} committing={false} onConfirm={onConfirm} onCancel={() => undefined} />,
    );
    const user = userEvent.setup();

    expect(screen.getByText('Doomed Role')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: /confirm/i });
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: /understand/i }));
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('cancel never commits', async () => {
    const diff = diffManifests([], [role('new', 'New', [])]);
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <DiffPreviewModal diff={diff} committing={false} onConfirm={onConfirm} onCancel={onCancel} />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
