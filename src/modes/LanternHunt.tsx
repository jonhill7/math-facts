import { useEffect, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import type { StatKey } from './PenaltyKicks';
import { sounds } from '../sound';

const SPOTS = ['🛏️', '🛋️', '🚪', '🧺', '🪴', '📦', '🧥', '🪑', '🛁'];
const SIZE = 3; // 3 x 3 house
const TICKLES_TO_ATTACK = 3;

type Mark = 'empty' | 'footprints' | 'found';

const randomSpot = (avoid = -1) => {
  let s = avoid;
  while (s === avoid) s = Math.floor(Math.random() * SPOTS.length);
  return s;
};

const nextTo = (a: number, b: number) =>
  Math.abs((a % SIZE) - (b % SIZE)) + Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) === 1;

// Tickle hider: the Tickle Monster hides somewhere in a dark house.
// Each right answer charges the lantern for one search. A fast answer makes it
// bright enough to spot footprints when the monster is next door.
// Wrong answers let the monster creep closer. Three, and it's a tickle attack!
export function LanternHunt({ last, waiting, resume, onStat }: StageProps & { onStat: (key: StatKey) => void }) {
  const [monster, setMonster] = useState(randomSpot);
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
      setMessage(last.fast ? 'Bright lantern! Tap a hiding spot to search.' : 'Lantern lit. Tap a hiding spot to search.');
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
    const clue = bright && nextTo(spot, monster);
    setMarks({ ...marks, [spot]: clue ? 'footprints' : 'empty' });
    setMessage(clue ? 'Footprints! The monster is right next to this spot.' : 'Nothing here...');
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
      <div className={`rooms ${waiting ? 'rooms-ready' : ''} ${bright && waiting ? 'rooms-bright' : ''}`}>
        {SPOTS.map((emoji, i) => {
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
              {mark === 'footprints' && <span className="spot-mark">👣</span>}
              {mark === 'empty' && <span className="spot-mark">✖</span>}
            </button>
          );
        })}
      </div>
      <p className={`lantern-message ${celebrate ? 'celebrate' : ''}`} role="status">
        {message}
      </p>
    </div>
  );
}
