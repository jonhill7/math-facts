import { DragonState } from '../engine/dragons';

const PICTURE: Record<string, string> = { none: '❔', egg: '🥚', hatchling: '🐲', young: '🐉', grown: '🐉' };

// A dragon picture, tinted in its species' color and sized by its stage.
export function Dragon({ dragon, size = 1 }: { dragon: DragonState; size?: number }) {
  const { stage, species } = dragon;
  return (
    <span
      className={`dragon dragon-${stage}`}
      style={{ filter: stage === 'none' ? undefined : `hue-rotate(${species.hue}deg) saturate(1.3)`, fontSize: `${size}em` }}
      role="img"
      aria-label={stage === 'none' ? 'Undiscovered dragon' : `${species.name}, ${stage}`}
    >
      {PICTURE[stage]}
      {stage === 'grown' && <span className="dragon-crown">✨</span>}
    </span>
  );
}
