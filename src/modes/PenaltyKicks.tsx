import { CSSProperties, useEffect, useRef, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import { sounds } from '../sound';
import { Confetti } from '../components/Confetti';

export type StatKey = 'goals' | 'topCorners' | 'saves' | 'monstersFound' | 'tickles' | 'powers';

export interface MatchScore {
  us: number;
  them: number;
}

// What every soccer game gets from the app, besides the answers.
export interface SoccerProps {
  onStat: (key: StatKey) => void;
  onScore: (score: MatchScore) => void;
  rival: string;
  shields: number; // the companion's Shield power: misses that don't count
  shieldName: string; // who blocks it
  powerSize: number; // goals or saves a power move is worth
  gloveStyle?: CSSProperties;
  ballStyle?: CSSProperties;
}

interface Shot {
  id: number;
  ball: { x: number; y: number }; // where the ball ends, in % of the pitch
  keeper: number; // keeper's dive, in % left/right of center
  message: string;
  kind: 'top' | 'goal' | 'save' | 'power' | 'blocked' | 'stopped';
}

// A penalty shootout match against a rival team. Every answer is a kick.
// Right and fast: top corner. Right but slow: a low shot that sneaks in, unless
// a strong league keeper gets to it. Wrong: the keeper saves it and the rivals
// score on the counter-attack. A power move is a curling super shot worth 2 goals (3 with Blaze).
interface Props extends StageProps, SoccerProps {
  slowSaveChance: number;
}

export function PenaltyKicks({ last, turn, onStat, onScore, rival, shields, shieldName, slowSaveChance, ballStyle, powerSize }: Props) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [score, setScore] = useState({ goals: 0, rival: 0, top: 0 });
  const shieldsUsed = useRef(0);

  useEffect(() => onScore({ us: score.goals, them: score.rival }), [score]);

  // Each new question: the keeper walks back to the middle and the ball goes back on the spot.
  useEffect(() => setShot(null), [turn]);

  useEffect(() => {
    if (!last) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    let next: Shot;
    if (last.power) {
      next = { id: last.id, ball: { x: 50 + side * 38, y: 12 }, keeper: -side * 26, message: `POWER SHOT! ${powerSize} goals!`, kind: 'power' };
      for (let i = 0; i < powerSize; i++) onStat('goals');
      onStat('topCorners');
      onStat('powers');
      setScore((s) => ({ ...s, goals: s.goals + powerSize, top: s.top + 1 }));
    } else if (last.correct && last.fast) {
      next = { id: last.id, ball: { x: 50 + side * 36, y: 14 }, keeper: -side * 22, message: 'TOP CORNER!', kind: 'top' };
      onStat('goals');
      onStat('topCorners');
      setScore((s) => ({ ...s, goals: s.goals + 1, top: s.top + 1 }));
    } else if (last.correct && Math.random() < slowSaveChance) {
      next = { id: last.id, ball: { x: 50 + side * 14, y: 42 }, keeper: side * 14, message: `Saved! Faster shots beat the ${rival} keeper.`, kind: 'stopped' };
    } else if (last.correct) {
      next = { id: last.id, ball: { x: 50 + side * 28, y: 40 }, keeper: side * 16, message: 'Goal!', kind: 'goal' };
      onStat('goals');
      setScore((s) => ({ ...s, goals: s.goals + 1 }));
    } else if (shieldsUsed.current < shields) {
      shieldsUsed.current++;
      next = { id: last.id, ball: { x: 50 + side * 6, y: 36 }, keeper: side * 6, message: `🛡️ ${shieldName} blocked their counter-attack!`, kind: 'blocked' };
    } else {
      next = { id: last.id, ball: { x: 50 + side * 6, y: 36 }, keeper: side * 6, message: `Saved! ${rival} score!`, kind: 'save' };
      setScore((s) => ({ ...s, rival: s.rival + 1 }));
    }
    setShot(next);
    window.setTimeout(next.kind === 'save' || next.kind === 'stopped' || next.kind === 'blocked' ? sounds.save : sounds.goal, 250);
    // onStat is stable for the session; only react to new answers.
  }, [last?.id]);

  return (
    <div className="pitch">
      <div className="scoreboard">
        <span>You {score.goals}</span>
        <span>⭐ {score.top}</span>
        <span>
          {rival} {score.rival}
        </span>
      </div>
      <svg className="goal" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id="net" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M0 0 L12 12 M12 0 L0 12" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="20" y="8" width="260" height="104" fill="url(#net)" />
        <path d="M20 112 V8 H280 V112" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      </svg>
      {/* Not keyed by shot, so the keeper glides back to center and dives from there. */}
      <div
        className="keeper"
        style={{ left: `${50 + (shot?.keeper ?? 0)}%`, transform: `translateX(-50%) rotate(${(shot?.keeper ?? 0) * 2}deg)` }}
        aria-hidden="true"
      >
        🧤
      </div>
      <div
        key={`b${shot?.id ?? 0}`}
        className={`ball ${shot ? (shot.kind === 'power' ? 'ball-kicked ball-power' : 'ball-kicked') : ''}`}
        style={{ ...ballStyle, ...(shot ? { left: `${shot.ball.x}%`, top: `${shot.ball.y}%` } : {}) }}
        aria-hidden="true"
      >
        ⚽
      </div>
      {(shot?.kind === 'top' || shot?.kind === 'power') && <Confetti key={`c${shot.id}`} count={shot.kind === 'power' ? 50 : 30} />}
      {shot && (
        <div key={`m${shot.id}`} className={`shot-message shot-${shot.kind === 'power' ? 'top' : shot.kind === 'stopped' || shot.kind === 'blocked' ? 'late' : shot.kind}`} role="status">
          {shot.message}
        </div>
      )}
    </div>
  );
}
