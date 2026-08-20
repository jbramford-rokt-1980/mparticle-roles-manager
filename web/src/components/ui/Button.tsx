import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-beetroot text-white hover:bg-beetroot-dark disabled:bg-beetroot/40 border border-transparent',
  secondary:
    'bg-white text-black border border-black hover:bg-black hover:text-white disabled:opacity-40',
  danger:
    'bg-white text-beetroot border border-beetroot hover:bg-beetroot hover:text-white disabled:opacity-40',
  ghost: 'bg-transparent text-black/70 border border-transparent hover:text-black',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beetroot ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}
