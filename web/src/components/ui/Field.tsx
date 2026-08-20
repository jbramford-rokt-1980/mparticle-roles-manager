import type { InputHTMLAttributes } from 'react';
import { useId } from 'react';

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function Field({ label, hint, error, className = '', ...rest }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
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
        aria-describedby={hint || error ? hintId : undefined}
        aria-invalid={error ? true : undefined}
        className="w-full border border-black/25 bg-white px-3.5 py-2.5 text-[15px] outline-none transition-colors placeholder:text-black/30 focus:border-beetroot"
        {...rest}
      />
      {(error ?? hint) && (
        <p id={hintId} className={`mt-1.5 text-sm ${error ? 'text-beetroot' : 'text-black/50'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}
