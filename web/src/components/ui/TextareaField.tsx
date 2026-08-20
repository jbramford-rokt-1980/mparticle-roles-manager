import type { TextareaHTMLAttributes } from 'react';
import { useId, useLayoutEffect, useRef } from 'react';

import { FieldFooter, type CharacterCount } from './FieldFooter';

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  count?: CharacterCount;
}

/**
 * Multi-line field that wraps its text and grows with the content, so long
 * role descriptions are readable in full instead of scrolling off one line.
 */
export function TextareaField({
  label,
  hint,
  error,
  count,
  className = '',
  value,
  ...rest
}: TextareaFieldProps) {
  const id = useId();
  const footerId = `${id}-footer`;
  const ref = useRef<HTMLTextAreaElement>(null);
  const over = count ? count.current > count.max : false;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      el.style.height = 'auto';
      if (el.scrollHeight === 0) return;
      // scrollHeight excludes borders, but border-box sizing counts them,
      // so add them back or the last line clips by the border width.
      const borders = Math.max(0, el.offsetHeight - el.clientHeight);
      el.style.height = `${el.scrollHeight + borders}px`;
    };
    fit();

    // Width changes re-wrap the text, so the height has to be recomputed
    // even when the value itself hasn't changed.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.18em] text-black/60"
      >
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        value={value}
        rows={3}
        aria-describedby={hint || error || count ? footerId : undefined}
        aria-invalid={error || over ? true : undefined}
        className={`min-h-24 w-full resize-y border bg-white px-3.5 py-2.5 text-[15px] leading-relaxed outline-none transition-colors placeholder:text-black/30 focus:border-beetroot ${
          error || over ? 'border-beetroot' : 'border-black/25'
        }`}
        {...rest}
      />
      <FieldFooter id={footerId} hint={hint} error={error} count={count} />
    </div>
  );
}
