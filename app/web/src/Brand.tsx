/** The Komore wordmark. `compact` shows the mark alone (doc page top bar). */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className={`brand${compact ? " compact" : ""}`} href="/" aria-label={compact ? "Komore home" : undefined}>
      <span className="brand-mark" aria-hidden="true">
        K
      </span>
      {!compact && <span className="brand-name">Komore</span>}
    </a>
  );
}
