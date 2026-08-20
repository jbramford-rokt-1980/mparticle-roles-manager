import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Short all-caps eyebrow, in the Beetroot editorial rhythm. */
  eyebrow: string;
  title: string;
  description?: string;
  /** Controls aligned to the right of the title row. */
  actions?: ReactNode;
}

/**
 * Editorial page header: mono eyebrow, Archivo Medium headline, hairline
 * rule — the vertical rhythm used across go.rokt.com/beetroot.
 */
export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="border-b border-black/15 pb-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-beetroot">{eyebrow}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        {actions}
      </div>
      {description && <p className="mt-3 max-w-3xl text-black/60">{description}</p>}
    </header>
  );
}
