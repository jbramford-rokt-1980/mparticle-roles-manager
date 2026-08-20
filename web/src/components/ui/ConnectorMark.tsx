/** The Rokt "Connector" zigzag motif, used as a small brand accent. */
export function ConnectorMark({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 16"
      aria-hidden="true"
      className={`text-beetroot ${className}`}
      fill="none"
    >
      <path
        d="M2 14 L32 2 L62 14 L92 2 L118 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="square"
      />
    </svg>
  );
}
