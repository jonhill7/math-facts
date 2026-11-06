import { ReactNode, useEffect, useRef, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import { Confetti } from '../components/Confetti';
import { fairTimeMs, Flap, flapsBy, RaceKind, STUMBLE } from '../engine/race';
import { sounds } from '../sound';

// Sky Race: every right answer is a flap toward the finish line. A miss is a
// stumble that costs time. The opponent (your ghost or a rival dragon) flaps
// on its own timeline: the ghost exactly as the kid flapped last time, a rival
// at its pace. Both hop forward one flap at a time, like the kid.
interface Props extends StageProps {
  kind: RaceKind;
  finish: number; // right answers to reach the finish line
  opponentTimes: number[]; // ms the opponent takes for each flap
  fastMs: number;
  racer: ReactNode; // the kid's dragon
  opponent?: ReactNode; // the ghost or rival dragon
  opponentName: string;
  onFlaps: (flaps: Flap[]) => void;
}

// Where the track starts and where the finish line is, in % of the sky's width.
const START = 8;
const FINISH = 88;

export function SkyRace({ last, turn, kind, finish, opponentTimes, fastMs, racer, opponent, opponentName, onFlaps }: Props) {
  const [flaps, setFlaps] = useState<Flap[]>([]);
  const [stars, setStars] = useState(0); // flaps faster than the fair time
  const [message, setMessage] = useState<{ id: number; text: string; kind: 'good' | 'great' | 'oops' } | null>(null);
  const pending = useRef(0); // time spent on the current flap so far, including stumbles
  const shownAt = useRef(Date.now());
  const frozen = useRef(false); // the clock stops while an answer is shown
  const [, tick] = useState(0);

  // A new question: the clock runs again.
  useEffect(() => {
    shownAt.current = Date.now();
    frozen.current = false;
  }, [turn]);

  useEffect(() => {
    if (!last) return;
    frozen.current = true;
    const fair = fairTimeMs(last.fact, fastMs);
    if (last.correct) {
      const flap = { fact: last.fact, ms: pending.current + last.ms };
      pending.current = 0;
      const next = [...flaps, flap];
      setFlaps(next);
      onFlaps(next);
      const quick = last.fast; // beat the fact's speed goal, as in every game
      if (quick) setStars((s) => s + 1);
      setMessage({ id: last.id, text: next.length >= finish ? 'FINISH!' : quick ? 'Super flap! ⭐' : 'Flap!', kind: quick ? 'great' : 'good' });
      if (next.length >= finish) window.setTimeout(sounds.found, 200);
    } else {
      pending.current += last.ms + fair * STUMBLE;
      setMessage({ id: last.id, text: 'Stumble! Shake it off.', kind: 'oops' });
    }
    // onFlaps is stable for the race; only react to new answers.
  }, [last?.id]);

  // Keep the opponent moving while the kid thinks.
  useEffect(() => {
    if (!opponent) return;
    const timer = window.setInterval(() => tick((n) => n + 1), 120);
    return () => window.clearInterval(timer);
  }, [opponent]);

  const kidMs = flaps.reduce((t, f) => t + f.ms, 0) + pending.current;
  const elapsed = kidMs + (frozen.current ? 0 : Date.now() - shownAt.current);
  const them = opponent ? flapsBy(opponentTimes, elapsed) : 0;
  const finished = flaps.length >= finish;
  // Racers start at START and their middle sits on the finish line at FINISH.
  const pos = (n: number) => `${START + (Math.min(n, finish) / finish) * (FINISH - START)}%`;
  const lead = flaps.length - them;

  return (
    <div className={`sky sky-${kind}`}>
      <div className="scoreboard">
        <span>
          🏁 {Math.min(flaps.length, finish)} / {finish}
        </span>
        <span>⭐ {stars}</span>
        {opponent && <span>{lead > 0 ? 'You lead!' : lead < 0 ? `${opponentName} leads` : 'Neck and neck!'}</span>}
      </div>
      <span className="sky-cloud sky-cloud-1" aria-hidden="true">
        ☁️
      </span>
      <span className="sky-cloud sky-cloud-2" aria-hidden="true">
        ☁️
      </span>
      <div className="sky-finish" style={{ left: `${FINISH}%` }} aria-hidden="true" />
      {opponent && (
        <div className={`sky-lane sky-lane-them ${kind === 'ghost' ? 'sky-lane-ghost' : ''}`} aria-hidden="true">
          <div className="sky-racer" style={{ left: pos(them) }}>
            <span key={`t${them}`} className={`sky-body ${them ? 'sky-flap' : ''}`}>
              {opponent}
            </span>
          </div>
        </div>
      )}
      <div className={`sky-lane sky-lane-me ${opponent ? '' : 'sky-lane-solo'}`}>
        <div className="sky-racer sky-racer-me" style={{ left: pos(flaps.length) }} aria-label={`${flaps.length} of ${finish} flaps`}>
          <span key={`r${flaps.length}`} className={`sky-body ${flaps.length ? 'sky-flap' : ''}`}>
            {racer}
          </span>
        </div>
      </div>
      {finished && <Confetti count={40} />}
      {message && (
        <div key={`m${message.id}`} className={`shot-message sky-message sky-message-${message.kind}`} role="status">
          {message.text}
        </div>
      )}
    </div>
  );
}
