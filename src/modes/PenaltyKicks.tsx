import { useEffect, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import { sounds } from '../sound';

export type StatKey = 'goals' | 'topCorners' | 'monstersFound' | 'tickles';

interface Shot {
  id: number;
  ball: { x: number; y: number }; // where the ball ends, in % of the pitch
  keeper: number; // keeper's dive, in % left/right of center
  message: string;
  kind: 'top' | 'goal' | 'save';
}

// Every answer is a penalty kick. Right and fast: top corner. Right but slow:
// a low shot that just sneaks past the keeper. Wrong: the keeper saves it.
export function PenaltyKicks({ last, onStat }: StageProps & { onStat: (key: StatKey) => void }) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [score, setScore] = useState({ goals: 0, saves: 0, top: 0 });

  useEffect(() => {
    if (!last) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    let next: Shot;
    if (last.correct && last.fast) {
      next = { id: last.id, ball: { x: 50 + side * 36, y: 14 }, keeper: -side * 22, message: 'TOP CORNER!', kind: 'top' };
      onStat('goals');
      onStat('topCorners');
      setScore((s) => ({ ...s, goals: s.goals + 1, top: s.top + 1 }));
    } else if (last.correct) {
      next = { id: last.id, ball: { x: 50 + side * 28, y: 40 }, keeper: side * 16, message: 'Goal!', kind: 'goal' };
      onStat('goals');
      setScore((s) => ({ ...s, goals: s.goals + 1 }));
    } else {
      next = { id: last.id, ball: { x: 50 + side * 6, y: 36 }, keeper: side * 6, message: 'Saved!', kind: 'save' };
      setScore((s) => ({ ...s, saves: s.saves + 1 }));
    }
    setShot(next);
    window.setTimeout(next.kind === 'save' ? sounds.save : sounds.goal, 250);
    // onStat is stable for the session; only react to new answers.
  }, [last?.id]);

  return (
    <div className="pitch">
      <div className="scoreboard">
        <span>⚽ Goals {score.goals}</span>
        <span>⭐ Top corners {score.top}</span>
        <span>🧤 Saves {score.saves}</span>
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
      <div
        key={`k${shot?.id ?? 0}`}
        className="keeper"
        style={{ left: `${50 + (shot?.keeper ?? 0)}%`, transform: `translateX(-50%) rotate(${(shot?.keeper ?? 0) * 2}deg)` }}
        aria-hidden="true"
      >
        🧤
      </div>
      <div
        key={`b${shot?.id ?? 0}`}
        className={`ball ${shot ? 'ball-kicked' : ''}`}
        style={shot ? { left: `${shot.ball.x}%`, top: `${shot.ball.y}%` } : undefined}
        aria-hidden="true"
      >
        ⚽
      </div>
      {shot && (
        <div key={`m${shot.id}`} className={`shot-message shot-${shot.kind}`} role="status">
          {shot.message}
        </div>
      )}
    </div>
  );
}
