import { useEffect, useId, useRef, useState } from 'react';

import { CONTROL_HEIGHT, CONTROL_TEXT, type ControlSize } from './controlStyles';

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary text shown alongside the label in the list. */
  detail?: string;
}

export interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  size?: ControlSize;
  /** Render the label inline to the left instead of above the control. */
  inlineLabel?: boolean;
  hint?: string;
  className?: string;
  triggerClassName?: string;
}

/**
 * Custom listbox replacing the native <select>, so the options render below
 * the field in the app's own type and colours instead of an OS-styled popup.
 */
export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  size = 'md',
  inlineLabel = false,
  hint,
  className = '',
  triggerClassName = '',
}: SelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  );

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const openAt = (index: number) => {
    setActiveIndex(Math.min(Math.max(index, 0), Math.max(options.length - 1, 0)));
    setOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openAt(options.findIndex((o) => o.value === value));
      return;
    }
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(activeIndex);
    }
  };

  return (
    <div className={`${inlineLabel ? 'flex items-center gap-2' : ''} ${className}`}>
      <label
        htmlFor={id}
        className={`font-mono text-[11px] uppercase tracking-[0.18em] text-black/60 ${
          inlineLabel ? '' : 'mb-1.5 block'
        }`}
      >
        {label}
      </label>
      <div ref={containerRef} className="relative">
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          onClick={() => (open ? setOpen(false) : openAt(options.findIndex((o) => o.value === value)))}
          onKeyDown={onKeyDown}
          className={`flex w-full items-center justify-between gap-3 border bg-white px-3.5 text-left outline-none transition-colors focus-visible:border-beetroot ${
            CONTROL_HEIGHT[size]
          } ${CONTROL_TEXT[size]} ${open ? 'border-beetroot' : 'border-black/25 hover:border-black/50'} ${triggerClassName}`}
        >
          <span className={`truncate ${selected ? '' : 'text-black/40'}`}>
            {selected?.label ?? placeholder}
          </span>
          <Chevron open={open} />
        </button>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto border border-black bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(index)}
                  className={`cursor-pointer px-3.5 py-2 ${CONTROL_TEXT[size]} ${
                    isActive ? 'bg-wine-tint' : ''
                  } ${isSelected ? 'font-medium text-beetroot' : 'text-black'}`}
                >
                  <span className="block truncate">{option.label}</span>
                  {option.detail && (
                    <span className="block font-mono text-[11px] text-black/45">
                      {option.detail}
                    </span>
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
              <li className="px-3.5 py-2 text-sm text-black/50">Nothing to choose from</li>
            )}
          </ul>
        )}
      </div>
      {hint && !inlineLabel && <p className="mt-1.5 text-sm text-black/50">{hint}</p>}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 8"
      className={`h-2 w-3 shrink-0 text-black/50 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
    >
      <path d="M1 1.5 L6 6.5 L11 1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}
