import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CONTROL_HEIGHT } from '../controlStyles';
import { Button } from '../Button';
import { Field } from '../Field';

describe('control sizing', () => {
  it('gives default buttons and field inputs the same explicit height', () => {
    render(
      <>
        <Button>Do the thing</Button>
        <Field label="Name" readOnly value="" onChange={() => undefined} />
      </>,
    );
    const button = screen.getByRole('button', { name: /do the thing/i });
    const input = screen.getByLabelText(/name/i);

    expect(button.className).toContain(CONTROL_HEIGHT.md);
    expect(input.className).toContain(CONTROL_HEIGHT.md);
  });

  it('gives small buttons the small control height', () => {
    render(<Button size="sm">Compact</Button>);
    expect(screen.getByRole('button', { name: /compact/i }).className).toContain(
      CONTROL_HEIGHT.sm,
    );
  });

  it('never sets vertical padding on buttons, which would break height matching', () => {
    render(<Button>Padded?</Button>);
    expect(screen.getByRole('button', { name: /padded\?/i }).className).not.toMatch(/\bpy-/);
  });

  it('offers an inverse variant for dark surfaces that never sets a white background', () => {
    render(<Button variant="inverse">On wine</Button>);
    const button = screen.getByRole('button', { name: /on wine/i });
    const classes = button.className.split(/\s+/);
    expect(classes).toContain('text-white');
    // A base white fill would render invisible white-on-white text.
    expect(classes).not.toContain('bg-white');
  });
});

describe('Field character counter', () => {
  it('shows the count in muted type while within the limit', () => {
    render(
      <Field
        label="Name"
        value="abc"
        onChange={() => undefined}
        count={{ current: 3, max: 64 }}
      />,
    );
    const counter = screen.getByText('3/64');
    expect(counter.className).not.toContain('text-beetroot');
  });

  it('turns the count red once the limit is exceeded', () => {
    render(
      <Field
        label="Name"
        value="abc"
        onChange={() => undefined}
        count={{ current: 70, max: 64 }}
      />,
    );
    const counter = screen.getByText('70/64');
    expect(counter.className).toContain('text-beetroot');
  });
});
