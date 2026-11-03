import { allDragons, DragonState, Hoard, nextEggIn, STAGE_LEVEL } from '../engine/dragons';
import { useState } from 'react';
import { Dragon } from './Dragon';
import { abilityOf, ABILITY_INFO } from '../engine/abilities';

export function stageText(d: DragonState): string {
  switch (d.stage) {
    case 'egg':
      return `Egg · level ${d.level}. Hatches at level ${STAGE_LEVEL.hatchling}.`;
    case 'hatchling':
      return `Hatchling · level ${d.level}. Grows up at level ${STAGE_LEVEL.young}.`;
    case 'young':
      return `Young dragon · level ${d.level}. Fully grown at level ${STAGE_LEVEL.grown}.`;
    case 'grown':
      return `Fully grown · level ${d.level}!`;
    default:
      return 'Not found yet.';
  }
}

// "Sparky the Ember Drake" once a kid has named it, otherwise "Ember Drake".
export function dragonName(d: DragonState, names: Record<string, string>): string {
  const given = names[String(d.species.id)];
  return given ? `${given} the ${d.species.name}` : d.species.name;
}

interface Props {
  hoard: Hoard;
  snacksEarned: number;
  companion: DragonState;
  names: Record<string, string>;
  onPick: (id: number) => void;
  onName: (id: number, name: string) => void;
  onBack: () => void;
  hat?: string;
}

export function Hatchery({ hoard, snacksEarned, companion, names, onPick, onName, onBack, hat }: Props) {
  const dragons = allDragons(hoard, snacksEarned);
  const nextEgg = nextEggIn(snacksEarned);
  const firstMissing = dragons.find((d) => d.stage === 'none');
  const [draft, setDraft] = useState(names[String(companion.species.id)] ?? '');
  const [savedName, setSavedName] = useState(false);
  return (
    <div className="hatchery">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back
      </button>
      <h2>Dragon hatchery</h2>
      <p className="muted">
        Your companion eats a snack for every right answer, and snacks level it up. Eggs hatch at level {STAGE_LEVEL.hatchling}, and a hatched dragon gives you
        its power in every game. Tap any egg or dragon to make it your companion.
        {nextEgg !== null && ` You'll find a new egg in ${nextEgg} snacks.`}
      </p>
      <form
        className="name-form"
        onSubmit={(e) => {
          e.preventDefault();
          onName(companion.species.id, draft.trim());
          setSavedName(true);
        }}
      >
        <label htmlFor="dragon-name">Name your {companion.stage === 'egg' ? `${companion.species.name} egg` : companion.species.name}</label>
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
      <div className="dragon-grid">
        {dragons.map((d) => {
          const found = d.stage !== 'none';
          const isCompanion = d.species.id === companion.species.id;
          const ability = ABILITY_INFO[abilityOf(d.species.id)];
          return (
            <button
              key={d.species.id}
              type="button"
              className={`dragon-card ${isCompanion ? 'dragon-card-companion' : ''}`}
              disabled={!found}
              onClick={() => {
                onPick(d.species.id);
                setDraft(names[String(d.species.id)] ?? '');
                setSavedName(false);
              }}
            >
              {found && <span className="dragon-table">Lv {d.level}</span>}
              <Dragon dragon={d} size={4.2} hat={isCompanion ? hat : undefined} />
              <strong>{found ? dragonName(d, names) : '???'}</strong>
              {found && (
                <span className="dragon-meter" aria-label={`${d.into} of ${d.needed} snacks to the next level`}>
                  <span style={{ width: `${Math.round((d.into / d.needed) * 100)}%` }} />
                </span>
              )}
              <small>
                {isCompanion
                  ? `Your companion · ${stageText(d)}`
                  : found
                    ? stageText(d)
                    : d === firstMissing && nextEgg !== null
                      ? `New egg in ${nextEgg} snacks`
                      : 'Keep practicing to find more eggs.'}
              </small>
              {found && (
                <small className="ability">
                  {ability.icon} {ability.name}
                  {d.stage === 'egg' ? ' (once hatched)' : ''}
                </small>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
