export function AdobeLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 132 36"
      role="img"
      aria-label="Adobe"
      className={className}
      fill="currentColor"
    >
      <path d="M0 0h34v36L20.5 0H0Zm34 0h-13.5L7 36h13l4.2-11.4h9.8V0Z" />
      <text
        x="44"
        y="25"
        fontFamily="Arial, sans-serif"
        fontSize="21"
        fontWeight="600"
        letterSpacing="-0.6"
      >
        Adobe
      </text>
    </svg>
  );
}
