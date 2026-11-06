import { DragonState, Stage } from './dragons';

// The hatchery meadow: every dragon the kid has found lives here and gets on
// with its day. Each dragon has one thing it's doing (walking somewhere,
// napping, playing with a friend...) and a time when it's done. When that time
// comes, `step` picks the next thing. Movement itself is drawn by the browser
// (a CSS transition from where the dragon was to where it's going), so this
// file only decides where to go and how long it takes.
//
// Positions are percentages of the meadow: x from left to right, y from the
// back of the meadow (top, far away) to the front (bottom, close up).

export type Activity =
  | 'idle' // standing and looking around
  | 'walk' // on the way somewhere
  | 'nap' // asleep, with a Zzz
  | 'play' // hopping about with a friend
  | 'happy' // just got tapped
  | 'wobble' // an egg rocking in the nest
  | 'fetch' // got the ball!
  // Things to do with what the kid bought for the meadow:
  | 'munch' // eating berries
  | 'splash' // splashing in the pond
  | 'warm' // warming up by the campfire
  | 'bounce' // bouncing on the trampoline
  | 'dance'; // dancing to the drum

export type PlayKind = 'hop' | 'nuzzle' | 'roar';

export interface Critter {
  id: number; // species id
  stage: Stage;
  x: number;
  y: number;
  facing: 1 | -1; // 1 = looking right, as the drawings do
  moveMs: number; // how long the walk to (x, y) takes
  activity: Activity;
  until: number; // when the current activity ends, in ms
  partner?: number; // who it's playing with
  play?: PlayKind;
  then?: { activity: Activity; ms: number; partner?: number; play?: PlayKind; faceX?: number; party?: boolean }; // what to do on arrival
}

export interface Ball {
  x: number;
  y: number;
  chaser?: number; // which dragon is running for it
}

export const GROUND = { left: 8, right: 92, back: 48, front: 86 };
// The nest, bottom left, where eggs wait to hatch.
export const NEST = { x: 14, y: 80 };

const SPEED: Partial<Record<Stage, number>> = { hatchling: 10, young: 14, grown: 17 }; // % per second
// Big sleepy dragons nap a lot more than the others.
const SLEEPY = new Set([1, 10]);

export type Rand = () => number;

// Things for the meadow, bought in the shop. Each one sits in its own spot and
// gives the dragons something new to do. The ids match the shop's item ids.
export interface MeadowThing {
  id: string;
  x: number;
  y: number;
  activity: Activity; // what a dragon does there
  ms: [number, number]; // for how long
  room: number; // how many dragons fit around it at once
}

export const THINGS: MeadowThing[] = [
  { id: 'meadow-berries', x: 88, y: 62, activity: 'munch', ms: [3000, 5000], room: 2 },
  { id: 'meadow-pond', x: 70, y: 80, activity: 'splash', ms: [3000, 5500], room: 3 },
  { id: 'meadow-cloud', x: 30, y: 58, activity: 'nap', ms: [10000, 18000], room: 3 },
  { id: 'meadow-campfire', x: 52, y: 66, activity: 'warm', ms: [5000, 9000], room: 4 },
  { id: 'meadow-trampoline', x: 40, y: 80, activity: 'bounce', ms: [2500, 4000], room: 1 },
  { id: 'meadow-drum', x: 62, y: 52, activity: 'dance', ms: [2500, 4000], room: 1 },
];

export const thingById = (id: string) => THINGS.find((t) => t.id === id);

// The spot next to a thing where a dragon stands to use it. The trampoline is
// used right on top, the drum from just behind it, and the rest have dragons
// gathered around.
function spotAt(t: MeadowThing, rand: Rand): { x: number; y: number } {
  if (t.id === 'meadow-trampoline') return { x: t.x, y: t.y + 1 };
  if (t.id === 'meadow-drum') return { x: t.x - 7, y: t.y };
  const side = rand() < 0.5 ? -1 : 1;
  return { x: t.x + side * between(rand, 6, 10), y: t.y + between(rand, 0, 4) };
}

// How many dragons are at (or on their way to) a thing.
const usersOf = (critters: Critter[], t: MeadowThing) =>
  critters.filter((c) => (c.then?.activity === t.activity || c.activity === t.activity) && Math.hypot(c.x - t.x, c.y - t.y) < 14).length;

