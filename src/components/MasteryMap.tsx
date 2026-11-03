import { factById, MAX_FACTOR, Op } from '../engine/facts';
import { MASTERED_BOX, Progress } from '../engine/scheduler';

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
      <Grid op="mul" progress={progress} />
      <Grid op="div" progress={progress} />
    </div>
  );
}
