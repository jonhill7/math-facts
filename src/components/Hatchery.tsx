import { allDragons, DragonState, STAGES } from '../engine/dragons';
import { Progress } from '../engine/scheduler';
import { Dragon } from './Dragon';

const STAGE_TEXT: Record<string, string> = {
  none: 'Practice the {n}s to find this egg.',
  egg: 'Egg. Know half the {n}s well to hatch it.',
  hatchling: 'Hatchling! Know all the {n}s well to grow it.',
  young: 'Young dragon. Master every {n}s fact to fully grow it.',
  grown: 'Fully grown!',
};

export function stageText(d: DragonState): string {
  return STAGE_TEXT[d.stage].replace('{n}', String(d.species.table));
}

// The kid's companion: the one they picked, or else their most grown dragon.
export function companionFor(progress: Progress, picked?: number): DragonState | undefined {
  const dragons = allDragons(progress);
  const chosen = dragons.find((d) => d.species.table === picked && STAGES.indexOf(d.stage) >= 2);
  if (chosen) return chosen;
  return [...dragons].sort((a, b) => STAGES.indexOf(b.stage) - STAGES.indexOf(a.stage))[0];
}

interface Props {
  progress: Progress;
  companion?: number;
  onPick: (table: number) => void;
  onBack: () => void;
}

export function Hatchery({ progress, companion, onPick, onBack }: Props) {
  const dragons = allDragons(progress);
  const current = companionFor(progress, companion);
  return (
    <div className="hatchery">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back
      </button>
      <h2>Dragon hatchery</h2>
      <p className="muted">
        Every times table has its own dragon. Learn the facts to hatch and grow it. Tap a hatched dragon to make it your
        companion.
      </p>
      <div className="dragon-grid">
        {dragons.map((d) => {
          const hatched = STAGES.indexOf(d.stage) >= 2;
          const isCompanion = hatched && current?.species.table === d.species.table;
          return (
            <button
              key={d.species.table}
              type="button"
              className={`dragon-card ${isCompanion ? 'dragon-card-companion' : ''}`}
              disabled={!hatched}
              onClick={() => onPick(d.species.table)}
            >
              <span className="dragon-table">{d.species.table}s</span>
              <Dragon dragon={d} size={2.4} />
              <strong>{d.stage === 'none' ? '???' : d.species.name}</strong>
              <span className="dragon-meter" aria-hidden="true">
                <span style={{ width: `${Math.round((d.known / d.total) * 100)}%` }} />
              </span>
              <small>{isCompanion ? 'Your companion' : stageText(d)}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
