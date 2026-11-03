import { DragonState } from '../engine/dragons';

// Original dragon drawings in five stages: undiscovered, egg, hatchling, young
// and grown. Every species has its own color, horns, wings, tail, back and
// pattern, so no two look alike.

interface Colors {
  body: string;
  dark: string;
  belly: string;
  wing: string;
}

function colorsFor(hue: number, sat = 70): Colors {
  return {
    body: `hsl(${hue} ${sat}% 55%)`,
    dark: `hsl(${hue} ${Math.min(sat, 60)}% 30%)`,
    belly: `hsl(${(hue + 45) % 360} 85% 82%)`,
    wing: `hsl(${(hue + 340) % 360} 65% 44%)`,
  };
}

type Horns = 'nubs' | 'long' | 'curly' | 'antlers' | 'crest' | 'crown';
type Wings = 'bat' | 'feather' | 'fin' | 'four' | 'none';
type Tail = 'spade' | 'flame' | 'club' | 'fan' | 'leaf' | 'star' | 'twin';
type Back = 'spikes' | 'thorns' | 'plates' | 'none';
type Pattern = 'spots' | 'stripes' | 'stars' | 'hex' | 'diamonds' | 'snow' | 'swirl' | 'jewels' | 'rocks' | 'none';

interface Look {
  horns: Horns;
  wings: Wings;
  tail: Tail;
  back: Back;
  pattern: Pattern;
  whiskers?: boolean;
  big?: boolean; // a bigger, chunkier body
}

const LOOKS: Record<number, Look> = {
  1: { horns: 'nubs', wings: 'none', tail: 'club', back: 'plates', pattern: 'rocks', big: true }, // Pebble Wyrm
  2: { horns: 'long', wings: 'bat', tail: 'twin', back: 'none', pattern: 'stripes' }, // Twin-Tail
  3: { horns: 'nubs', wings: 'bat', tail: 'spade', back: 'thorns', pattern: 'spots' }, // Thornback
  4: { horns: 'long', wings: 'four', tail: 'fan', back: 'none', pattern: 'none' }, // Quadwing
  5: { horns: 'crest', wings: 'fin', tail: 'fan', back: 'none', pattern: 'stars' }, // Starfin
  6: { horns: 'curly', wings: 'bat', tail: 'spade', back: 'spikes', pattern: 'hex' }, // Hexscale
  7: { horns: 'long', wings: 'bat', tail: 'flame', back: 'spikes', pattern: 'none' }, // Ember Drake
  8: { horns: 'antlers', wings: 'feather', tail: 'spade', back: 'spikes', pattern: 'snow' }, // Octofrost
  9: { horns: 'crest', wings: 'feather', tail: 'leaf', back: 'none', pattern: 'swirl', whiskers: true }, // Ninefold Gale
  10: { horns: 'curly', wings: 'bat', tail: 'club', back: 'plates', pattern: 'none', big: true }, // Tenpeak Titan
  11: { horns: 'long', wings: 'feather', tail: 'star', back: 'none', pattern: 'diamonds' }, // Mirror Drake
  12: { horns: 'crown', wings: 'feather', tail: 'flame', back: 'spikes', pattern: 'jewels' }, // Dozen Crown
};

