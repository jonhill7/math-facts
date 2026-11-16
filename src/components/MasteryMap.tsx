import { ReactNode, useEffect, useRef, useState } from 'react';
import { Fact, factById, MAX_FACTOR, Op } from '../engine/facts';
import { factFamily, hintFor } from '../engine/hints';
import { FactState, MASTERED_BOX, Progress, troubleFacts } from '../engine/scheduler';

const LABELS = ['Not tried yet', 'Learning', 'Getting there', 'Good', 'Strong', 'Mastered'];
// What each box means, in words a kid (or parent) can use.
const MEANING = [
  "Hasn't come up yet.",
  'Still learning this one. It comes up every game.',
  'Can solve it. Answer it fast on another day to move it up.',
  'Remembered it fast. It comes back in a few days.',
  'Remembered it fast across days. It comes back in a week.',
  'Mastered! It comes back in a few weeks to stay sharp.',
];
const range = Array.from({ length: MAX_FACTOR }, (_, i) => i + 1);

function Grid({ op, progress, selected, onSelect, card }: { op: Op; progress: Progress; selected?: string; onSelect: (id: string) => void; card?: ReactNode }) {
  return (
    <div className="grid-wrap">
      <h3>{op === 'mul' ? 'Multiplication (row × column)' : 'Division (row is the number you divide by, column is the answer)'}</h3>
      <p className="muted grid-tip">Tap a square to see its fact.</p>
      <div className="grid" role="grid" aria-label={op === 'mul' ? 'Multiplication facts' : 'Division facts'}>
        <div className="cell head" aria-hidden="true">
          {op === 'mul' ? '×' : '÷'}
        </div>
        {range.map((b) => (
          <div key={`h${b}`} className="cell head" aria-hidden="true">
            {b}
          </div>
        ))}
        {range.map((a) => (
          <div key={`r${a}`} className="grid-row" role="row">
            <div className="cell head" aria-hidden="true">
              {a}
            </div>
            {range.map((b) => {
              const id = `${op}:${a}:${b}`;
              const fact = factById(id);
              const box = progress[id]?.box ?? 0;
              return (
                <button
                  key={id}
                  type="button"
                  role="gridcell"
                  className={`cell box-${box} ${selected === id ? 'cell-selected' : ''}`}
                  aria-label={`${fact.text} = ${fact.answer}: ${LABELS[box]}`}
                  aria-pressed={selected === id}
                  onClick={() => onSelect(id)}
                >
                  {box === MASTERED_BOX && <span aria-hidden="true">★</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {card}
    </div>
  );
}

export function masteredCount(progress: Progress): number {
  return Object.values(progress).filter((s) => s.box >= MASTERED_BOX).length;
}

interface Props {
  progress: Progress;
  onBack: () => void;
  onPractice: (facts: Fact[]) => void;
}

export function MasteryMap({ progress, onBack, onPractice }: Props) {
  const [selected, setSelected] = useState<string>();
  const trouble = troubleFacts(progress);
  const select = (id: string) => setSelected((s) => (s === id ? undefined : id));
  return (
    <div className="map">
      <button type="button" className="link-button" onClick={onBack}>
        ← Back
      </button>
      <h2>Your fact map</h2>
      <p className="muted">
        Each square is one fact. A right answer moves it to “Getting there”. Answer it right and fast on different days to turn it green.
      </p>
      <div className="legend">
        {LABELS.map((label, box) => (
          <span key={label}>
            <i className={`swatch box-${box}`} /> {box === MASTERED_BOX && '★ '}
            {label}
          </span>
        ))}
      </div>
      <TroubleFacts trouble={trouble} selected={selected} onSelect={select} onPractice={onPractice} />
      {(['mul', 'div'] as Op[]).map((op) => (
        <Grid
          key={op}
          op={op}
          progress={progress}
          selected={selected}
          onSelect={select}
          // The fact's card opens just under its grid.
          card={selected?.startsWith(op) && <FactCard id={selected} state={progress[selected]} onPractice={onPractice} onClose={() => setSelected(undefined)} />}
        />
      ))}
    </div>
  );
}

// One fact up close: what it is, how it's going, and a way to work it out.
function FactCard({ id, state, onPractice, onClose }: { id: string; state?: FactState; onPractice: (facts: Fact[]) => void; onClose: () => void }) {
  const fact = factById(id);
  const box = state?.box ?? 0;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [id]);
  return (
    <div ref={ref} className={`fact-card box-edge-${box}`} role="region" aria-label={`${fact.text} = ${fact.answer}`}>
      <div className="fact-card-top">
        <strong className="fact-card-eq">
          {fact.text} = {fact.answer}
        </strong>
        <button type="button" className="link-button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p>
        <span className={`swatch box-${box}`} /> <strong>{LABELS[box]}</strong>: {MEANING[box]}
      </p>
      {state && (
        <p className="muted">
          Right {state.correct} of {state.seen} times{state.avgMs > 0 && `, in ${(state.avgMs / 1000).toFixed(1)} seconds on average`}.
        </p>
      )}
      <p>💡 {hintFor(fact)}</p>
      <p className="muted">Same family: {factFamily(fact).join(' · ')}</p>
      {state && (
        <button type="button" className="chip" onClick={() => onPractice(familyFacts(fact))}>
          🔦 Practice this family
        </button>
      )}
    </div>
  );
}

// The fact and its family members the kid has already met.
function familyFacts(fact: Fact): Fact[] {
  const ids = new Set([`mul:${fact.a}:${fact.b}`, `mul:${fact.b}:${fact.a}`, `div:${fact.a}:${fact.b}`, `div:${fact.b}:${fact.a}`]);
  return [...ids].map(factById);
}

interface TroubleProps {
  trouble: { id: string; state: FactState }[];
  selected?: string;
  onSelect: (id: string) => void;
  onPractice: (facts: Fact[]) => void;
}

function TroubleFacts({ trouble, selected, onSelect, onPractice }: TroubleProps) {
  return (
    <div className="trouble">
      <h3>Trouble facts</h3>
      {trouble.length === 0 ? (
        <p className="muted">No trouble facts right now. Nice!</p>
      ) : (
        <>
          <p className="muted">The facts that need the most help. Tap one for a strategy, or practice them all in Lantern Hunt.</p>
          <ul>
            {trouble.map(({ id, state }) => {
              const fact = factById(id);
              return (
                <li key={id}>
                  <button type="button" className={`trouble-fact ${selected === id ? 'trouble-selected' : ''}`} onClick={() => onSelect(id)} aria-pressed={selected === id}>
                    <strong>
                      {fact.text} = {fact.answer}
                    </strong>
                    <span>
                      right {state.correct} of {state.seen}
                      {state.correct > 0 && state.avgMs > 0 && ` · ${(state.avgMs / 1000).toFixed(1)} s`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="big-button practice-trouble" onClick={() => onPractice(trouble.map((t) => factById(t.id)))}>
            🔦 Practice trouble facts
          </button>
        </>
      )}
    </div>
  );
}
