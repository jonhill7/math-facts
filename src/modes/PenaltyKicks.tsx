import { useEffect, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import { sounds } from '../sound';
import { Confetti } from '../components/Confetti';

export type StatKey = 'goals' | 'topCorners' | 'monstersFound' | 'tickles';

export const RIVALS = [
  'Thunder Toads',
  'Rocket Raccoons',
  'Volcano Vultures',
  'Midnight Moose',
  'Galaxy Goats',
  'Turbo Turtles',
  'Blizzard Badgers',
  'Pickle Pirates',
];

export const pickRival = () => RIVALS[Math.floor(Math.random() * RIVALS.length)];

interface Shot {
  id: number;
  ball: { x: number; y: number }; // where the ball ends, in % of the pitch
  keeper: number; // keeper's dive, in % left/right of center
  message: string;
  kind: 'top' | 'goal' | 'save';
}

// A penalty shootout match against a rival team. Every answer is a kick.
// Right and fast: top corner. Right but slow: a low shot that just sneaks in.
// Wrong: the keeper saves it and the rivals score on the counter-attack.
interface Props extends StageProps {
  onStat: (key: StatKey) => void;
  rival: string;
}

export function PenaltyKicks({ last, onStat, rival }: Props) {
  const [shot, setShot] = useState<Shot | null>(null);
  const [score, setScore] = useState({ goals: 0, rival: 0, top: 0 });

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
      next = { id: last.id, ball: { x: 50 + side * 6, y: 36 }, keeper: side * 6, message: `Saved! ${rival} score!`, kind: 'save' };
      setScore((s) => ({ ...s, rival: s.rival + 1 }));
    }
    setShot(next);
    window.setTimeout(next.kind === 'save' ? sounds.save : sounds.goal, 250);
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
      {shot?.kind === 'top' && <Confetti key={`c${shot.id}`} count={30} />}
      {shot && (
        <div key={`m${shot.id}`} className={`shot-message shot-${shot.kind}`} role="status">
          {shot.message}
        </div>
      )}
    </div>
  );
}