// Small marks drawn at a list of points, for eggs and bodies.
function PatternMarks({ pattern, at, color, size = 1 }: { pattern: Pattern; at: [number, number][]; color: string; size?: number }) {
  const r = 4 * size;
  return (
    <g fill={color} stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {at.map(([x, y], i) => {
        switch (pattern) {
          case 'spots':
            return <circle key={i} cx={x} cy={y} r={r} stroke="none" />;
          case 'rocks':
            return <path key={i} d={`M${x - r} ${y + r * 0.5} l${r * 0.6} ${-r} l${r * 1.1} ${r * 0.2} l${r * 0.3} ${r * 0.9} Z`} stroke="none" />;
          case 'stripes':
            return <path key={i} d={`M${x - r * 1.3} ${y} q${r * 1.3} ${-r} ${r * 2.6} 0`} fill="none" strokeWidth={2.2 * size} />;
          case 'stars':
            return <path key={i} d={`M${x} ${y - r} l${r * 0.3} ${r * 0.7} l${r * 0.7} ${r * 0.1} l${-r * 0.55} ${r * 0.45} l${r * 0.2} ${r * 0.75} l${-r * 0.65} ${-r * 0.4} l${-r * 0.65} ${r * 0.4} l${r * 0.2} ${-r * 0.75} l${-r * 0.55} ${-r * 0.45} l${r * 0.7} ${-r * 0.1} Z`} stroke="none" />;
          case 'hex':
            return <path key={i} d={`M${x - r} ${y} l${r / 2} ${-r * 0.85} h${r} l${r / 2} ${r * 0.85} l${-r / 2} ${r * 0.85} h${-r} Z`} fill="none" strokeWidth={1.6 * size} />;
          case 'diamonds':
            return <path key={i} d={`M${x} ${y - r} l${r * 0.7} ${r} l${-r * 0.7} ${r} l${-r * 0.7} ${-r} Z`} stroke="none" />;
          case 'snow':
            return <path key={i} d={`M${x - r} ${y} h${r * 2} M${x - r * 0.5} ${y - r * 0.85} l${r} ${r * 1.7} M${x + r * 0.5} ${y - r * 0.85} l${-r} ${r * 1.7}`} fill="none" strokeWidth={1.6 * size} />;
          case 'swirl':
            return <path key={i} d={`M${x} ${y} m${-r} 0 a${r} ${r} 0 1 1 ${r} ${r} a${r * 0.5} ${r * 0.5} 0 1 1 ${-r * 0.4} ${-r * 0.6}`} fill="none" strokeWidth={1.8 * size} />;
          case 'jewels':
            return (
              <g key={i} stroke="none">
                <circle cx={x} cy={y} r={r * 0.85} fill={['#ef4444', '#3b82f6', '#22c55e'][i % 3]} />
                <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.25} fill="#fff" />
              </g>
            );
          default:
            return null;
        }
      })}
    </g>
  );
}

