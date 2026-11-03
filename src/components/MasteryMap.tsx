import { factById, MAX_FACTOR, Op } from '../engine/facts';
import { MASTERED_BOX, Progress, troubleFacts } from '../engine/scheduler';

const LABELS = ['Not tried yet', 'Learning', 'Getting there', 'Good', 'Strong', 'Mastered'];
const range = Array.from({ length: MAX_FACTOR }, (_, i) => i + 1);

function Grid({ op, progress }: { op: Op; progress: Progress }) {
  return (
    <div className="grid-wrap">
      <h3>{op === 'mul' ? 'Multiplication (row × column)' : 'Division (row is the divisor, column is the answer)'}</h3>
      <div className="grid" role="table">
        <div className="cell head">{op === 'mul' ? '×' : '÷'}</div>
        {range.map((b) => (
          <div key={`h${b}`} className="cell head">
            {b}
          </div>
        ))}
        {range.map((a) => (
          <div key={`r${a}`} className="grid-row" role="row">
            <div className="cell head">{a}</div>
            {range.map((b) => {
              const id = `${op}:${a}:${b}`;
              const state = progress[id];
              const box = state?.box ?? 0;
              return (
                <div key={id} className={`cell box-${box}`} title={`${factById(id).text} = ${factById(id).answer}: ${LABELS[box]}`} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function masteredCount(progress: Progress): number {
  return Object.values(progress).filter((s) => s.box >= MASTERED_BOX).length;
}

export function MasteryMap({ progress, onBack }: { progress: Progress; onBack: () => void }) {
  return (
    <div className="map">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back
      </button>
      <h2>Your fact map</h2>
      <p className="muted">Each square is one fact. Answer it right and fast on different days to turn it green.</p>
      <div className="legend">
        {LABELS.map((label, box) => (
          <span key={label}>
            <i className={`swatch box-${box}`} /> {label}
          </span>
        ))}
      </div>
      <TroubleFacts progress={progress} />
      <Grid op="mul" progress={progress} />
      <Grid op="div" progress={progress} />
    </div>
  );
}

function TroubleFacts({ progress }: { progress: Progress }) {
  const trouble = troubleFacts(progress);
  return (
    <div className="trouble">
      <h3>Trouble facts</h3>
      {trouble.length === 0 ? (
        <p className="muted">No trouble facts right now. Nice!</p>
      ) : (
        <>
          <p className="muted">The facts that need the most help. Practicing these with a strategy hint helps most.</p>
          <ul>
            {trouble.map(({ id, state }) => {
              const fact = factById(id);
              return (
                <li key={id}>
                  <strong>
                    {fact.text} = {fact.answer}
                  </strong>
                  <span>
                    right {state.correct} of {state.seen}
                    {state.correct > 0 && ` · ${(state.avgMs / 1000).toFixed(1)} s`}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
