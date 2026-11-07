import paths from './brand-paths.json';

const [x, y, w, h] = paths.wordmark.viewBox;
const [cx, cy, r] = paths.wordmark.dot;

/**
 * Primary wordmark with the red full stop, outlined from the Brand Asset Pack v1.0.
 * Text takes `currentColor`, so it works on Paper (ink text) and Ink (paper text).
 */
export function Wordmark({ title = 'UNSUBSCRIBE', className }: { title?: string; className?: string }) {
  return (
    <svg className={className} viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <path fill="currentColor" d={paths.wordmark.d} />
      <circle cx={cx} cy={cy} r={r} fill="var(--alert)" />
    </svg>
  );
}

/** U-and-dot app icon. */
export function BrandIcon({ className, tone = 'ink' }: { className?: string; tone?: 'ink' | 'paper' }) {
  const bg = tone === 'ink' ? '#111111' : '#F5F2EB';
  const fg = tone === 'ink' ? '#F5F2EB' : '#111111';
  const [dx, dy, dr] = paths.icon.dot;
  return (
    <svg className={className} viewBox="0 0 1024 1024" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="984" height="984" rx="220" fill={bg} />
      <path fill={fg} d={paths.icon.d} />
      <circle cx={dx} cy={dy} r={dr} fill="#F04438" />
    </svg>
  );
}
