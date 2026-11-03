import { DragonState } from '../engine/dragons';
import { Place, PLACES, unlocked } from '../engine/places';
import { Dragon } from './Dragon';

interface Props {
  known: number; // facts known well
  current: string;
  companion?: DragonState;
  hat?: string;
  onPick: (place: Place) => void;
  onBack: () => void;
}

// The world tour: a route of places. Knowing more facts lets your dragon fly further.
export function WorldTour({ known, current, companion, hat, onPick, onBack }: Props) {
  return (
    <div className="world">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back
      </button>
      <h2>Dragon world tour</h2>
      <p className="muted">Learn more facts to fly further. Your games take on the look of the place you pick. You know {known} facts well.</p>
      <ol className="route">
        {PLACES.map((p) => {
          const open = unlocked(p, known);
          const here = p.id === current;
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`place ${here ? 'place-here' : ''}`}
                disabled={!open}
                onClick={() => onPick(p)}
                style={{ background: open ? `linear-gradient(120deg, ${p.pitch[0]}, ${p.night})` : undefined }}
              >
                <span className="place-emoji" aria-hidden="true">
                  {open ? p.emoji : '🔒'}
                </span>
                <span className="place-text">
                  <strong>{p.name}</strong>
                  <small>{open ? p.fact : `Know ${p.need} facts to fly here (${Math.max(0, p.need - known)} to go).`}</small>
                </span>
                {here && companion && companion.stage !== 'none' && (
                  <span className="place-dragon">
                    <Dragon dragon={companion} size={2.8} hat={hat} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
