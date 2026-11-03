import { useEffect, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import type { StatKey } from './PenaltyKicks';
import { sounds } from '../sound';
import { Confetti } from '../components/Confetti';

const ALL_SPOTS = ['🛏️', '🛋️', '🚪', '🧺', '🪴', '📦', '🧥', '🪑', '🛁', '🧸', '🗄️', '🎹', '🧳', '🖼️', '🪟', '🛒'];
const TICKLES_TO_ATTACK = 3;

// The house grows as the kid gets better at finding the monster.
export const houseSize = (monstersFoundTotal: number) => (monstersFoundTotal < 3 ? 3 : 4);

type Mark = 'empty' | 'hot' | 'warm' | 'cold' | 'found';

const MARK_ICON: Record<Mark, string> = { empty: '✖', hot: '🔥', warm: '🌡️', cold: '❄️', found: '' };

const CLUE: Record<string, string> = {
  hot: "Hot! It's right next to this spot!",
  warm: "Warm... it's close.",
  cold: "Cold. It's far from here.",
};

// Tickle hider: the Tickle Monster hides somewhere in a dark house.
// Each right answer charges the lantern for one search. A fast answer makes it
// bright enough to show a warmer/colder clue about where the monster is.
// Wrong answers let the monster creep closer. Three, and it's a tickle attack!
interface Props extends StageProps {
  onStat: (key: StatKey) => void;
  monstersFoundTotal: number;
}

export function LanternHunt({ last, waiting, resume, onStat, monstersFoundTotal }: Props) {
  const [size] = useState(() => houseSize(monstersFoundTotal));
  const spots = ALL_SPOTS.slice(0, size * size);
  const randomSpot = (avoid = -1) => {
    let s = avoid;
    while (s === avoid) s = Math.floor(Math.random() * spots.length);
    return s;
  };
  const distance = (a: number, b: number) =>
    Math.abs((a % size) - (b % size)) + Math.abs(Math.floor(a / size) - Math.floor(b / size));

  const [monster, setMonster] = useState(() => randomSpot());
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [creep, setCreep] = useState(0);
  const [found, setFound] = useState(0);
  const [message, setMessage] = useState('The Tickle Monster is hiding. Answer to light your lantern!');
  const [attack, setAttack] = useState(0);
  const [celebrate, setCelebrate] = useState(false);

  const bright = Boolean(last?.correct && last.fast);

  useEffect(() => {
    if (!last) return;
    if (last.correct) {
      setMessage(last.fast ? 'Bright lantern! Search a spot for a warmer/colder clue.' : 'Lantern lit. Tap a hiding spot to search.');
      return;
    }
    const nextCreep = creep + 1;
    if (nextCreep >= TICKLES_TO_ATTACK) {
      setAttack((n) => n + 1);
      sounds.giggle();
      onStat('tickles');
      setMessage('TICKLE ATTACK! The monster ran off to hide again...');
      setCreep(0);
      setMarks({});
      setMonster((m) => randomSpot(m));
    } else {
      setCreep(nextCreep);
      setMessage('Creak... the Tickle Monster is creeping closer!');
    }
    // React only to new answers.
  }, [last?.id]);

  const search = (spot: number) => {
    if (!waiting || marks[spot]) return;
    if (spot === monster) {
      sounds.found();
      setMarks({ ...marks, [spot]: 'found' });
      setFound((n) => n + 1);
      onStat('monstersFound');
      setMessage('FOUND YOU! Now it hides somewhere new...');
      setCelebrate(true);
      setTimeout(() => {
        setCelebrate(false);
        setMarks({});
        setCreep(0);
        setMonster((m) => randomSpot(m));
        resume();
      }, 1400);
      return;
    }
    sounds.search();
    const d = distance(spot, monster);
    const mark: Mark = !bright ? 'empty' : d === 1 ? 'hot' : d === 2 ? 'warm' : 'cold';
    setMarks({ ...marks, [spot]: mark });
    setMessage(bright ? CLUE[mark] : 'Nothing here... answer faster for a clue!');
    setTimeout(resume, 700);
  };

  return (
    <div className="house">
      {attack > 0 && (
        <div key={attack} className="tickle-overlay" aria-hidden="true">
          🤗 TICKLE TICKLE!
        </div>
      )}
      <div className="scoreboard">
        <span>🔦 Found {found}</span>
        <span className="creep" aria-label={`Monster closeness ${creep} of ${TICKLES_TO_ATTACK}`}>
          👣 {'●'.repeat(creep)}
          {'○'.repeat(TICKLES_TO_ATTACK - creep)}
        </span>
      </div>
      <div
        className={`rooms ${waiting ? 'rooms-ready' : ''} ${bright && waiting ? 'rooms-bright' : ''}`}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {spots.map((emoji, i) => {
          const mark = marks[i];
          return (
            <button
              key={i}
              type="button"
              className={`spot ${mark ? `spot-${mark}` : ''}`}
              onClick={() => search(i)}
              disabled={!waiting || Boolean(mark)}
              aria-label={`Hiding spot ${i + 1}`}
            >
              <span className="spot-emoji">{mark === 'found' ? '👾' : emoji}</span>
              {mark && mark !== 'found' && <span className="spot-mark">{MARK_ICON[mark]}</span>}
            </button>
          );
        })}
      </div>
      {celebrate && <Confetti key={`found${found}`} count={36} />}
      <p className={`lantern-message ${celebrate ? 'celebrate' : ''}`} role="status">
        {message}
      </p>
    </div>
  );
}
