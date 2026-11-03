import { DragonState } from '../engine/dragons';

// Original dragon drawings, one design tinted per species, in five stages:
// undiscovered, egg, hatchling, young and grown.

interface Colors {
  body: string;
  dark: string;
  belly: string;
  wing: string;
}

function colorsFor(hue: number): Colors {
  return {
    body: `hsl(${hue} 70% 55%)`,
    dark: `hsl(${hue} 60% 32%)`,
    belly: `hsl(${(hue + 45) % 360} 85% 82%)`,
    wing: `hsl(${(hue + 340) % 360} 65% 44%)`,
  };
}

function Egg({ c }: { c: Colors }) {
  return (
    <g>
      <ellipse cx="50" cy="94" rx="24" ry="4" fill="rgba(0,0,0,0.15)" />
      <path d="M50 14 C30 14 22 44 22 62 C22 80 34 92 50 92 C66 92 78 80 78 62 C78 44 70 14 50 14 Z" fill={c.belly} stroke={c.dark} strokeWidth="3" />
      <path d="M24 58 L33 50 L42 58 L50 50 L58 58 L67 50 L76 58" fill="none" stroke={c.body} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="38" cy="36" r="5" fill={c.body} />
      <circle cx="60" cy="30" r="4" fill={c.body} />
      <circle cx="44" cy="76" r="6" fill={c.body} />
      <circle cx="64" cy="72" r="4" fill={c.body} />
      <ellipse cx="38" cy="28" rx="4" ry="7" fill="rgba(255,255,255,0.6)" transform="rotate(-20 38 28)" />
    </g>
  );
}

function Mystery() {
  return (
    <g>
      <path d="M50 14 C30 14 22 44 22 62 C22 80 34 92 50 92 C66 92 78 80 78 62 C78 44 70 14 50 14 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 5" opacity="0.45" />
      <text x="50" y="68" textAnchor="middle" fontSize="30" fontWeight="700" fill="currentColor" opacity="0.45">
        ?
      </text>
    </g>
  );
}

function Face({ c, x, y, r }: { c: Colors; x: number; y: number; r: number }) {
  // Head with snout, eye, horns and cheek, facing right.
  return (
    <g>
      <path d={`M${x - r * 0.5} ${y - r * 0.8} l-${r * 0.25} -${r * 0.75} l${r * 0.55} ${r * 0.45} Z`} fill={c.belly} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
      <path d={`M${x + r * 0.05} ${y - r * 0.95} l${r * 0.1} -${r * 0.8} l${r * 0.4} ${r * 0.7} Z`} fill={c.belly} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
      <circle cx={x} cy={y} r={r} fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <ellipse cx={x + r * 0.75} cy={y + r * 0.35} rx={r * 0.6} ry={r * 0.45} fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <circle cx={x + r * 1.05} cy={y + r * 0.2} r={r * 0.07} fill={c.dark} />
      <circle cx={x + r * 0.15} cy={y - r * 0.15} r={r * 0.32} fill="#fff" stroke={c.dark} strokeWidth="1.5" />
      <circle cx={x + r * 0.22} cy={y - r * 0.12} r={r * 0.17} fill="#1f2937" />
      <circle cx={x + r * 0.28} cy={y - r * 0.2} r={r * 0.06} fill="#fff" />
      <ellipse cx={x - r * 0.25} cy={y + r * 0.45} rx={r * 0.2} ry={r * 0.12} fill="#f9a8d4" opacity="0.8" />
      <path d={`M${x + r * 0.55} ${y + r * 0.62} q${r * 0.25} ${r * 0.18} ${r * 0.5} 0`} fill="none" stroke={c.dark} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Hatchling({ c }: { c: Colors }) {
  return (
    <g>
      <ellipse cx="50" cy="94" rx="26" ry="4" fill="rgba(0,0,0,0.15)" />
      <path d="M30 60 l-10 -6 l4 12 Z" fill={c.wing} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
      <ellipse cx="46" cy="66" rx="20" ry="18" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <ellipse cx="50" cy="70" rx="11" ry="10" fill={c.belly} />
      <Face c={c} x={52} y={40} r={17} />
      <path d="M22 76 L28 68 L34 76 L41 67 L48 76 L55 67 L62 76 L69 68 L76 76 L76 84 C76 92 64 94 50 94 C36 94 22 92 22 84 Z" fill="#fffbeb" stroke="#d6c7a1" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}

function Grown({ c, crown }: { c: Colors; crown: boolean }) {
  return (
    <g>
      <ellipse cx="48" cy="94" rx="32" ry="4" fill="rgba(0,0,0,0.15)" />
      {/* tail */}
      <path d="M28 72 C14 78 8 70 10 60" fill="none" stroke={c.body} strokeWidth="9" strokeLinecap="round" />
      <path d="M10 60 l-6 -4 l9 -6 l3 9 Z" fill={c.wing} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
      {/* wing */}
      <path d="M42 54 C30 30 18 28 10 30 C18 36 18 40 16 44 C22 44 24 48 22 52 C28 52 32 56 34 60 Z" fill={c.wing} stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round" />
      {/* back spikes */}
      <path d="M32 54 l4 -8 l4 7 l4 -8 l4 8" fill={c.belly} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
      {/* body */}
      <ellipse cx="46" cy="68" rx="22" ry="19" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <ellipse cx="52" cy="72" rx="12" ry="12" fill={c.belly} />
      <path d="M46 66 h12 M45 72 h14 M47 78 h10" stroke={c.body} strokeWidth="1.5" opacity="0.6" />
      {/* legs */}
      <rect x="32" y="80" width="10" height="12" rx="5" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <rect x="54" y="80" width="10" height="12" rx="5" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <Face c={c} x={66} y={38} r={15} />
      {crown && (
        <g>
          <path d="M56 22 l3 -10 l5 6 l4 -9 l4 9 l5 -6 l2 10 Z" fill="#facc15" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="68" cy="18" r="2" fill="#ef4444" />
          <path d="M86 18 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 Z" fill="#fde047" />
          <path d="M14 18 l1.5 -4 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 Z" fill="#fde047" />
        </g>
      )}
    </g>
  );
}

// Where a hat sits on each stage's head, in the 100x100 drawing.
const HAT_AT: Record<string, { x: number; y: number }> = { hatchling: { x: 50, y: 25 }, young: { x: 64, y: 22 }, grown: { x: 64, y: 14 } };

export function Dragon({ dragon, size = 1, hat }: { dragon: DragonState; size?: number; hat?: string }) {
  const { stage, species } = dragon;
  const c = colorsFor(species.hue);
  return (
    <svg
      className={`dragon dragon-${stage}`}
      viewBox="0 0 100 100"
      width={`${size}em`}
      height={`${size}em`}
      role="img"
      aria-label={stage === 'none' ? 'Undiscovered dragon' : `${species.name}, ${stage}`}
    >
      {stage === 'none' && <Mystery />}
      {stage === 'egg' && <Egg c={c} />}
      {stage === 'hatchling' && <Hatchling c={c} />}
      {(stage === 'young' || stage === 'grown') && <Grown c={c} crown={stage === 'grown' && !hat} />}
      {hat && HAT_AT[stage] && (
        <text x={HAT_AT[stage].x} y={HAT_AT[stage].y} fontSize="24" textAnchor="middle">
          {hat}
        </text>
      )}
    </svg>
  );
}
