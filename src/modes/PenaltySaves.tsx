import { useEffect, useRef, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import { sounds } from '../sound';
import { Confetti } from '../components/Confetti';
import type { SoccerProps } from './PenaltyKicks';
import type { Fact } from '../engine/facts';

type Result = 'dive' | 'save' | 'goal' | 'late' | 'blocked';

interface Shot {
  id: number; // which question this shot belongs to
  result: Result;
  side: -1 | 1; // which way the ball goes
  message: string;
}

// The kid is the goalkeeper. A rival shooter runs up while the shot clock drains.
// Answer right before the kick and you make the save (a fast answer is a diving
// save). Answer wrong, or too slowly, and the rivals score. A power move is a
// super save that counts twice.
interface Props extends StageProps, SoccerProps {
  clockFor: (fact: Fact) => number; // the shot clock for a fact, from its speed goal
}

export function PenaltySaves({ last, turn, fact, onStat, onScore, rival, clockFor, shield, shieldName, gloveStyle, ballStyle, powerSize }: Props) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [score, setScore] = useState({ saves: 0, rival: 0 });
  const timer = useRef<number | undefined>(undefined);
  const decided = useRef(-1); // the turn whose shot has already been taken
  const shieldUsed = useRef(false);
  // The clock for the question on screen. Harder facts get a longer run-up.
  const timeLimitMs = fact ? clockFor(fact) : 5000;

  useEffect(() => onScore({ us: score.saves, them: score.rival }), [score]);

  // The companion's Shield stops the first goal against, once per game.
  const tryShield = (side: -1 | 1): boolean => {
    if (!shield || shieldUsed.current) return false;
    shieldUsed.current = true;
    setShot({ id: turn, result: 'blocked', side, message: `🛡️ ${shieldName} blocked the shot!` });
    window.setTimeout(sounds.save, 250);
    return true;
  };

  // Each new question: the shooter starts the run-up and the shot clock starts.
  useEffect(() => {
    setShot(null);
    timer.current = window.setTimeout(() => {
      if (decided.current === turn) return;
      decided.current = turn;
      const side = Math.random() < 0.5 ? -1 : 1;
      sounds.kick();
      if (tryShield(side)) return;
      setShot({ id: turn, result: 'goal', side, message: `Too late! ${rival} score!` });
      setScore((s) => ({ ...s, rival: s.rival + 1 }));
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
      const message = last.power ? `SUPER SAVE! Counts as ${powerSize}!` : dive ? 'DIVING SAVE!' : 'Saved!';
      setShot({ id: turn, result: dive ? 'dive' : 'save', side, message });
      const n = last.power ? powerSize : 1;
      setScore((s) => ({ ...s, saves: s.saves + n }));
      for (let i = 0; i < n; i++) onStat('saves');
      if (last.power) onStat('powers');
      sounds.kick();
      window.setTimeout(sounds.goal, 250);
    } else if (!last.correct && tryShield(side)) {
      // Blocked by the companion: no goal.
    } else {
      setShot({ id: turn, result: 'goal', side, message: `${rival} score!` });
      setScore((s) => ({ ...s, rival: s.rival + 1 }));
    }
    // onStat is stable for the session; only react to new answers.
  }, [last?.id]);

  const kicked = shot !== null;
  const saved = shot?.result === 'save' || shot?.result === 'dive';
  // Where the save happens, in % of the pitch: a dive reaches high and wide.
  const catchAt = !shot || !saved ? null : shot.result === 'dive' ? { x: 50 + shot.side * 30, y: 38 } : { x: 50 + shot.side * 15, y: 50 };
  // Saved balls end in the keeper's gloves. Goals hit the net in the far corner.
  // A shot the companion blocks stops short of the goal.
  const ball = !shot
    ? undefined
    : catchAt
      ? { left: `${catchAt.x}%`, top: `${catchAt.y}%` }
      : shot.result === 'blocked'
        ? { left: `${50 + shot.side * 22}%`, top: '64%' }
        : { left: `${50 + shot.side * 32}%`, top: '32%' };
  // On a goal the keeper guesses wrong and dives the other way.
  const keeper = catchAt ?? (shot ? { x: 50 - shot.side * 20, y: 50 } : { x: 50, y: 50 });
  const lean = (keeper.x - 50) * 2;

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
        className={`my-keeper ${!shot ? 'my-keeper-ready' : ''} ${shot?.result === 'dive' ? 'my-keeper-dive' : ''}`}
        style={{ ...gloveStyle, left: `${keeper.x}%`, top: `${keeper.y}%`, transform: `translate(-50%, -50%) rotate(${lean}deg)` }}
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
      <div
        key={`b${turn}`}
        className={`ball keeper-ball ${kicked ? 'ball-kicked' : ''} ${catchAt ? 'ball-caught' : ''}`}
        style={{ ...ballStyle, ...ball }}
        aria-hidden="true"
      >
        ⚽
      </div>
      {catchAt && (
        <div key={`r${turn}`} className="catch-ring" style={{ left: `${catchAt.x}%`, top: `${catchAt.y}%` }} aria-hidden="true" />
      )}
      {(shot?.result === 'dive' || last?.power) && shot && <Confetti key={`c${shot.id}`} count={30} />}
      {shot && (
        <div key={`m${shot.id}${shot.result}`} className={`shot-message shot-${saved ? 'saved' : shot.result === 'late' || shot.result === 'blocked' ? 'late' : 'save'}`} role="status">
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
