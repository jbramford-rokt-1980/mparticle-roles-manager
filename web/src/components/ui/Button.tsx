import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'md' | 'sm';

/**
 * One button language across the app: Beetroot for the primary action,
 * outlined for secondary, Beetroot-outlined for destructive, quiet for
 * inline actions. Hover always darkens/tints the same way per variant.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-beetroot text-white border border-beetroot hover:bg-beetroot-dark hover:border-beetroot-dark disabled:bg-beetroot/40 disabled:border-beetroot/10',
  secondary:
    'bg-white text-black border border-black/30 hover:border-black hover:bg-black/[0.04] disabled:opacity-40',
  danger:
    'bg-white text-beetroot border border-beetroot hover:bg-beetroot-tint disabled:opacity-40',
  ghost:
    'bg-transparent text-black/70 border border-transparent hover:text-black hover:bg-black/[0.04]',
};

/** md matches the height of Field inputs (same text size, padding, border). */
const SIZE_CLASSES: Record<Size, string> = {
  md: 'px-5 py-2.5 text-[15px]',
  sm: 'px-3 py-1.5 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium leading-normal transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beetroot ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    />
  );
}