function goUse(c: Critter, t: MeadowThing, now: number, rand: Rand): Critter {
  const { x, y } = spotAt(t, rand);
  return walkTo(c, x, y, now, { activity: t.activity, ms: between(rand, ...t.ms), faceX: t.x });
}

const between = (rand: Rand, lo: number, hi: number) => lo + rand() * (hi - lo);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function walkMs(c: Pick<Critter, 'stage' | 'x' | 'y'>, x: number, y: number): number {
  const speed = SPEED[c.stage] ?? 10;
  const dist = Math.hypot(x - c.x, (y - c.y) * 1.6); // the meadow is wider than it is deep
  return Math.round((dist / speed) * 1000);
}

// Where the nth egg sits in the nest.
export function nestSpot(n: number): { x: number; y: number } {
  return { x: NEST.x - 4 + (n % 3) * 5, y: NEST.y - 3 + Math.floor(n / 3) * 4 };
}

// Everyone's starting places, spread out across the meadow.
export function startMeadow(dragons: DragonState[], now: number, rand: Rand): Critter[] {
  let eggs = 0;
  return dragons
    .filter((d) => d.stage !== 'none')
    .map((d) => {
      const spot = d.stage === 'egg' ? nestSpot(eggs++) : { x: between(rand, 28, GROUND.right), y: between(rand, GROUND.back, GROUND.front) };
      return {
        id: d.species.id,
        stage: d.stage,
        ...spot,
        facing: rand() < 0.5 ? 1 : -1,
        moveMs: 0,
        activity: 'idle' as Activity,
        until: now + between(rand, 300, 2500),
      };
    });
}

const canPlay = (c: Critter, now: number) => c.stage !== 'egg' && c.until <= now && !c.then && c.activity !== 'fetch';

// Hatched dragons stay out of the nest so the eggs can be seen.
export function offNest(x: number, y: number): number {
  return y > NEST.y - 12 && x < NEST.x + 14 ? NEST.x + 14 : x;
}

function walkTo(c: Critter, x: number, y: number, now: number, then?: Critter['then']): Critter {
  y = clamp(y, GROUND.back, GROUND.front);
  x = offNest(clamp(x, GROUND.left, GROUND.right), y);
  const ms = walkMs(c, x, y);
  return {
    ...c,
    x,
    y,
    facing: Math.abs(x - c.x) < 0.5 ? c.facing : x > c.x ? 1 : -1,
    moveMs: ms,
    activity: 'walk',
    until: now + ms,
    partner: undefined,
    play: undefined,
    then,
  };
}

// Pick what one dragon does next, on its own.
function nextAlone(c: Critter, now: number, rand: Rand, night: boolean, things: MeadowThing[], everyone: Critter[]): Critter {
  const base = { ...c, moveMs: 0, partner: undefined, play: undefined, then: undefined };
  if (c.stage === 'egg') {
    return rand() < 0.35 ? { ...base, activity: 'wobble', until: now + 1200 } : { ...base, activity: 'idle', until: now + between(rand, 2000, 6000) };
  }
  const has = (id: string) => things.find((t) => t.id === id && usersOf(everyone, t) < t.room);
  const fire = has('meadow-campfire');
  // At night, a campfire keeps dragons up: they gather round it instead of sleeping.
  if (night && fire && rand() < 0.45) return goUse(c, fire, now, rand);
  const napChance = (SLEEPY.has(c.id) ? 0.3 : 0.12) + (night ? (things.some((t) => t.id === 'meadow-campfire') ? 0.1 : 0.35) : 0);
  const r = rand();
  if (r < napChance && c.activity !== 'nap') {
    // With a cloud bed, sleepy dragons go and curl up on it for a long nap.
    const bed = has('meadow-cloud');
    if (bed) return goUse(c, bed, now, rand);
    return { ...base, activity: 'nap', until: now + between(rand, 6000, 14000) };
  }
  // Off to try one of the things in the meadow.
  const free = things.filter((t) => t.id !== 'meadow-cloud' && usersOf(everyone, t) < t.room);
  if (free.length && rand() < 0.4) return goUse(c, free[Math.floor(rand() * free.length)], now, rand);
  if (r < napChance + 0.2) return { ...base, activity: 'idle', facing: rand() < 0.5 ? 1 : -1, until: now + between(rand, 1200, 3500) };
  // A stroll to somewhere nearby.
  return walkTo(c, c.x + between(rand, -30, 30), c.y + between(rand, -14, 14), now, { activity: 'idle', ms: between(rand, 600, 2000) });
}

