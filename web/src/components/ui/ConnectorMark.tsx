/**
 * The Rokt parallelogram motif, taken from the shapes in the official
 * mParticle-by-Rokt lockup. Used as a quiet accent rule, never as a
 * substitute for the logo itself.
 */
export function ConnectorMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 16" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 0 H24 L12 16 H0 Z" />
      <path d="M32 0 H44 L32 16 H20 Z" opacity="0.7" />
      <path d="M52 0 H64 L52 16 H40 Z" opacity="0.45" />
      <path d="M72 0 H84 L72 16 H60 Z" opacity="0.25" />
    </svg>
  );
}
