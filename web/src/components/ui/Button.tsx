import type { ButtonHTMLAttributes } from 'react';

import { CONTROL_HEIGHT, CONTROL_TEXT, type ControlSize } from './controlStyles';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'inverse';

/**
 * One button language across the app: Beetroot for main actions, outlined
 * for secondary, Beetroot-outlined for destructive, quiet for inline row
 * actions. Height comes from the shared control scale (never vertical
 * padding) so buttons match adjacent inputs and selects exactly.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-beetroot text-white border border-beetroot hover:bg-beetroot-dark hover:border-beetroot-dark disabled:bg-beetroot/40 disabled:border-beetroot/10',
  secondary:
    'bg-white text-black border border-black/30 hover:border-black hover:bg-black/[0.04] disabled:opacity-40',
  danger: 'bg-white text-beetroot border border-beetroot hover:bg-beetroot-tint disabled:opacity-40',
  ghost:
    'bg-transparent text-black/70 border border-transparent hover:text-black hover:bg-black/[0.04]',
  // For the wine header — outlined in white rather than filled.
  inverse:
    'bg-transparent text-white border border-white/40 hover:border-white hover:bg-white/10 disabled:opacity-40',
};

const PADDING_CLASSES: Record<ControlSize, string> = {
  md: 'px-5',
  sm: 'px-3',
};

const BASE_CLASSES =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-beetroot';

/**
 * Shared so anything that looks like a button (including link-buttons) is
 * styled from one place rather than copying class strings.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ControlSize = 'md',
  className = '',
): string {
  return `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${CONTROL_HEIGHT[size]} ${CONTROL_TEXT[size]} ${PADDING_CLASSES[size]} ${className}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ControlSize;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...rest} />;
}
