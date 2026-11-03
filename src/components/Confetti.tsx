import { CSSProperties, useMemo } from 'react';

const COLORS = ['#fca311', '#1d4ed8', '#16a34a', '#ec4899', '#facc15', '#06b6d4'];

// A burst of falling confetti. Give it a new key to fire it again.
// `fixed` covers the whole screen; otherwise it fills its positioned parent.
export function Confetti({ count = 40, fixed = false }: { count?: number; fixed?: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1 + Math.random() * 0.9,
        drift: (Math.random() - 0.5) * 120,
        spin: (Math.random() - 0.5) * 900,
        color: COLORS[i % COLORS.length],
        round: Math.random() < 0.3,
      })),
    [count],
  );
  return (
    <div className={`confetti ${fixed ? 'confetti-fixed' : ''}`} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              borderRadius: p.round ? '50%' : '2px',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              '--drift': `${p.drift}px`,
              '--spin': `${p.spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
