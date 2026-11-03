import { allDragons, DragonState, STAGES } from '../engine/dragons';
import { Progress } from '../engine/scheduler';
import { useState } from 'react';
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

// "Sparky the Ember Drake" once a kid has named it, otherwise "Ember Drake".
export function dragonName(d: DragonState, names: Record<string, string>): string {
  const given = names[String(d.species.table)];
  return given ? `${given} the ${d.species.name}` : d.species.name;
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
  names: Record<string, string>;
  onPick: (table: number) => void;
  onName: (table: number, name: string) => void;
  onBack: () => void;
}

export function Hatchery({ progress, companion, names, onPick, onName, onBack }: Props) {
  const dragons = allDragons(progress);
  const current = companionFor(progress, companion);
  const currentHatched = current && STAGES.indexOf(current.stage) >= 2;
  const [draft, setDraft] = useState(current ? names[String(current.species.table)] ?? '' : '');
  const [savedName, setSavedName] = useState(false);
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
      {currentHatched && current && (
        <form
          className="name-form"
          onSubmit={(e) => {
            e.preventDefault();
            onName(current.species.table, draft.trim());
            setSavedName(true);
          }}
        >
          <label htmlFor="dragon-name">Name your {current.species.name}</label>
          <span>
            <input
              id="dragon-name"
              value={draft}
              maxLength={16}
              placeholder="Sparky"
              onChange={(e) => {
                setDraft(e.target.value);
                setSavedName(false);
              }}
            />
            <button type="submit" className="chip">
              {savedName ? 'Saved ✓' : 'Save'}
            </button>
          </span>
        </form>
      )}
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
              onClick={() => {
                onPick(d.species.table);
                setDraft(names[String(d.species.table)] ?? '');
                setSavedName(false);
              }}
            >
              <span className="dragon-table">{d.species.table}s</span>
              <Dragon dragon={d} size={4.2} />
              <strong>{d.stage === 'none' ? '???' : dragonName(d, names)}</strong>
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