// Move the meadow on to `now`: everyone whose activity is over picks the next one.
export function step(critters: Critter[], now: number, rand: Rand, night = false, placed: string[] = []): Critter[] {
  const things = placed.map(thingById).filter((t): t is MeadowThing => !!t);
  // Every so often the drum starts a dance party for everyone who's awake.
  if (things.some((t) => t.id === 'meadow-drum') && rand() < 0.006) return danceParty(critters, now);
  const out = critters.map((c) => ({ ...c }));
  const byId = new Map(out.map((c) => [c.id, c]));
  let party = false;
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (c.until > now) continue;
    // Arrived somewhere with a plan.
    if (c.then) {
      const { activity, ms, partner, play, faceX } = c.then;
      if (c.then.party) party = true; // reached the drum: everybody dance!
      const friend = partner !== undefined ? byId.get(partner) : undefined;
      const lookAt = friend?.x ?? faceX;
      const facing = lookAt !== undefined && Math.abs(lookAt - c.x) > 0.5 ? (lookAt > c.x ? 1 : -1) : c.facing;
      out[i] = { ...c, activity, until: now + ms, partner, play, facing, moveMs: 0, then: undefined };
      continue;
    }
    // Sometimes two free dragons meet up and play together.
    if (c.stage !== 'egg' && rand() < (night ? 0.1 : 0.3)) {
      const friends = out.filter((o) => o.id !== c.id && canPlay(o, now));
      if (friends.length) {
        const friend = friends[Math.floor(rand() * friends.length)];
        const mx = clamp((c.x + friend.x) / 2, GROUND.left + 6, GROUND.right - 6);
        const my = clamp((c.y + friend.y) / 2, GROUND.back, GROUND.front);
        const left = c.x <= friend.x ? c : friend;
        const right = left === c ? friend : c;
        const kinds: PlayKind[] = c.stage === 'hatchling' || friend.stage === 'hatchling' ? ['hop', 'nuzzle'] : ['hop', 'nuzzle', 'roar'];
        const play = kinds[Math.floor(rand() * kinds.length)];
        const meetL = walkTo(left, mx - 6, my, now);
        const meetR = walkTo(right, mx + 6, my, now);
        // Both play until the same moment, starting when each arrives.
        const done = now + Math.max(meetL.moveMs, meetR.moveMs) + 3500;
        for (const [who, walk] of [
          [left, meetL],
          [right, meetR],
        ] as const) {
          const other = who === left ? right : left;
          const j = out.indexOf(who);
          out[j] = { ...walk, then: { activity: 'play', ms: done - walk.until, partner: other.id, play } };
          byId.set(who.id, out[j]);
        }
        continue;
      }
    }
    out[i] = nextAlone(c, now, rand, night, things, out);
    byId.set(c.id, out[i]);
  }
  return party ? danceParty(out, now) : out;
}

// Everyone who's hatched and awake stops what they're doing and dances.
export function danceParty(critters: Critter[], now: number): Critter[] {
  return critters.map((c) =>
    c.stage === 'egg' || c.activity === 'nap' || c.activity === 'fetch' || c.then?.activity === 'fetch'
      ? c
      : { ...c, activity: 'dance', until: now + 4500, moveMs: 0, partner: undefined, play: undefined, then: undefined },
  );
}

// A tap on a thing in the meadow sends the selected dragon over to use it
// (waking it if it was asleep). With no hatched dragon selected, the nearest
// awake one goes. A dragon sent to the drum starts a dance party when it
// gets there.
export function tapThing(critters: Critter[], id: string, now: number, rand: Rand, selected?: number): Critter[] {
  const t = thingById(id);
  if (!t) return critters;
  const hatched = critters.filter((c) => c.stage !== 'egg');
  const chosen = hatched.find((c) => c.id === selected);
  const awake = hatched.filter((c) => c.activity !== 'fetch' && c.then?.activity !== 'fetch');
  const score = (c: Critter) => Math.hypot(c.x - t.x, c.y - t.y) + (c.activity === 'nap' ? 1000 : 0) + (c.activity === t.activity ? 2000 : 0);
  const pick = chosen ?? (awake.length ? awake.reduce((a, b) => (score(b) < score(a) ? b : a)) : undefined);
  if (!pick) return critters;
  return tapDragon(critters, pick.id, now).map((c) => {
    if (c.id !== pick.id) return c;
    const go = goUse(c, t, now, rand);
    return t.id === 'meadow-drum' && go.then ? { ...go, then: { ...go.then, ms: 4500, party: true } } : go;
  });
}

