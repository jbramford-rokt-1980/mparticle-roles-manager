import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

import { fieldClasses } from './controlStyles';
import { FieldFooter, type CharacterCount } from './FieldFooter';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  count?: CharacterCount;
}

export function Field({ label, hint, error, count, className = '', ...rest }: FieldProps) {
  const id = useId();
  const footerId = `${id}-footer`;
  const over = count ? count.current > count.max : false;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.18em] text-black/60"
      >
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint || error || count ? footerId : undefined}
        aria-invalid={error || over ? true : undefined}
        className={`w-full placeholder:text-black/30 ${fieldClasses()} ${
          error || over ? 'border-beetroot' : ''
        }`}
        {...rest}
      />
      <FieldFooter id={footerId} hint={hint} error={error} count={count} />
    </div>
  );
}
