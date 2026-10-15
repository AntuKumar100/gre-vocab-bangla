/** Shobdo Quest mark: a speech bubble (a word) holding a spark (the quest). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo-mark">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.55" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="lg-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#lg-bg)" />
      <path d="M17 15h30a7 7 0 0 1 7 7v16a7 7 0 0 1-7 7H31l-10 8v-8h-4a7 7 0 0 1-7-7V22a7 7 0 0 1 7-7z" fill="#fff" />
      <path className="logo-spark" d="M32 19.5l3.2 7.3 7.3 3.2-7.3 3.2L32 40.5l-3.2-7.3-7.3-3.2 7.3-3.2z" fill="url(#lg-spark)" />
      <path className="logo-twinkle" d="M53 5.5l1.4 3.1 3.1 1.4-3.1 1.4L53 14.5l-1.4-3.1-3.1-1.4 3.1-1.4z" fill="#fde047" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wm-a">Shobdo</span>
      <span className="wm-b">Quest</span>
    </span>
  );
}