function Egg({ c, look }: { c: Colors; look: Look }) {
  return (
    <g>
      <ellipse cx="50" cy="94" rx="24" ry="4" fill="rgba(0,0,0,0.15)" />
      <path d="M50 14 C30 14 22 44 22 62 C22 80 34 92 50 92 C66 92 78 80 78 62 C78 44 70 14 50 14 Z" fill={c.belly} stroke={c.dark} strokeWidth="3" />
      {look.pattern === 'none' ? (
        <path d="M24 58 L33 50 L42 58 L50 50 L58 58 L67 50 L76 58" fill="none" stroke={c.body} strokeWidth="5" strokeLinejoin="round" />
      ) : (
        <PatternMarks pattern={look.pattern} color={c.body} size={1.3} at={[[38, 36], [60, 30], [50, 54], [34, 66], [66, 62], [44, 80], [60, 80]]} />
      )}
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

function HornShapes({ c, horns, x, y, r }: { c: Colors; horns: Horns; x: number; y: number; r: number }) {
  const line = { fill: 'none', stroke: c.dark, strokeWidth: 2.5, strokeLinecap: 'round' as const };
  switch (horns) {
    case 'nubs':
      return (
        <g fill={c.belly} stroke={c.dark} strokeWidth="2">
          <circle cx={x - r * 0.45} cy={y - r * 0.9} r={r * 0.22} />
          <circle cx={x + r * 0.2} cy={y - r * 0.98} r={r * 0.22} />
        </g>
      );
    case 'long':
      return (
        <g fill={c.belly} stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
          <path d={`M${x - r * 0.55} ${y - r * 0.75} l${-r * 0.45} ${-r * 1.0} l${r * 0.75} ${r * 0.6} Z`} />
          <path d={`M${x + r * 0.05} ${y - r * 0.95} l${r * 0.1} ${-r * 1.05} l${r * 0.45} ${r * 0.9} Z`} />
        </g>
      );
    case 'curly':
      return (
        <g {...line} stroke={c.belly} strokeWidth={r * 0.28}>
          <path d={`M${x - r * 0.3} ${y - r * 0.85} c${-r * 0.9} ${-r * 0.6} ${-r * 1.3} ${r * 0.4} ${-r * 0.6} ${r * 0.55}`} />
          <path d={`M${x + r * 0.25} ${y - r * 0.9} c${r * 0.9} ${-r * 0.7} ${r * 1.2} ${r * 0.3} ${r * 0.55} ${r * 0.4}`} />
        </g>
      );
    case 'antlers':
      return (
        <g {...line} stroke="#e0f2fe" strokeWidth="3">
          <path d={`M${x - r * 0.35} ${y - r * 0.85} l${-r * 0.3} ${-r * 0.9} M${x - r * 0.55} ${y - r * 1.4} l${-r * 0.45} ${-r * 0.25} M${x - r * 0.48} ${y - r * 1.2} l${r * 0.3} ${-r * 0.35}`} />
          <path d={`M${x + r * 0.25} ${y - r * 0.9} l${r * 0.2} ${-r * 0.9} M${x + r * 0.4} ${y - r * 1.5} l${r * 0.45} ${-r * 0.2} M${x + r * 0.33} ${y - r * 1.25} l${-r * 0.3} ${-r * 0.35}`} />
        </g>
      );
    case 'crest':
      return (
        <path
          d={`M${x - r * 0.9} ${y - r * 0.4} q${-r * 0.1} ${-r * 0.9} ${r * 0.3} ${-r * 0.9} q${r * 0.1} ${-r * 0.6} ${r * 0.6} ${-r * 0.4} q${r * 0.4} ${-r * 0.5} ${r * 0.7} ${r * 0.1} Z`}
          fill={c.wing}
          stroke={c.dark}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      );
    case 'crown':
      return (
        <g>
          <path d={`M${x - r * 0.7} ${y - r * 0.75} l${r * 0.15} ${-r * 0.75} l${r * 0.3} ${r * 0.4} l${r * 0.25} ${-r * 0.6} l${r * 0.25} ${r * 0.6} l${r * 0.3} ${-r * 0.4} l${r * 0.15} ${r * 0.75} Z`} fill="#facc15" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />
          <circle cx={x - r * 0.05} cy={y - r * 1.05} r={r * 0.12} fill="#ef4444" />
        </g>
      );
  }
}

function Face({ c, look, x, y, r }: { c: Colors; look: Look; x: number; y: number; r: number }) {
  // Head with snout, eye, horns and cheek, facing right.
  return (
    <g>
      <HornShapes c={c} horns={look.horns} x={x} y={y} r={r} />
      <circle cx={x} cy={y} r={r} fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <ellipse cx={x + r * 0.75} cy={y + r * 0.35} rx={r * 0.6} ry={r * 0.45} fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <circle cx={x + r * 1.05} cy={y + r * 0.2} r={r * 0.07} fill={c.dark} />
      <circle cx={x + r * 0.15} cy={y - r * 0.15} r={r * 0.32} fill="#fff" stroke={c.dark} strokeWidth="1.5" />
      <circle cx={x + r * 0.22} cy={y - r * 0.12} r={r * 0.17} fill="#1f2937" />
      <circle cx={x + r * 0.28} cy={y - r * 0.2} r={r * 0.06} fill="#fff" />
      <ellipse cx={x - r * 0.25} cy={y + r * 0.45} rx={r * 0.2} ry={r * 0.12} fill="#f9a8d4" opacity="0.8" />
      <path d={`M${x + r * 0.55} ${y + r * 0.62} q${r * 0.25} ${r * 0.18} ${r * 0.5} 0`} fill="none" stroke={c.dark} strokeWidth="2" strokeLinecap="round" />
      {look.whiskers && (
        <path
          d={`M${x + r * 1.2} ${y + r * 0.35} q${r * 0.6} ${r * 0.1} ${r * 0.8} ${r * 0.7} M${x + r * 1.15} ${y + r * 0.5} q${r * 0.4} ${r * 0.4} ${r * 0.3} ${r * 1.0}`}
          fill="none"
          stroke={c.dark}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function WingShape({ c, wings }: { c: Colors; wings: Wings }) {
  const bat = 'M42 54 C30 30 18 28 10 30 C18 36 18 40 16 44 C22 44 24 48 22 52 C28 52 32 56 34 60 Z';
  switch (wings) {
    case 'bat':
      return <path d={bat} fill={c.wing} stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round" />;
    case 'four':
      return (
        <g stroke={c.dark} strokeWidth="2.5" strokeLinejoin="round">
          <path d={bat} fill={c.dark} transform="translate(12 14) scale(0.8)" />
          <path d={bat} fill={c.wing} transform="translate(-2 -6)" />
        </g>
      );
    case 'feather':
      return (
        <g stroke={c.dark} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M42 56 C34 36 20 26 6 26 C10 30 8 34 6 36 C12 38 12 42 10 46 C16 46 18 50 18 54 C26 54 32 58 34 62 Z" fill={c.wing} />
          <path d="M38 52 L14 32 M36 56 L14 42 M36 59 L20 51" fill="none" strokeWidth="1.5" opacity="0.6" />
        </g>
      );
    case 'fin':
      return (
        <g stroke={c.dark} strokeWidth="2.2" strokeLinejoin="round">
          <path d="M28 54 C24 34 40 28 54 48 Z" fill={c.wing} />
          <path d="M32 52 L32 38 M38 50 L40 36 M44 50 L48 40" fill="none" strokeWidth="1.5" opacity="0.6" />
        </g>
      );
    default:
      return null;
  }
}

function TailShape({ c, tail }: { c: Colors; tail: Tail }) {
  const tip = (x: number, y: number) => {
    switch (tail) {
      case 'flame':
        return <path d={`M${x} ${y + 4} c-8 -2 -8 -12 -2 -18 c0 6 4 6 4 2 c4 4 6 12 -2 16 Z`} fill="#f97316" stroke="#b45309" strokeWidth="2" />;
      case 'club':
        return (
          <g fill={c.belly} stroke={c.dark} strokeWidth="2">
            <circle cx={x - 1} cy={y - 2} r="7" />
            <path d={`M${x - 8} ${y - 6} l-4 -2 M${x - 4} ${y - 9} l-1 -4 M${x + 3} ${y - 8} l2 -4`} />
          </g>
        );
      case 'fan':
        return <path d={`M${x + 2} ${y} l-12 -10 q2 8 -2 12 q6 0 8 6 Z`} fill={c.wing} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />;
      case 'leaf':
        return <path d={`M${x + 2} ${y} c-6 -2 -12 -8 -12 -16 c8 0 14 6 12 16 Z`} fill="#4ade80" stroke="#15803d" strokeWidth="2" />;
      case 'star':
        return <path d={`M${x - 2} ${y - 12} l3 6 l7 1 l-5 4 l2 7 l-7 -4 l-6 4 l2 -7 l-5 -4 l6 -1 Z`} fill="#fde047" stroke="#a16207" strokeWidth="1.5" strokeLinejoin="round" />;
      default:
        return <path d={`M${x} ${y} l-6 -4 l9 -6 l3 9 Z`} fill={c.wing} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />;
    }
  };
  return (
    <g>
      <path d="M28 72 C14 78 8 70 10 60" fill="none" stroke={c.body} strokeWidth="9" strokeLinecap="round" />
      {tip(10, 60)}
      {tail === 'twin' && (
        <g>
          <path d="M30 80 C16 90 6 86 6 76" fill="none" stroke={c.body} strokeWidth="8" strokeLinecap="round" />
          <path d="M6 76 l-6 -4 l9 -6 l3 9 Z" fill={c.wing} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
}

function BackShape({ c, back }: { c: Colors; back: Back }) {
  switch (back) {
    case 'spikes':
      return <path d="M32 54 l4 -8 l4 7 l4 -8 l4 8" fill={c.belly} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />;
    case 'thorns':
      return <path d="M24 60 l0 -16 l7 10 l2 -18 l7 14 l4 -18 l5 16 l5 -14 l3 12" fill="#d9f99d" stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />;
    case 'plates':
      return (
        <g fill={c.belly} stroke={c.dark} strokeWidth="2">
          <ellipse cx="27" cy="54" rx="5" ry="8" transform="rotate(-35 27 54)" />
          <ellipse cx="37" cy="47" rx="5.5" ry="8.5" transform="rotate(-15 37 47)" />
          <ellipse cx="49" cy="46" rx="5" ry="8" transform="rotate(10 49 46)" />
        </g>
      );
    default:
      return null;
  }
}

function Hatchling({ c, look }: { c: Colors; look: Look }) {
  return (
    <g>
      <ellipse cx="50" cy="94" rx="26" ry="4" fill="rgba(0,0,0,0.15)" />
      {look.wings !== 'none' && <path d="M30 60 l-10 -6 l4 12 Z" fill={c.wing} stroke={c.dark} strokeWidth="2" strokeLinejoin="round" />}
      <ellipse cx="46" cy="66" rx="20" ry="18" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <ellipse cx="50" cy="70" rx="11" ry="10" fill={c.belly} />
      <PatternMarks pattern={look.pattern} color={c.dark} size={0.7} at={[[32, 60], [30, 70], [62, 58]]} />
      <Face c={c} look={look} x={52} y={40} r={17} />
      <path d="M22 76 L28 68 L34 76 L41 67 L48 76 L55 67 L62 76 L69 68 L76 76 L76 84 C76 92 64 94 50 94 C36 94 22 92 22 84 Z" fill="#fffbeb" stroke="#d6c7a1" strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}

function Grown({ c, look, sparkle }: { c: Colors; look: Look; sparkle: boolean }) {
  const rx = look.big ? 25 : 22;
  return (
    <g>
      <ellipse cx="48" cy="94" rx="32" ry="4" fill="rgba(0,0,0,0.15)" />
      <TailShape c={c} tail={look.tail} />
      <WingShape c={c} wings={look.wings} />
      <BackShape c={c} back={look.back} />
      {/* body */}
      <ellipse cx="46" cy="68" rx={rx} ry="19" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <PatternMarks pattern={look.pattern} color={c.dark} size={0.8} at={[[32, 62], [40, 56], [30, 74], [38, 82]]} />
      <ellipse cx="52" cy="72" rx="12" ry="12" fill={c.belly} />
      <path d="M46 66 h12 M45 72 h14 M47 78 h10" stroke={c.body} strokeWidth="1.5" opacity="0.6" />
      {/* legs */}
      <rect x="32" y="80" width="10" height="12" rx="5" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <rect x="54" y="80" width="10" height="12" rx="5" fill={c.body} stroke={c.dark} strokeWidth="2.5" />
      <Face c={c} look={look} x={66} y={38} r={15} />
      {sparkle && (
        <g fill="#fde047">
          <path d="M88 18 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 Z" />
          <path d="M12 16 l1.5 -4 l1.5 4 l4 1.5 l-4 1.5 l-1.5 4 l-1.5 -4 l-4 -1.5 Z" />
          <path d="M90 60 l1 -3 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 Z" />
        </g>
      )}
    </g>
  );
}

// Where a hat sits on each stage's head, in the 100x100 drawing.
const HAT_AT: Record<string, { x: number; y: number }> = { hatchling: { x: 50, y: 25 }, young: { x: 63, y: 31 }, grown: { x: 64, y: 22 } };

export function Dragon({ dragon, size = 1, hat }: { dragon: DragonState; size?: number; hat?: string }) {
  const { stage, species } = dragon;
  const c = colorsFor(species.hue, species.sat);
  const look = LOOKS[species.id] ?? LOOKS[7];
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
      {stage === 'egg' && <Egg c={c} look={look} />}
      {stage === 'hatchling' && <Hatchling c={c} look={look} />}
      {/* A young dragon is a smaller version of the grown one. */}
      {stage === 'young' && (
        <g transform="translate(9 12) scale(0.85)">
          <Grown c={c} look={look} sparkle={false} />
        </g>
      )}
      {stage === 'grown' && <Grown c={c} look={look} sparkle />}
      {hat && HAT_AT[stage] && look.horns !== 'crown' && (
        <text x={HAT_AT[stage].x} y={HAT_AT[stage].y} fontSize="24" textAnchor="middle">
          {hat}
        </text>
      )}
    </svg>
  );
}
