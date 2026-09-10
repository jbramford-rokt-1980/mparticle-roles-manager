/**
 * Adobe corporate lockup: the red "A" mark beside the wordmark.
 *
 * The mark geometry is Adobe's own, taken from simple-icons (CC0). The wordmark
 * is set in Source Sans 3 — Adobe releases it open source, so it stands in for
 * the proprietary Adobe Clean without shipping a licensed font.
 *
 * The mark keeps Adobe red on every surface; only the wordmark follows
 * currentColor, so the same component works on the dark header and light pages.
 */
const ADOBE_RED = '#FA0F00';

export function AdobeLogo({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 122 24" role="img" aria-label="Adobe" className={className}>
      <path
        d="M13.966 22.624l-1.69-4.281H8.122l3.892-9.144 5.662 13.425zM8.884 1.376H0v21.248zm15.116 0h-8.884L24 22.624Z"
        fill={ADOBE_RED}
      />
      <text
        x="33"
        y="18.6"
        fill="currentColor"
        fontFamily='"Source Sans 3", system-ui, sans-serif'
        fontSize="20"
        fontWeight="600"
        letterSpacing="-0.5"
      >
        Adobe
      </text>
    </svg>
  );
}
