export interface CharacterCount {
  current: number;
  max: number;
}

export interface FieldFooterProps {
  id: string;
  hint?: string;
  error?: string;
  count?: CharacterCount;
}

/**
 * Shared hint / error / character-count row under a field.
 * The counter turns Beetroot the moment the value goes over the API limit,
 * so the problem is visible before the save is attempted.
 */
export function FieldFooter({ id, hint, error, count }: FieldFooterProps) {
  const over = count ? count.current > count.max : false;
  const message = error ?? hint;
  if (!message && !count) return null;

  return (
    <div id={id} className="mt-1.5 flex items-start justify-between gap-4">
      {message ? (
        <p className={`text-sm ${error ? 'text-beetroot' : 'text-black/50'}`}>{message}</p>
      ) : (
        <span />
      )}
      {count && (
        <span
          className={`shrink-0 font-mono text-[11px] tabular-nums ${
            over ? 'font-medium text-beetroot' : 'text-black/45'
          }`}
        >
          {count.current}/{count.max}
        </span>
      )}
    </div>
  );
}
