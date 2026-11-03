import { useEffect, useRef, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import { sounds } from '../sound';
import { Confetti } from '../components/Confetti';
import type { StatKey } from './PenaltyKicks';

type Result = 'dive' | 'save' | 'goal' | 'late';

interface Shot {
  id: number; // which question this shot belongs to
  result: Result;
  side: -1 | 1; // which way the ball goes
  message: string;
}

// The kid is the goalkeeper. A rival shooter runs up while the shot clock drains.
// Answer right before the kick and you make the save (a fast answer is a diving
// save). Answer wrong, or too slowly, and the rivals score.
interface Props extends StageProps {
  onStat: (key: StatKey) => void;
  rival: string;
  timeLimitMs: number;
}

export function PenaltySaves({ last, turn, onStat, rival, timeLimitMs }: Props) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [score, setScore] = useState({ saves: 0, rival: 0 });
  const timer = useRef<number | undefined>(undefined);
  const decided = useRef(-1); // the turn whose shot has already been taken

  // Each new question: the shooter starts the run-up and the shot clock starts.
  useEffect(() => {
    setShot(null);
    timer.current = window.setTimeout(() => {
      if (decided.current === turn) return;
      decided.current = turn;
      const side = Math.random() < 0.5 ? -1 : 1;
      setShot({ id: turn, result: 'goal', side, message: `Too late! ${rival} score!` });
      setScore((s) => ({ ...s, rival: s.rival + 1 }));
      sounds.kick();
      window.setTimeout(sounds.save, 250);
    }, timeLimitMs);
    return () => window.clearTimeout(timer.current);
  }, [turn, timeLimitMs]);

  // Each answer decides the shot, unless the clock already ran out.
  useEffect(() => {
    if (!last) return;
    window.clearTimeout(timer.current);
    const side = Math.random() < 0.5 ? -1 : 1;
    if (decided.current === turn) {
      // The shooter already scored; a late right answer still counts as practice.
      if (last.correct) setShot((s) => (s ? { ...s, result: 'late', message: 'Got it! Answer quicker to stop the next one.' } : s));
      return;
    }
    decided.current = turn;
    if (last.correct && last.ms <= timeLimitMs) {
      const dive = last.fast;
      setShot({ id: turn, result: dive ? 'dive' : 'save', side, message: dive ? 'DIVING SAVE!' : 'Saved!' });
      setScore((s) => ({ ...s, saves: s.saves + 1 }));
      onStat('saves');
      sounds.kick();
      window.setTimeout(sounds.goal, 250);
    } else {
      setShot({ id: turn, result: 'goal', side, message: `${rival} score!` });
      setScore((s) => ({ ...s, rival: s.rival + 1 }));
    }
    // onStat is stable for the session; only react to new answers.
  }, [last?.id]);

  const kicked = shot !== null;
  const saved = shot?.result === 'save' || shot?.result === 'dive';
  // Where the ball ends, in % of the pitch. Saved balls stop in the keeper's gloves.
  const ball = !shot
    ? undefined
    : saved
      ? { left: `${50 + shot.side * (shot.result === 'dive' ? 30 : 16)}%`, top: '34%' }
      : { left: `${50 + shot.side * 32}%`, top: '30%' };
  const keeperX = !shot ? 0 : saved ? shot.side * (shot.result === 'dive' ? 30 : 16) : -shot.side * 20;

  return (
    <div className="pitch pitch-keeper">
      <div className="scoreboard">
        <span>🧤 Saves {score.saves}</span>
        <span>
          {rival} {score.rival}
        </span>
      </div>
      <svg className="goal" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="net-keeper" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 0 L12 12 M12 0 L0 12" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="20" y="8" width="260" height="104" fill="url(#net-keeper)" />
        <path d="M20 112 V8 H280 V112" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </svg>
      {/* The shot clock: how long until the shooter kicks. */}
      <div className="shot-clock" aria-hidden="true">
        <span
          key={`t${turn}`}
          className={kicked ? 'shot-clock-stopped' : ''}
          style={{ animationDuration: `${timeLimitMs}ms`, ['--clock' as string]: `${timeLimitMs}ms` }}
        />
      </div>
      <div
        className={`my-keeper ${shot?.result === 'dive' ? 'my-keeper-dive' : ''}`}
        style={{ left: `${50 + keeperX}%`, transform: `translateX(-50%) rotate(${keeperX * 1.5}deg)` }}
        aria-hidden="true"
      >
        🧤
      </div>
      <div
        key={`s${turn}`}
        className={`shooter ${kicked ? 'shooter-kicked' : ''}`}
        style={{ animationDuration: `${timeLimitMs}ms`, ['--clock' as string]: `${timeLimitMs}ms` }}
        aria-hidden="true"
      >
        🏃
      </div>
      <div key={`b${turn}`} className={`ball keeper-ball ${kicked ? 'ball-kicked' : ''}`} style={ball} aria-hidden="true">
        ⚽
      </div>
      {shot?.result === 'dive' && <Confetti key={`c${shot.id}`} count={30} />}
      {shot && (
        <div key={`m${shot.id}${shot.result}`} className={`shot-message shot-${saved ? 'saved' : shot.result === 'late' ? 'late' : 'save'}`} role="status">
          {shot.message}
        </div>
      )}
      {!shot && turn === 0 && !last && (
        <div className="shot-message shot-hint" role="status">
          You're the keeper! Answer before they kick!
        </div>
      )}
    </div>
  );
}
