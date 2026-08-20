import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Select } from '../Select';

const options = [
  { value: 'a', label: 'Ad Sales Analyst' },
  { value: 'b', label: 'Marketing Manager' },
  { value: 'c', label: 'Agency Partner' },
];

describe('Select', () => {
  it('shows the selected label on a closed trigger', () => {
    render(<Select label="Role" value="b" options={options} onChange={() => undefined} />);
    const trigger = screen.getByRole('combobox', { name: /role/i });
    expect(trigger).toHaveTextContent('Marketing Manager');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens a listbox of options and selects one', async () => {
    const onChange = vi.fn();
    render(<Select label="Role" value="a" options={options} onChange={onChange} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('combobox', { name: /role/i }));
    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);

    await user.click(screen.getByRole('option', { name: 'Agency Partner' }));
    expect(onChange).toHaveBeenCalledWith('c');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the current option as selected', async () => {
    render(<Select label="Role" value="b" options={options} onChange={() => undefined} />);
    await userEvent.setup().click(screen.getByRole('combobox', { name: /role/i }));
    expect(screen.getByRole('option', { name: 'Marketing Manager' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('supports keyboard navigation and Escape', async () => {
    const onChange = vi.fn();
    render(<Select label="Role" value="a" options={options} onChange={onChange} />);
    const user = userEvent.setup();
    const trigger = screen.getByRole('combobox', { name: /role/i });

    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('b');

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows a placeholder when nothing is selected', () => {
    render(
      <Select
        label="Role"
        value=""
        placeholder="Select a role…"
        options={options}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole('combobox', { name: /role/i })).toHaveTextContent('Select a role…');
  });
});
