import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from './components/Confetti';
import { Dragon } from './components/Dragon';
import { dragonName, Hatchery, stageText } from './components/Hatchery';
import { MasteryMap, masteredCount } from './components/MasteryMap';
import { Badges } from './components/Badges';
import { BOSS_BONUS, PracticeSession, SessionSummary } from './components/PracticeSession';
import { Shop } from './components/Shop';
import { WorldTour } from './components/WorldTour';
import { ABILITY_INFO, activeAbility, bossForgives, bossMultiplier, chargeNeeded, extraClockMs, powerSize, questMultiplier, snackBonus, startCharge } from './engine/abilities';
import { Badge, BADGES, checkBadges } from './engine/badges';
import { bossFor, isBossGame, knownCount } from './engine/boss';
import { ALL_FACTS, Fact } from './engine/facts';
import { allDragons, companionFor, DragonState, feed, grewBetween, SNACKS_FAST, SNACKS_RIGHT, speciesById, STAGE_LEVEL } from './engine/dragons';
import { afterMatch, League, LEAGUE, rivalFor, shotClockMs, slowSaveChance } from './engine/league';
import { placeById } from './engine/places';
import { bumpQuest, Quest, QUEST_REWARD, QuestKey, questsFor, today } from './engine/quests';
import { recordAnswer } from './engine/scheduler';
import { speedGoalMs } from './engine/speed';
import { BALL_GLOW, balance, BEAM_RGB, GLOVE_FILTER, itemById } from './engine/shop';
import { practiced, streakStatus } from './engine/streak';
import { LanternHunt } from './modes/LanternHunt';
import { MatchScore, PenaltyKicks, SoccerProps, StatKey } from './modes/PenaltyKicks';
import { PenaltySaves } from './modes/PenaltySaves';
import { SkyRace } from './modes/SkyRace';
import { COURSES, courseFairMs, CourseId, courseOf, finishRace, Flap, ghostFlaps, nextRival, RaceKind, RaceResult, rivalFlaps, RIVALS, speedTitle } from './engine/race';
import { cloudEnabled, cloudStore, signInWithGoogle, signOutUser, User, watchUser } from './storage/firebase';
import { listGuests, localStore } from './storage/localStore';
import { ProgressStore, SaveData, Settings } from './storage/types';
import { setMuted, sounds } from './sound';

type Mode = 'soccer' | 'keeper' | 'lantern' | 'race';
const isSoccer = (m: Mode) => m === 'soccer' || m === 'keeper';

export const RACE_WIN_BONUS = 10; // snacks for beating a ghost or rival, or a solo gold

// A rival dragon drawn fully grown.
const rivalDragon = (species: number): DragonState => ({ species: speciesById(species), stage: 'grown', xp: 0, level: 10, into: 0, needed: 1 });

interface Boss {
  name: string;
  icon: string;
  facts: Fact[];
  forgive: number; // misses allowed (the Boss Breaker power)
  bonus: number; // snacks for beating it
}

type Screen =
  | { name: 'who' }
  | { name: 'home' }
  | { name: 'play'; mode: Mode; before: SaveData; boss?: Boss; race?: RaceKind; opponent?: number[] }
  | { name: 'done'; mode: Mode; boss?: Boss; summary: SessionSummary; grew: DragonState[]; rival: string; score: MatchScore; league?: { before: League; after: League }; quests: Quest[]; race?: RaceKind; raceResult?: RaceResult; badges: Badge[] }
  | { name: 'badges' }
  | { name: 'map' }
  | { name: 'hatchery' }
  | { name: 'shop' }
  | { name: 'world' };

const companionOf = (d: SaveData) => companionFor(d.hoard, d.stats.snacks, d.companion);

// Add any badges the kid has reached. Badges once earned are kept forever.
function withBadges(d: SaveData): SaveData {
  const { earned } = checkBadges(d.badges, d, Date.now());
  return earned === d.badges ? d : { ...d, badges: earned };
}

// Snacks go to the companion as experience, and count toward the total that finds new eggs.
function eat(d: SaveData, snacks: number): SaveData {
  if (!snacks) return d;
  return { ...d, hoard: feed(d.hoard, companionOf(d).species.id, snacks), stats: { ...d.stats, snacks: d.stats.snacks + snacks } };
}

