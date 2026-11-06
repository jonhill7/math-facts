import { PointerEvent, useEffect, useRef, useState } from 'react';
import { StageProps } from '../components/PracticeSession';
import type { StatKey } from './PenaltyKicks';
import { sounds } from '../sound';
import { Confetti } from '../components/Confetti';
import { DEFAULT_BEAM_RGB } from '../engine/shop';
import type { Ability } from '../engine/abilities';
import { seconds } from '../engine/speed';
import { nightVisionClue } from '../engine/lantern';

const ALL_SPOTS = ['🛏️', '🛋️', '🚪', '🧺', '🪴', '📦', '🧥', '🪑', '🛁', '🧸', '🗄️', '🎹', '🧳', '🖼️', '🪟', '🛒'];
const ATTIC_SPOTS = ['🕯️', '📚', '🪆', '🧶', '🎻', '🪞', '⏰', '🎲', '🧳', '📦', '🪑', '🖼️', '🧸', '🛏️', '🗄️', '🧥', '🪟', '🎹', '🧺', '🪴', '🚪', '🛋️', '🛁', '🛒', '🎩'];
const FLOORS = ['Downstairs', 'Upstairs', 'The attic'];
const MAX_SIZE = 5;

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
// Wrong answers let the monster creep closer and sneak to a nearby spot, so old
// clues go stale. Three, and it's a tickle attack! Each time you find it, the
// chase moves up a floor and the house gets bigger. A power move is a super
// lantern that searches a spot and everything around it.
interface Props extends StageProps {
  onStat: (key: StatKey) => void;
  monstersFoundTotal: number;
  shield: boolean; // the companion's Shield power: the first miss doesn't count
  shieldName: string;
  beamRgb?: string;
  ability?: Ability; // the companion's power
}

