/** Shobdo Quest mark: a parrot in the app's colours, speaking. Parrots learn words by hearing and repeating them. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo-mark">
      <defs>
        <linearGradient id="lg-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1e1035" />
          <stop offset="1" stopColor="#3b0764" />
        </linearGradient>
        <linearGradient id="lg-feather" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="0.6" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="lg-feather-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
        <clipPath id="lg-tile">
          <rect width="64" height="64" rx="18" />
        </clipPath>
      </defs>
      <g clipPath="url(#lg-tile)">
        <rect width="64" height="64" fill="url(#lg-bg)" />
        <g className="logo-parrot" transform="translate(-6 4)">
          <path d="M10 110 L10 66 C8 50 14 40 25 36 L41 40 C46 48 46 57 44 66 L44 110 Z" fill="url(#lg-feather-dark)" />
          <circle cx="29" cy="28" r="14.5" fill="url(#lg-feather)" />
          <path d="M19 18 C17 12 21 8 26 10 C24 12 24 15 25 17 Z" fill="url(#lg-feather)" />
          <ellipse cx="33" cy="33" rx="6.5" ry="4" fill="#fbcfe8" />
          <path d="M38.5 19.5 C46 18.5 51.5 24 50.5 31.5 C50 35 47.5 36.5 46 35.2 C46.6 31.5 45 28.6 40 29 Z" fill="#facc15" />
          <path d="M40.5 29.8 C43.8 30.2 45.4 32.6 44.4 35 C42.4 35.6 40.8 34.2 40.2 32 Z" fill="#a16207" />
          <path d="M41 21.2 C45 20.8 48 22.6 49.3 25.5" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.45" />
          <circle cx="32.5" cy="22.5" r="4.6" fill="#fbbf24" />
          <circle cx="32.5" cy="22.5" r="3.7" fill="#fff" />
          <circle cx="33.4" cy="22.5" r="2.1" fill="#1f1535" />
          <circle cx="34.1" cy="21.7" r="0.75" fill="#fff" />
        </g>
        <path className="logo-wave w1" d="M49 21 Q53 27 49 33" stroke="#fde047" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path className="logo-wave w2" d="M53.5 17.5 Q60 27 53.5 36.5" stroke="#fde047" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </g>
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
