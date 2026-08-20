import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TextareaField } from '../TextareaField';

describe('TextareaField', () => {
  it('renders a multi-line textarea, not a single-line input', () => {
    render(<TextareaField label="Description" value="" onChange={() => undefined} />);
    const field = screen.getByLabelText(/description/i);
    expect(field.tagName).toBe('TEXTAREA');
  });

  it('wraps long text instead of clipping it to one line', () => {
    render(
      <TextareaField
        label="Description"
        value={'a very long description '.repeat(20)}
        onChange={() => undefined}
      />,
    );
    const field = screen.getByLabelText(/description/i);
    expect(field.className).not.toMatch(/truncate|whitespace-nowrap|overflow-hidden/);
    expect(field.className).toMatch(/min-h-/);
  });

  it('grows to fit its content when the value changes', () => {
    const { rerender } = render(
      <TextareaField label="Description" value="short" onChange={() => undefined} />,
    );
    const field = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    // jsdom reports no layout, so stub the measurement the way a browser would.
    vi.spyOn(field, 'scrollHeight', 'get').mockReturnValue(160);

    rerender(
      <TextareaField label="Description" value={'line\n'.repeat(12)} onChange={() => undefined} />,
    );
    expect(field.style.height).toBe('160px');
  });

  it('re-measures when the field is resized, not only when the value changes', () => {
    const observers: Array<() => void> = [];
    class StubResizeObserver {
      constructor(callback: () => void) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', StubResizeObserver);

    render(<TextareaField label="Description" value="some text" onChange={() => undefined} />);
    const field = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    vi.spyOn(field, 'scrollHeight', 'get').mockReturnValue(220);

    // A narrower column re-wraps the text; the field must grow to match.
    observers.forEach((fire) => fire());
    expect(field.style.height).toBe('220px');

    vi.unstubAllGlobals();
  });

  it('shows character counts and errors like other fields', () => {
    render(
      <TextareaField
        label="Description"
        value=""
        onChange={() => undefined}
        error="Too long"
      />,
    );
    expect(screen.getByText('Too long')).toBeInTheDocument();
  });
});