export function LanternHunt({ last, waiting, resume, onStat, monstersFoundTotal, shield, shieldName, beamRgb = DEFAULT_BEAM_RGB, ability }: Props) {
  const TICKLES_TO_ATTACK = ability === 'frost' ? 4 : 3;
  const [hunt, setHunt] = useState(0); // goes up each time the monster hides somewhere new
  const [floor, setFloor] = useState(0);
  const [startSize] = useState(() => houseSize(monstersFoundTotal));
  const size = Math.min(startSize + floor, MAX_SIZE);
  const spots = (floor === 0 ? ALL_SPOTS : ATTIC_SPOTS).slice(0, size * size);
  const shieldUsed = useRef(false);
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

  // Second Look makes every right answer bright enough for a clue.
  const bright = Boolean(last?.correct && (last.fast || ability === 'secondLook'));

  // One search per right answer. A ref (not state) so that a second tap
  // landing before React re-renders is still blocked.
  const searchedFor = useRef<number | null>(null);
  const [searched, setSearched] = useState<number | null>(null);
  const canSearch = waiting && last !== null && searched !== last.id;

  // The lantern's beam: where it points (in % of the house) and how wide it is.
  // It follows the finger or mouse while a search is ready.
  const roomsRef = useRef<HTMLDivElement>(null);
  const [beam, setBeam] = useState({ x: 50, y: 50 });
  const beamSize = canSearch ? (last?.power ? 60 : bright ? 46 : 30) : 14;
  const aim = (e: PointerEvent) => {
    const box = roomsRef.current?.getBoundingClientRect();
    if (!box || !canSearch) return;
    setBeam({ x: ((e.clientX - box.left) / box.width) * 100, y: ((e.clientY - box.top) / box.height) * 100 });
  };
  const aimAtSpot = (spot: number) =>
    setBeam({ x: ((spot % size) + 0.5) * (100 / size), y: (Math.floor(spot / size) + 0.5) * (100 / size) });

  useEffect(() => {
    if (!last) return;
    if (last.correct) {
      setMessage(
        last.power
          ? 'SUPER LANTERN! Search a spot and everything around it.'
          : last.fast
            ? 'Bright lantern! Search a spot for a warmer/colder clue.'
            : 'Lantern lit. Tap a hiding spot to search.',
      );
      return;
    }
    if (shield && !shieldUsed.current) {
      shieldUsed.current = true;
      setMessage(`🛡️ ${shieldName} scared the monster back! It didn't move.`);
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
      setHunt((h) => h + 1);
    } else {
      setCreep(nextCreep);
      if (ability === 'gust') {
        setMessage('Creak... it crept closer, but the Gust kept it from sneaking away!');
        return;
      }
      // It sneaks to a spot next door, so the old clues can't be trusted.
      setMonster((m) => {
        const near = spots.map((_, i) => i).filter((i) => distance(i, m) === 1);
        return near[Math.floor(Math.random() * near.length)];
      });
      setMarks({});
      setMessage('Creak... it crept closer and snuck to a spot nearby! Old clues are gone.');
    }
    // React only to new answers.
  }, [last?.id]);

  // Night Vision: each new hunt starts with one free warm or cold clue (never hot).
  useEffect(() => {
    if (ability !== 'nightVision') return;
    const { spot, clue } = nightVisionClue(size, monster);
    setMarks({ [spot]: clue });
  }, [hunt]);

  const clueFor = (spot: number): Mark => {
    const d = distance(spot, monster);
    return !bright ? 'empty' : d === 1 ? 'hot' : d === 2 ? 'warm' : 'cold';
  };

  const search = (spot: number) => {
    if (!waiting || !last || marks[spot] || searchedFor.current === last.id) return;
    searchedFor.current = last.id;
    setSearched(last.id);
    aimAtSpot(spot);
    // A super lantern searches the spot and every spot touching it (two rings out with Blaze).
    const reach = ability === 'blaze' ? 2 : 1;
    const area = last.power
      ? spots.map((_, i) => i).filter((i) => Math.abs((i % size) - (spot % size)) <= reach && Math.abs(Math.floor(i / size) - Math.floor(spot / size)) <= reach)
      : [spot];
    if (last.power) onStat('powers');
    if (area.includes(monster)) {
      sounds.found();
      setMarks({ ...marks, [monster]: 'found' });
      setFound((n) => n + 1);
      onStat('monstersFound');
      const nextFloor = Math.min(floor + 1, FLOORS.length - 1);
      setMessage(nextFloor > floor ? `FOUND YOU! It ran off to ${FLOORS[nextFloor].toLowerCase()}...` : 'FOUND YOU! Now it hides somewhere new...');
      setCelebrate(true);
      setTimeout(() => {
        setCelebrate(false);
        setMarks({});
        setCreep(0);
        const nextSize = Math.min(startSize + nextFloor, MAX_SIZE);
        setFloor(nextFloor);
        setMonster(Math.floor(Math.random() * nextSize * nextSize));
        setHunt((h) => h + 1);
        resume();
      }, 1400);
      return;
    }
    sounds.search();
    const found: Record<number, Mark> = {};
    for (const i of area) if (!marks[i]) found[i] = last.power ? 'empty' : clueFor(i);
    if (last.power) found[spot] = bright ? clueFor(spot) : 'empty';
    setMarks({ ...marks, ...found });
    setMessage(last.power ? `SUPER LANTERN! ${area.length} spots searched. ${bright ? CLUE[clueFor(spot)] : ''}` : bright ? CLUE[clueFor(spot)] : 'Nothing here... answer faster for a clue!');
    setTimeout(resume, last.power ? 1100 : 700);
  };

  return (
    <div className="house">
      {attack > 0 && (
        <div key={attack} className="tickle-overlay" aria-hidden="true">
          🤗 TICKLE TICKLE!
        </div>
      )}
      <div className="scoreboard">
        <span>
          🔦 Found {found} · {FLOORS[floor]}
        </span>
        <span className="creep" aria-label={`Monster closeness ${creep} of ${TICKLES_TO_ATTACK}`}>
          👣 {'●'.repeat(creep)}
          {'○'.repeat(TICKLES_TO_ATTACK - creep)}
        </span>
      </div>
      <div
        ref={roomsRef}
        key={`floor${floor}`}
        className={`rooms ${canSearch ? 'rooms-ready' : ''} ${bright && canSearch ? 'rooms-bright' : ''} ${last?.fast && canSearch ? 'rooms-flash' : ''}`}
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onPointerMove={aim}
      >
        <div
          className="darkness"
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at ${beam.x}% ${beam.y}%, rgba(${beamRgb}, 0.22) 0%, rgba(${beamRgb}, 0.08) ${beamSize * 0.6}%, rgba(4, 7, 18, 0.82) ${beamSize}%)`,
          }}
        />
        {spots.map((emoji, i) => {
          const mark = marks[i];
          return (
            <button
              key={i}
              type="button"
              className={`spot ${mark ? `spot-${mark}` : ''}`}
              onClick={() => search(i)}
              disabled={!canSearch || Boolean(mark)}
              aria-label={`Hiding spot ${i + 1}`}
            >
              <span className="spot-emoji">{mark === 'found' ? '👾' : emoji}</span>
              {mark && mark !== 'found' && <span className="spot-mark">{MARK_ICON[mark]}</span>}
            </button>
          );
        })}
      </div>
      {last?.correct && (
        // Right on submit: did that answer beat the speed goal? A fast answer is
        // what makes the lantern bright enough for a clue, so say it loudly.
        <div
          key={`speed${last.id}`}
          className={`lantern-speed ${last.fast ? 'lantern-speed-fast' : 'lantern-speed-slow'}`}
          role="status"
          aria-label={last.fast ? `Fast! ${seconds(last.ms)} seconds beat the ${seconds(last.goalMs)} second goal` : `${seconds(last.ms)} seconds. Goal ${seconds(last.goalMs)} seconds`}
        >
          {last.fast ? (
            <>
              <strong>⚡ FAST! Bright lantern!</strong>
              <span>
                {seconds(last.ms)}s · beat the {seconds(last.goalMs)}s goal
              </span>
            </>
          ) : (
            <span>
              🐢 {seconds(last.ms)}s · goal {seconds(last.goalMs)}s{ability === 'secondLook' ? '' : ' for a clue'}
            </span>
          )}
        </div>
      )}
      {celebrate && <Confetti key={`found${found}`} count={36} />}
      <p className={`lantern-message ${celebrate ? 'celebrate' : ''}`} role="status">
        {message}
      </p>
    </div>
  );
}
