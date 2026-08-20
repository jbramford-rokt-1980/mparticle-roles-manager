export type ControlSize = 'md' | 'sm';

/**
 * Single source of truth for control heights. Buttons, inputs, and selects
 * all set an explicit height from here so anything sitting side by side
 * lines up exactly, regardless of font metrics or line-height defaults.
 */
export const CONTROL_HEIGHT: Record<ControlSize, string> = {
  md: 'h-11',
  sm: 'h-9',
};

export const CONTROL_TEXT: Record<ControlSize, string> = {
  md: 'text-[15px]',
  sm: 'text-sm',
};

/**
 * Bordered white input/select styling. Width is deliberately excluded —
 * callers set it, since Tailwind can't resolve conflicting width classes
 * by attribute order.
 */
export function fieldClasses(size: ControlSize = 'md'): string {
  return `${CONTROL_HEIGHT[size]} ${CONTROL_TEXT[size]} border border-black/25 bg-white px-3.5 outline-none transition-colors focus:border-beetroot`;
}