// A tap on a dragon: it wakes up (if it was asleep) and is very pleased to see you.
export function tapDragon(critters: Critter[], id: number, now: number): Critter[] {
  return critters.map((c) => {
    if (c.id === id) return { ...c, activity: c.stage === 'egg' ? 'wobble' : 'happy', until: now + 1600, moveMs: 0, partner: undefined, play: undefined, then: undefined };
    // A friend left mid-game just goes back to what it was doing.
    if (c.partner === id) return { ...c, until: Math.min(c.until, now), partner: undefined, play: undefined };
    if (c.then?.partner === id) return { ...c, then: { activity: 'idle', ms: 800 } };
    return c;
  });
}

// A tap on the grass throws a ball there, and the nearest awake hatched dragon
// runs to fetch it. Returns the ball with its chaser, or no chaser if nobody can.
export function throwBall(critters: Critter[], x: number, y: number, now: number): { critters: Critter[]; ball: Ball } {
  x = clamp(x, GROUND.left, GROUND.right);
  y = clamp(y, GROUND.back, GROUND.front);
  const hatched = critters.filter((c) => c.stage !== 'egg');
  if (!hatched.length) return { critters, ball: { x, y } };
  // Awake dragons go first; a napper only goes if nobody else is around.
  const score = (c: Critter) => Math.hypot(c.x - x, c.y - y) + (c.activity === 'nap' ? 1000 : 0);
  const chaser = hatched.reduce((a, b) => (score(b) < score(a) ? b : a));
  const next = tapDragon(critters, chaser.id, now).map((c) =>
    c.id === chaser.id ? walkTo(c, x - 3 * (x >= c.x ? 1 : -1), y, now, { activity: 'fetch', ms: 1800 }) : c,
  );
  return { critters: next, ball: { x, y, chaser: chaser.id } };
}

// Keep the meadow in step with the hatchery: new eggs appear in the nest, and
// a dragon that grew keeps its place but changes its stage.
export function syncMeadow(critters: Critter[], dragons: DragonState[], now: number, rand: Rand): Critter[] {
  const found = dragons.filter((d) => d.stage !== 'none');
  const have = new Map(critters.map((c) => [c.id, c]));
  let eggs = critters.filter((c) => c.stage === 'egg').length;
  return found.map((d) => {
    const c = have.get(d.species.id);
    if (c) return c.stage === d.stage ? c : { ...c, stage: d.stage, activity: 'happy', until: now + 1600, then: undefined };
    const [fresh] = startMeadow([d], now, rand);
    return d.stage === 'egg' ? { ...fresh, ...nestSpot(eggs++) } : fresh;
  });
}

// One line saying what a dragon is up to, for screen readers.
export function doingText(c: Critter): string {
  switch (c.activity) {
    case 'walk':
      switch (c.then?.activity) {
        case 'play':
          return 'going to play with a friend';
        case 'fetch':
          return 'running for the ball';
        case 'nap':
          return 'off to the cloud bed for a nap';
        case 'munch':
          return 'off to eat berries';
        case 'splash':
          return 'off to the pond';
        case 'warm':
          return 'off to the campfire';
        case 'bounce':
          return 'off to the trampoline';
        case 'dance':
          return 'off to play the drum';
        default:
          return 'going for a walk';
      }
    case 'munch':
      return 'eating berries';
    case 'splash':
      return 'splashing in the pond';
    case 'warm':
      return 'warming up by the campfire';
    case 'bounce':
      return 'bouncing on the trampoline';
    case 'dance':
      return 'dancing';
    case 'nap':
      return 'napping';
    case 'play':
      return 'playing with a friend';
    case 'happy':
      return 'happy to see you';
    case 'fetch':
      return 'got the ball';
    case 'wobble':
      return 'wobbling';
    default:
      return c.stage === 'egg' ? 'resting in the nest' : 'looking around';
  }
}

// Night time on the kid's clock, when the meadow gets dark and dragons get sleepy.
export const isNight = (date: Date) => date.getHours() >= 20 || date.getHours() < 7;