// Count something toward a stat and today's quests. Finished quests pay out snacks.
function count(d: SaveData, key: QuestKey, n = 1, stat?: keyof SaveData['stats']): SaveData {
  const { state, finished } = bumpQuest(d.quests, d.name, key, n, Date.now());
  const stats = { ...d.stats };
  if (stat) stats[stat] += n;
  return eat({ ...d, stats, quests: state }, finished.length * QUEST_REWARD * questMultiplier(activeAbility(companionOf(d))));
}

const QUEST_STATS: Partial<Record<StatKey, QuestKey>> = { saves: 'saves', topCorners: 'topCorners', monstersFound: 'monstersFound', powers: 'powers' };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<ProgressStore | null>(null);
  const [data, setData] = useState<SaveData | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'who' });
  const [error, setError] = useState('');
  const latest = useRef<SaveData | null>(null);
  latest.current = data;
  const matchScore = useRef<MatchScore>({ us: 0, them: 0 });
  const raceFlaps = useRef<Flap[]>([]);
  const onFlaps = useCallback((flaps: Flap[]) => {
    raceFlaps.current = flaps;
  }, []);
  setMuted(data?.settings.muted ?? false);

  // Signed in with Google: load that kid's progress from the cloud.
  useEffect(
    () =>
      watchUser((u) => {
        setUser(u);
        if (u) openStore(cloudStore(u));
      }),
    [],
  );

  const openStore = (s: ProgressStore) => {
    setStore(s);
    s.load()
      .then((d) => {
        loaded.current = d;
        // Saves from before badges get every badge they've already reached.
        setData(withBadges(d));
        setScreen({ name: 'home' });
      })
      .catch(() => setError('Could not load your progress. Check the internet connection and try again.'));
  };

  // Save shortly after each change, so a session doesn't write on every answer.
  const loaded = useRef<SaveData | null>(null);
  const saveSoon = useRef(false);
  useEffect(() => {
    if (!store || !data || data === loaded.current) return;
    const write = () => store.save(data).catch(() => setError('Progress did not save. Check the internet connection.'));
    if (saveSoon.current) {
      saveSoon.current = false;
      write();
      return;
    }
    const timer = window.setTimeout(write, 1500);
    return () => window.clearTimeout(timer);
  }, [store, data]);

  const update = useCallback((change: (d: SaveData) => SaveData, now = false) => {
    if (now) saveSoon.current = true;
    setData((d) => (d ? change(d) : d));
  }, []);

  const onAnswer = useCallback(
    (fact: Fact, correct: boolean, ms: number) =>
      update((d) => {
        // Games reward beating the fact's own speed goal. The fact map stays on
        // the flat speed-goal setting (3s by default), the fluency standard.
        const fast = correct && ms <= speedGoalMs(fact, d.settings.fastMs);
        const bonus = snackBonus(activeAbility(companionOf(d)));
        let next: SaveData = eat(
          { ...d, progress: { ...d.progress, [fact.id]: recordAnswer(d.progress[fact.id], correct, ms, Date.now(), d.settings.fastMs) } },
          correct ? (fast ? SNACKS_FAST : SNACKS_RIGHT) + bonus : 0,
        );
        if (correct) next = count(next, 'right');
        if (fast) next = count(next, 'fast');
        return next;
      }),
    [update],
  );

  const onStat = useCallback(
    (key: StatKey) =>
      update((d) => {
        const quest = QUEST_STATS[key];
        return quest ? count(d, quest, 1, key) : { ...d, stats: { ...d.stats, [key]: d.stats[key] + 1 } };
      }),
    [update],
  );

  const onScore = useCallback((s: MatchScore) => {
    matchScore.current = s;
  }, []);

  const muteButton = data && (
    <button
      type="button"
      className="mute-button"
      onClick={() => update((d) => ({ ...d, settings: { ...d.settings, muted: !d.settings.muted } }), true)}
      aria-label={data.settings.muted ? 'Turn sound on' : 'Turn sound off'}
    >
      {data.settings.muted ? '🔇' : '🔊'}
    </button>
  );

  const switchPlayer = async () => {
    if (user) await signOutUser();
    setStore(null);
    setData(null);
    setScreen({ name: 'who' });
  };

  const play = (mode: Mode, race?: RaceKind) => {
    if (!data) return;
    matchScore.current = { us: 0, them: 0 };
    raceFlaps.current = [];
    // No boss in a race: the boss waits for the next soccer or lantern game.
    const found = mode !== 'race' && isBossGame(data.stats.sessions) ? bossFor(data.progress, mode === 'lantern') : undefined;
    const power = activeAbility(companionOf(data));
    const boss = found && { ...found, forgive: bossForgives(power), bonus: BOSS_BONUS * bossMultiplier(power) };
    if (boss) sounds.boss();
    // Sky Race: the opponent's flap times are set before the race starts, so it
    // flies its own course: the ghost exactly as the kid did last time.
    let opponent: number[] | undefined;
    if (mode === 'race') {
      const { course } = data.settings;
      const finish = data.settings.length;
      opponent =
        race === 'ghost'
          ? ghostFlaps(data.race.ghosts[course] ?? [], finish)
          : race === 'rival'
            ? rivalFlaps(RIVALS[nextRival(data.race)].pace, courseFairMs(course, ALL_FACTS, data.settings.fastMs), finish)
            : [];
    }
    setScreen({ name: 'play', mode, before: data, boss, race: mode === 'race' ? (race ?? 'solo') : undefined, opponent });
  };

  const companion = data ? companionOf(data) : undefined;
  const ability = activeAbility(companion);
  const hat = data ? itemById(data.shop.equipped.hat)?.icon : undefined;
  const place = placeById(data?.place);
  const companionName = companion && data ? (data.dragonNames[String(companion.species.id)] || companion.species.name) : 'Your dragon';

  return (
    <main className={`app app-${screen.name}`}>
      {error && (
        <div className="error" role="alert" onClick={() => setError('')}>
          {error} <span className="muted">(tap to close)</span>
        </div>
      )}
      {screen.name === 'who' && <WhoIsPlaying onGuest={(name) => openStore(localStore(name))} onError={setError} />}
      {screen.name === 'home' && data && (
        <Home
          data={data}
          onPlay={play}
          onMap={() => setScreen({ name: 'map' })}
          onHatchery={() => setScreen({ name: 'hatchery' })}
          onShop={() => setScreen({ name: 'shop' })}
          onWorld={() => setScreen({ name: 'world' })}
          onBadges={() => setScreen({ name: 'badges' })}
          onSwitch={switchPlayer}
          muteButton={muteButton}
          hat={hat}
          onSettings={(change) => update((d) => ({ ...d, settings: { ...d.settings, ...change } }), true)}
        />
      )}
      {screen.name === 'badges' && data && <Badges data={data} onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'map' && data && <MasteryMap progress={data.progress} onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'hatchery' && data && (
        <Hatchery
          hoard={data.hoard}
          snacksEarned={data.stats.snacks}
          companion={companionOf(data)}
          names={data.dragonNames}
          hat={hat}
          placed={data.shop.placed}
          onShop={() => setScreen({ name: 'shop' })}
          onPick={(id) => update((d) => ({ ...d, companion: id }), true)}
          onName={(id, name) => update((d) => ({ ...d, dragonNames: { ...d.dragonNames, [String(id)]: name } }), true)}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'shop' && data && (
        <Shop
          shop={data.shop}
          snacks={data.stats.snacks}
          trophies={data.league.trophies}
          companion={companion}
          onChange={(shop) => update((d) => ({ ...d, shop }), true)}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'world' && data && (
        <WorldTour
          known={knownCount(data.progress)}
          current={data.place}
          companion={companion}
          hat={hat}
          onPick={(p) => update((d) => ({ ...d, place: p.id }), true)}
          onBack={() => setScreen({ name: 'home' })}
        />
      )}
      {screen.name === 'play' && data && (() => {
        const { mode, before, boss, race, opponent } = screen;
        const course = before.settings.course;
        const raceRival = RIVALS[nextRival(before.race)];
        const level = before.league.level;
        const rival = rivalFor(before.league);
        const clockFor = (fact: Fact) => shotClockMs(speedGoalMs(fact, before.settings.fastMs), level) + extraClockMs(ability);
        const soccer: SoccerProps = {
          onStat,
          onScore,
          rival,
          shield: ability === 'shield',
          shieldName: companionName,
          powerSize: powerSize(ability),
          gloveStyle: { filter: GLOVE_FILTER[data.shop.equipped.gloves ?? ''] },
          ballStyle: { filter: BALL_GLOW[data.shop.equipped.ball ?? ''] },
        };
        const theme = { '--pitch': place.pitch[0], '--pitch-dark': place.pitch[1], '--night': place.night } as CSSProperties;
        return (
          <div className="place-theme" style={theme}>
            <PracticeSession
              progress={before.progress}
              onAnswer={onAnswer}
              holdAfterCorrect={mode === 'lantern'}
              topRight={muteButton}
              buddy={mode !== 'race' && companion && companion.stage !== 'none' ? <Dragon dragon={companion} size={3.4} hat={hat} /> : undefined}
              fastMs={before.settings.fastMs}
              timeLimitFor={mode === 'keeper' ? clockFor : undefined}
              pauseMs={mode === 'keeper' ? 1500 : mode === 'race' ? 700 : undefined}
              chargeNeeded={chargeNeeded(ability)}
              startCharge={startCharge(ability)}
              snackBonus={snackBonus(ability)}
              boss={boss}
              decor={mode === 'race' ? undefined : place.emoji}
              options={{ length: before.settings.length, only: course === 'mixed' ? undefined : (f) => courseOf(f) === course }}
              onQuit={() => {
                update((d) => ({ ...d }), true); // save right away
                setScreen({ name: 'home' });
              }}
              onFinish={(summary) => {
                const score = matchScore.current;
                const won = isSoccer(mode) && score.us > score.them;
                const league = isSoccer(mode) ? { before: before.league, after: afterMatch(before.league, won) } : undefined;
                // Sky Race: who got to the finish first.
                const raced = race ? finishRace(before.race, race, course, raceFlaps.current, opponent ?? [], before.settings.fastMs) : undefined;
                const finish = (d: SaveData): SaveData => {
                  let next: SaveData = {
                    ...d,
                    league: league ? league.after : d.league,
                    race: raced ? raced.race : d.race,
                    stats: {
                      ...d.stats,
                      sessions: d.stats.sessions + 1,
                      lastPlayed: Date.now(),
                      bossesBeaten: d.stats.bossesBeaten + (summary.boss === 'beaten' ? 1 : 0),
                      perfectGames: d.stats.perfectGames + (summary.answered >= 10 && summary.correct === summary.answered ? 1 : 0),
                      bestFastGame: Math.max(d.stats.bestFastGame, summary.fast),
                      ghostWins: d.stats.ghostWins + (raced?.result.kind === 'ghost' && raced.result.won ? 1 : 0),
                    },
                    streak: practiced(d.streak, Date.now()),
                  };
                  next = { ...next, stats: { ...next.stats, bestStreak: Math.max(next.stats.bestStreak, next.streak.count) } };
                  next = eat(next, summary.boss === 'beaten' && boss ? boss.bonus : 0);
                  if (raced?.result.won) next = eat(next, RACE_WIN_BONUS);
                  next = count(next, 'games');
                  if (won) next = count(next, 'matchesWon', 1, 'matchesWon');
                  return withBadges(next);
                };
                // Work out the results from the latest save, which has every answer in it.
                const current = latest.current ?? data;
                const after = finish(current);
                update(finish, true);
                const doneBefore = today(before.quests, Date.now()).done;
                const quests = questsFor(after.quests.day, after.name).filter((q) => after.quests.done.includes(q.id) && !doneBefore.includes(q.id));
                setScreen({ name: 'done', mode, boss, summary, rival, score, league, quests, race, raceResult: raced?.result, badges: BADGES.filter((b) => b.id in after.badges && !(b.id in current.badges)), grew: grewBetween(allDragons(before.hoard, before.stats.snacks), allDragons(after.hoard, after.stats.snacks)) });
              }}
              stage={(props) =>
                mode === 'race' ? (
                  <SkyRace
                    {...props}
                    kind={race ?? 'solo'}
                    finish={before.settings.length}
                    opponentTimes={opponent ?? []}
                    fastMs={before.settings.fastMs}
                    racer={companion ? <Dragon dragon={companion} size={3} hat={hat} /> : <span>🐉</span>}
                    opponent={
                      race === 'ghost' && companion ? (
                        <Dragon dragon={companion} size={3} />
                      ) : race === 'rival' ? (
                        <Dragon dragon={rivalDragon(raceRival.species)} size={3} />
                      ) : undefined
                    }
                    opponentName={race === 'ghost' ? 'Your ghost' : raceRival.name.split(' ')[0]}
                    onFlaps={onFlaps}
                  />
                ) : mode === 'soccer' ? (
                  <PenaltyKicks {...props} {...soccer} slowSaveChance={ability === 'spiky' ? 0 : slowSaveChance(level)} />
                ) : mode === 'keeper' ? (
                  <PenaltySaves {...props} {...soccer} clockFor={clockFor} />
                ) : (
                  <LanternHunt
                    {...props}
                    onStat={onStat}
                    monstersFoundTotal={before.stats.monstersFound}
                    shield={ability === 'shield'}
                    shieldName={companionName}
                    ability={ability}
                    beamRgb={BEAM_RGB[data.shop.equipped.lantern ?? '']}
                  />
                )
              }
            />
          </div>
        );
      })()}
      {screen.name === 'done' && (
        <Done
          screen={screen}
          names={data?.dragonNames ?? {}}
          onAgain={() => play(screen.mode, screen.race)}
          onHome={() => setScreen({ name: 'home' })}
        />
      )}
    </main>
  );
}

function WhoIsPlaying({ onGuest, onError }: { onGuest: (name: string) => void; onError: (msg: string) => void }) {
  const [name, setName] = useState('');
  const guests = listGuests();
  const signIn = () =>
    signInWithGoogle().catch((e: { code?: string }) => {
      if (e.code !== 'auth/popup-closed-by-user') onError('Google sign-in did not work. Try again, or play as a guest.');
    });

  return (
    <div className="who">
      <h1>
        Math Facts <span aria-hidden="true">⚽🔦</span>
      </h1>
      <p className="muted">Multiplication and division up to 12 × 12. About 5 minutes a day.</p>

      {cloudEnabled ? (
        <button type="button" className="big-button google" onClick={signIn}>
          Sign in with Google to save progress
        </button>
      ) : (
        <p className="note">Google sign-in isn't set up yet, so progress saves in this browser only.</p>
      )}

      <h2>{cloudEnabled ? 'Or play as a guest' : "Who's playing?"}</h2>
      {guests.length > 0 && (
        <div className="guest-list">
          {guests.map((g) => (
            <button key={g} type="button" className="chip" onClick={() => onGuest(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      <form
        className="guest-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onGuest(name.trim());
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nickname" maxLength={20} aria-label="Nickname" />
        <button type="submit" className="chip" disabled={!name.trim()}>
          Play
        </button>
      </form>
    </div>
  );
}

interface HomeProps {
  data: SaveData;
  onPlay: (m: Mode, race?: RaceKind) => void;
  onMap: () => void;
  onHatchery: () => void;
  onShop: () => void;
  onWorld: () => void;
  onBadges: () => void;
  onSwitch: () => void;
  muteButton: ReactNode;
  hat?: string;
  onSettings: (change: Partial<Settings>) => void;
}

function Home({ data, onPlay, onMap, onHatchery, onShop, onWorld, onBadges, onSwitch, muteButton, hat, onSettings }: HomeProps) {
  const mastered = masteredCount(data.progress);
  const companion = companionOf(data);
  const ability = activeAbility(companion);
  const streak = streakStatus(data.streak, Date.now());
  const quests = today(data.quests, Date.now());
  const todays = questsFor(quests.day, data.name);
  const boss = data.stats.sessions > 0 && isBossGame(data.stats.sessions);
  const place = placeById(data.place);
  const title = speedTitle(data.progress, ALL_FACTS, data.settings.fastMs);
  const rival = RIVALS[nextRival(data.race)];
  const course = COURSES.find((c) => c.id === data.settings.course) ?? COURSES[COURSES.length - 1];
  return (
    <div className="home">
      <div className="home-top">
        <h1>Hi, {data.name}!</h1>
        <span className="home-actions">
          {muteButton}
          <button type="button" className="link-button" onClick={onSwitch}>
            Switch player
          </button>
        </span>
      </div>
      <p className="muted">
        {data.stats.sessions === 0
          ? 'Your first game is a warm-up to find the facts you already know.'
          : `${mastered} of ${ALL_FACTS.length} facts mastered. Pick a game for today's practice.`}
      </p>
      <div className="home-profile">
        {data.stats.sessions > 0 && (
          <div className={`streak ${streak.doneToday ? 'streak-done' : ''}`}>
            <span className="streak-flame">{streak.count > 0 ? '🔥' : '🌱'}</span>
            <span>
              <strong>{streak.count > 0 ? `${streak.count}-day streak` : 'Start a new streak today!'}</strong>
              <small>
                {streak.doneToday
                  ? "Today's practice is done ✓"
                  : streak.atRisk
                    ? 'Rest day used. Play today to keep it!'
                    : 'Play one game today. One rest day a week is free.'}
              </small>
            </span>
          </div>
        )}
        {title && (
          <div className="speed-title" aria-label={`Speed title: ${title.name}`}>
            <span className="speed-title-icon" aria-hidden="true">
              {title.icon}
            </span>
            <span>
              <strong>{title.name}</strong>
              <small>{title.next ? `Answer faster to become a ${title.next}.` : 'The fastest title there is!'}</small>
            </span>
          </div>
        )}
        <button type="button" className="companion" onClick={onHatchery}>
          <Dragon dragon={companion} size={4.2} hat={hat} />
          <span className="companion-text">
            <strong>
              {dragonName(companion, data.dragonNames)} · level {companion.level}
            </strong>
            <span className="dragon-meter" aria-label={`${companion.into} of ${companion.needed} snacks to the next level`}>
              <span style={{ width: `${(companion.into / companion.needed) * 100}%` }} />
            </span>
            {ability ? (
              <small className="ability">
                {ABILITY_INFO[ability].icon} <b>{ABILITY_INFO[ability].name}:</b> {ABILITY_INFO[ability].text}
              </small>
            ) : (
              <small>
                {data.stats.sessions === 0
                  ? `Your egg eats a snack for every right answer. It hatches at level ${STAGE_LEVEL.hatchling}.`
                  : `${stageText(companion)} Hatched dragons give you a power.`}
              </small>
            )}
          </span>
        </button>
        {data.stats.sessions > 0 && (
          <div className="quests">
            <h3>Today's quests</h3>
            {todays.map((q) => {
              const done = quests.done.includes(q.id);
              const n = Math.min(quests.counts[q.key] ?? 0, q.target);
              return (
                <div key={q.id} className={`quest ${done ? 'quest-done' : ''}`}>
                  <span className="quest-check" aria-hidden="true">
                    {done ? '✅' : '⬜'}
                  </span>
                  <span className="quest-text">
                    <span>{q.text}</span>
                    <span className="quest-bar" aria-label={`${n} of ${q.target}`}>
                      <span style={{ width: `${(n / q.target) * 100}%` }} />
                    </span>
                  </span>
                  <small>{done ? 'Done!' : `🍖 +${QUEST_REWARD}`}</small>
                </div>
              );
            })}
          </div>
        )}
        {boss && (
          <p className="boss-next">
            <span aria-hidden="true">💥</span> Boss game next! Beat the boss at the end for 🍖 {BOSS_BONUS} bonus snacks.
          </p>
        )}
      </div>
      <div className="home-play">
        <div className="modes">
          <div className="mode-card soccer soccer-pair">
            <span className="mode-emoji">⚽</span>
            <strong>Penalty Kicks</strong>
            <span className="league-line">
              League match {data.league.level + 1} of {LEAGUE.length}: vs the {rivalFor(data.league)}
              {data.league.trophies > 0 && ` · 🏆×${data.league.trophies}`}
            </span>
            <span className="mode-pills">
              <button type="button" className="mode-pill" onClick={() => onPlay('soccer')}>
                ⚽ Shoot
              </button>
              <button type="button" className="mode-pill" onClick={() => onPlay('keeper')}>
                🧤 Save
              </button>
            </span>
          </div>
          <button type="button" className="mode-card lantern" onClick={() => onPlay('lantern')}>
            <span className="mode-emoji">🔦</span>
            <strong>Lantern Hunt</strong>
            <span>Find the Tickle Monster before it finds you.</span>
          </button>
          <div className="mode-card race race-card">
            <span className="mode-emoji">🏁</span>
            <strong>Sky Race</strong>
            <span className="league-line">
              {data.race.rivalsBeaten >= RIVALS.length ? `Champion flier! Race ${rival.name} again.` : `Next rival: ${rival.name} (${nextRival(data.race) + 1} of ${RIVALS.length})`}
            </span>
            <span className="course-pills" role="radiogroup" aria-label="Course">
              {COURSES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={course.id === c.id}
                  className={`course-pill ${course.id === c.id ? 'course-pill-on' : ''}`}
                  onClick={() => onSettings({ course: c.id })}
                  title={c.tables}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </span>
            <small className="course-line">{course.tables}</small>
            <span className="mode-pills">
              <button type="button" className="mode-pill" onClick={() => onPlay('race', 'rival')}>
                🐉 Rival
              </button>
              <button type="button" className="mode-pill" onClick={() => onPlay('race', 'ghost')} disabled={!data.race.ghosts[course.id]?.length} title={data.race.ghosts[course.id]?.length ? undefined : 'Race this course once to make a ghost'}>
                👻 Ghost
              </button>
              <button type="button" className="mode-pill" onClick={() => onPlay('race', 'solo')}>
                ☀️ Solo
              </button>
            </span>
          </div>
        </div>
        <details className="game-options">
          <summary>
            <span aria-hidden="true">⚙️</span>
            <span className="options-summary">
              {course.icon} {course.name} facts · {data.settings.length} questions ·{' '}
              up to {data.settings.fastMs / 1000}s speed goal
            </span>
            <span className="options-change">Change</span>
          </summary>
          <div className="options-body">
            <label>
              Practice
              <select value={course.id} onChange={(e) => onSettings({ course: e.target.value as CourseId })} aria-label="Which facts to practice">
                {COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                    {c.id === 'mixed' ? ' (recommended)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <small className="options-note">{course.id === 'mixed' ? 'Every fact, mixed together.' : `${course.name} is the ${course.tables}.`}</small>
            <label>
              Game
              <select value={data.settings.length} onChange={(e) => onSettings({ length: Number(e.target.value) })} aria-label="Game length">
                <option value={10}>Quick (10)</option>
                <option value={20}>Normal (20)</option>
                <option value={30}>Long (30)</option>
              </select>
            </label>
            <label>
              Speed goal
              <select
                value={data.settings.fastMs}
                onChange={(e) => onSettings({ fastMs: Number(e.target.value) })}
                aria-label="Speed goal: how fast counts as knowing a fact"
              >
                <option value={5000}>Relaxed (up to 5 sec)</option>
                <option value={3000}>Standard (up to 3 sec)</option>
                <option value={2000}>Speedy (up to 2 sec)</option>
              </select>
            </label>
            <small className="options-note">Every game uses the same speed goals. The hardest facts get the full time, easier ones like 2 × 3 a bit less. The fact map counts any answer within the full time.</small>
          </div>
        </details>
      </div>
      <div className="home-buttons home-buttons-4">
        <button type="button" className="big-button" onClick={onHatchery}>
          🐉 Hatchery
        </button>
        <button type="button" className="big-button secondary" onClick={onShop}>
          🛍️ Shop <small>🍖 {balance(data.stats.snacks, data.shop)}</small>
        </button>
        <button type="button" className="big-button secondary" onClick={onWorld}>
          🌍 World tour <small>{place.emoji}</small>
        </button>
        <button type="button" className="big-button secondary" onClick={onMap}>
          🗺️ Fact map
        </button>
        <button type="button" className="big-button secondary home-badges" onClick={onBadges}>
          🏅 Badges{' '}
          <small>
            {Object.keys(data.badges).filter((id) => BADGES.some((b) => b.id === id)).length} of {BADGES.length}
          </small>
        </button>
      </div>
      <div className="stat-tiles">
        <Stat icon="⚽" value={data.stats.goals} label="goals" />
        <Stat icon="🧤" value={data.stats.saves} label="saves" />
        <Stat icon="🏟️" value={data.stats.matchesWon} label="wins" />
        <Stat icon="🏆" value={data.league.trophies} label="trophies" />
        <Stat icon="👾" value={data.stats.monstersFound} label="monsters found" />
        <Stat icon="🤗" value={data.stats.tickles} label="tickle attacks" />
        <Stat icon="👑" value={data.stats.bossesBeaten} label="bosses beaten" />
        <Stat icon="⚡" value={data.stats.powers} label="power moves" />
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-icon" aria-hidden="true">
        {icon}
      </span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

interface DoneProps {
  screen: Extract<Screen, { name: 'done' }>;
  names: Record<string, string>;
  onAgain: () => void;
  onHome: () => void;
}

function Done({ screen, names, onAgain, onHome }: DoneProps) {
  const { summary, mode, rival, score, league, quests, grew, raceResult, badges } = screen;
  useEffect(() => {
    if (grew.length) sounds.hatch();
  }, [grew]);
  const pct = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  const won = isSoccer(mode) && score.us > score.them;
  const party = won || raceResult?.won || grew.length > 0 || badges.length > 0 || pct === 100 || summary.boss === 'beaten';
  const trophy = league && league.after.trophies > league.before.trophies;
  return (
    <div className="done">
      {party && <Confetti count={70} fixed />}
      <h1>Nice work!</h1>
      {mode === 'soccer' && <MatchResult us={score.us} them={score.them} rival={rival} />}
      {mode === 'keeper' && (
        <>
          <p className="match-result">{won ? `🏆 You stopped the ${rival}!` : `The ${rival} got past you this time.`}</p>
          <p className="snack-total">
            🧤 You made {score.us} saves. They scored {score.them}.
          </p>
        </>
      )}
      {raceResult && <RaceSummary result={raceResult} />}
      {league && (
        <p className="league-result">
          {trophy
            ? '🏆 LEAGUE CHAMPIONS! You won the trophy and the Champion gloves. A new season starts.'
            : league.after.level > league.before.level
              ? `⬆️ Up the league! Next match: the ${LEAGUE[league.after.level]} (${league.after.level + 1} of ${LEAGUE.length}).`
              : `Win to move up the league. Next match: the ${rival} again.`}
        </p>
      )}
      {summary.boss !== 'none' && (
        <p className={`boss-result ${summary.boss === 'beaten' ? 'boss-beaten' : ''}`}>
          {summary.boss === 'beaten'
            ? `👑 You beat the boss! +${screen.boss?.bonus ?? BOSS_BONUS} bonus snacks.`
            : 'The boss got away this time. Those facts will come back so you can beat it next time.'}
        </p>
      )}
      <p className="big-stat">{pct}% right</p>
      <p className="snack-total">
        🍖 Your dragon ate {summary.snacks} snacks!{summary.powers > 0 && ` ⚡ ${summary.powers} power move${summary.powers > 1 ? 's' : ''}.`}
      </p>
      {quests.map((q) => (
        <p key={q.id} className="quest-result">
          ✅ Quest done: {q.text}. +{QUEST_REWARD} snacks!
        </p>
      ))}
      {badges.length > 0 && (
        <div className="new-badges">
          <h3>🏅 {badges.length === 1 ? 'New badge!' : `${badges.length} new badges!`}</h3>
          <div className="badge-grid">
            {badges.map((b) => (
              <div key={b.id} className={`badge-card badge-got badge-${b.tier}`}>
                <span className="badge-medal" aria-hidden="true">
                  {b.icon}
                </span>
                <strong>{b.name}</strong>
                <small>{b.text}</small>
              </div>
            ))}
          </div>
        </div>
      )}
      {grew.map((d) => (
        <div key={d.species.id} className="grew">
          <Dragon dragon={d} size={4} />
          <span>
            <strong>
              {d.stage === 'egg' ? `New egg: ${d.species.name}!` : d.stage === 'hatchling' ? `${d.species.name} hatched!` : `${dragonName(d, names)} grew!`}
            </strong>
            <small>
              {d.stage === 'hatchling' ? `${ABILITY_INFO[activeAbility(d)!].icon} New power: ${ABILITY_INFO[activeAbility(d)!].text}` : d.species.power}
            </small>
          </span>
        </div>
      ))}
      <p className="muted">
        {summary.correct} of {summary.answered} right, {summary.fast} super fast. Facts you missed will come back soon, and the ones you know will wait
        longer.
      </p>
      <button type="button" className="big-button" onClick={onAgain}>
        Play again
      </button>
      <button type="button" className="big-button secondary" onClick={onHome}>
        Done for today
      </button>
    </div>
  );
}

const MEDALS = { gold: '🥇 Gold', silver: '🥈 Silver', bronze: '🥉 Bronze' };

function RaceSummary({ result }: { result: RaceResult }) {
  const by = Math.abs(result.margin).toFixed(1);
  const headline =
    result.kind === 'solo'
      ? `${MEDALS[result.medal]}! ${result.medal === 'gold' ? 'You beat the fair time.' : 'Answer a little faster for gold.'}`
      : result.kind === 'ghost'
        ? result.won
          ? `👻 You beat your ghost by ${by} seconds!`
          : `Your ghost won by ${by} seconds. Race it again!`
        : result.won
          ? `🏁 You beat ${result.rival} by ${by} seconds!`
          : `${result.rival} won by ${by} seconds. You'll catch them next time!`;
  const next = result.kind === 'rival' && result.won && result.rival !== RIVALS[RIVALS.length - 1].name ? RIVALS[RIVALS.findIndex((r) => r.name === result.rival) + 1] : undefined;
  return (
    <>
      <p className="match-result">{headline}</p>
      <p className="muted">{COURSES.find((c) => c.id === result.course)?.icon} {COURSES.find((c) => c.id === result.course)?.name} course</p>
      {result.won && <p className="snack-total">🍖 +{RACE_WIN_BONUS} bonus snacks for the win!</p>}
      {next && <p className="league-result">⬆️ New rival unlocked: {next.name}.</p>}
      {result.newBest && <p className="league-result">⭐ Your best race pace ever!</p>}
    </>
  );
}

function MatchResult({ us, them, rival }: { us: number; them: number; rival: string }) {
  const text = us > them ? `🏆 You beat the ${rival}` : us === them ? `🤝 A draw with the ${rival}` : `The ${rival} won this time`;
  return (
    <p className="match-result">
      {text}, {us}–{them}!
    </p>
  );
}
