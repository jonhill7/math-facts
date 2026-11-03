import { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Confetti } from './components/Confetti';
import { Dragon } from './components/Dragon';
import { companionFor, dragonName, Hatchery, stageText } from './components/Hatchery';
import { MasteryMap, masteredCount } from './components/MasteryMap';
import { BOSS_BONUS, PracticeSession, SessionSummary } from './components/PracticeSession';
import { Shop } from './components/Shop';
import { WorldTour } from './components/WorldTour';
import { ABILITY_INFO, activeAbility, chargeNeeded, snackBonus } from './engine/abilities';
import { bossFor, isBossGame, knownCount } from './engine/boss';
import { ALL_FACTS, Fact } from './engine/facts';
import { DragonState, grewBetween, levelFor, SNACKS_FAST, SNACKS_RIGHT } from './engine/dragons';
import { afterMatch, League, LEAGUE, rivalFor, shotClockMs, slowSaveChance } from './engine/league';
import { placeById } from './engine/places';
import { bumpQuest, Quest, QUEST_REWARD, QuestKey, questsFor, today } from './engine/quests';
import { recordAnswer } from './engine/scheduler';
import { BALL_GLOW, balance, BEAM_RGB, GLOVE_FILTER, itemById } from './engine/shop';
import { practiced, streakStatus } from './engine/streak';
import { LanternHunt } from './modes/LanternHunt';
import { MatchScore, PenaltyKicks, SoccerProps, StatKey } from './modes/PenaltyKicks';
import { PenaltySaves } from './modes/PenaltySaves';
import { cloudEnabled, cloudStore, signInWithGoogle, signOutUser, User, watchUser } from './storage/firebase';
import { listGuests, localStore } from './storage/localStore';
import { ProgressStore, SaveData, Settings } from './storage/types';
import { setMuted, sounds } from './sound';

type Mode = 'soccer' | 'keeper' | 'lantern';
const isSoccer = (m: Mode) => m !== 'lantern';

interface Boss {
  name: string;
  icon: string;
  facts: Fact[];
}

type Screen =
  | { name: 'who' }
  | { name: 'home' }
  | { name: 'play'; mode: Mode; before: SaveData; boss?: Boss }
  | { name: 'done'; mode: Mode; summary: SessionSummary; grew: DragonState[]; rival: string; score: MatchScore; league?: { before: League; after: League }; quests: Quest[] }
  | { name: 'map' }
  | { name: 'hatchery' }
  | { name: 'shop' }
  | { name: 'world' };

// Count something toward a stat and today's quests. Finished quests pay out snacks.
function count(d: SaveData, key: QuestKey, n = 1, stat?: keyof SaveData['stats']): SaveData {
  const { state, finished } = bumpQuest(d.quests, d.name, key, n, Date.now());
  const stats = { ...d.stats, snacks: d.stats.snacks + finished.length * QUEST_REWARD };
  if (stat) stats[stat] += n;
  return { ...d, stats, quests: state };
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
        setData(d);
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
        const fast = correct && ms <= d.settings.fastMs;
        const bonus = snackBonus(activeAbility(companionFor(d.progress, d.companion)));
        let next: SaveData = {
          ...d,
          progress: { ...d.progress, [fact.id]: recordAnswer(d.progress[fact.id], correct, ms, Date.now(), d.settings.fastMs) },
          stats: correct ? { ...d.stats, snacks: d.stats.snacks + (fast ? SNACKS_FAST : SNACKS_RIGHT) + bonus } : d.stats,
        };
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

  const play = (mode: Mode) => {
    if (!data) return;
    matchScore.current = { us: 0, them: 0 };
    const boss = isBossGame(data.stats.sessions) ? bossFor(data.progress, mode === 'lantern') : undefined;
    if (boss) sounds.boss();
    setScreen({ name: 'play', mode, before: data, boss });
  };

  const companion = data ? companionFor(data.progress, data.companion) : undefined;
  const ability = activeAbility(companion);
  const hat = data ? itemById(data.shop.equipped.hat)?.icon : undefined;
  const place = placeById(data?.place);
  const companionName = companion && data ? (data.dragonNames[String(companion.species.table)] || companion.species.name) : 'Your dragon';

  return (
    <main className="app">
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
          onSwitch={switchPlayer}
          muteButton={muteButton}
          hat={hat}
          onSettings={(change) => update((d) => ({ ...d, settings: { ...d.settings, ...change } }), true)}
        />
      )}
      {screen.name === 'map' && data && <MasteryMap progress={data.progress} onBack={() => setScreen({ name: 'home' })} />}
      {screen.name === 'hatchery' && data && (
        <Hatchery
          progress={data.progress}
          companion={data.companion}
          names={data.dragonNames}
          hat={hat}
          onPick={(table) => update((d) => ({ ...d, companion: table }), true)}
          onName={(table, name) => update((d) => ({ ...d, dragonNames: { ...d.dragonNames, [String(table)]: name } }), true)}
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
        const { mode, before, boss } = screen;
        const level = before.league.level;
        const rival = rivalFor(before.league);
        const clock = shotClockMs(before.settings.fastMs, level);
        const soccer: SoccerProps = {
          onStat,
          onScore,
          rival,
          shield: ability === 'shield',
          shieldName: companionName,
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
              buddy={companion && companion.stage !== 'none' ? <Dragon dragon={companion} size={3.4} hat={hat} /> : undefined}
              fastMs={before.settings.fastMs}
              timeLimitMs={mode === 'keeper' ? clock : undefined}
              pauseMs={mode === 'keeper' ? 1500 : undefined}
              chargeNeeded={chargeNeeded(ability)}
              snackBonus={snackBonus(ability)}
              boss={boss}
              decor={place.emoji}
              options={{ focusTable: before.settings.focusTable || undefined, length: before.settings.length }}
              onQuit={() => {
                update((d) => ({ ...d }), true); // save right away
                setScreen({ name: 'home' });
              }}
              onFinish={(summary) => {
                const score = matchScore.current;
                const won = isSoccer(mode) && score.us > score.them;
                const league = isSoccer(mode) ? { before: before.league, after: afterMatch(before.league, won) } : undefined;
                const finish = (d: SaveData): SaveData => {
                  let next: SaveData = {
                    ...d,
                    league: league ? league.after : d.league,
                    stats: {
                      ...d.stats,
                      sessions: d.stats.sessions + 1,
                      lastPlayed: Date.now(),
                      bossesBeaten: d.stats.bossesBeaten + (summary.boss === 'beaten' ? 1 : 0),
                      snacks: d.stats.snacks + (summary.boss === 'beaten' ? BOSS_BONUS : 0),
                    },
                    streak: practiced(d.streak, Date.now()),
                  };
                  next = count(next, 'games');
                  if (won) next = count(next, 'matchesWon', 1, 'matchesWon');
                  return next;
                };
                // Work out the results from the latest save, which has every answer in it.
                const current = latest.current ?? data;
                const after = finish(current);
                update(finish, true);
                const doneBefore = today(before.quests, Date.now()).done;
                const quests = questsFor(after.quests.day, after.name).filter((q) => after.quests.done.includes(q.id) && !doneBefore.includes(q.id));
                setScreen({ name: 'done', mode, summary, rival, score, league, quests, grew: grewBetween(before.progress, after.progress) });
              }}
              stage={(props) =>
                mode === 'soccer' ? (
                  <PenaltyKicks {...props} {...soccer} slowSaveChance={slowSaveChance(level)} />
                ) : mode === 'keeper' ? (
                  <PenaltySaves {...props} {...soccer} timeLimitMs={clock} />
                ) : (
                  <LanternHunt
                    {...props}
                    onStat={onStat}
                    monstersFoundTotal={before.stats.monstersFound}
                    shield={ability === 'shield'}
                    shieldName={companionName}
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
          onAgain={() => play(screen.mode)}
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
  onPlay: (m: Mode) => void;
  onMap: () => void;
  onHatchery: () => void;
  onShop: () => void;
  onWorld: () => void;
  onSwitch: () => void;
  muteButton: ReactNode;
  hat?: string;
  onSettings: (change: Partial<Settings>) => void;
}

function Home({ data, onPlay, onMap, onHatchery, onShop, onWorld, onSwitch, muteButton, hat, onSettings }: HomeProps) {
  const mastered = masteredCount(data.progress);
  const companion = companionFor(data.progress, data.companion);
  const hatched = companion && !['none', 'egg'].includes(companion.stage);
  const ability = activeAbility(companion);
  const level = levelFor(data.stats.snacks);
  const streak = streakStatus(data.streak, Date.now());
  const quests = today(data.quests, Date.now());
  const todays = questsFor(quests.day, data.name);
  const boss = data.stats.sessions > 0 && isBossGame(data.stats.sessions);
  const place = placeById(data.place);
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
      <button type="button" className="companion" onClick={onHatchery}>
        {companion && companion.stage !== 'none' ? <Dragon dragon={companion} size={4.2} hat={hat} /> : <span className="dragon" style={{ fontSize: '2.6rem' }}>🥚</span>}
        <span className="companion-text">
          {hatched && companion ? (
            <>
              <strong>
                {dragonName(companion, data.dragonNames)} · level {level.level}
              </strong>
              <span className="dragon-meter" aria-label={`${level.into} of ${level.needed} snacks to the next level`}>
                <span style={{ width: `${(level.into / level.needed) * 100}%` }} />
              </span>
              {ability && (
                <small className="ability">
                  {ABILITY_INFO[ability].icon} <b>{ABILITY_INFO[ability].name}:</b> {ABILITY_INFO[ability].text}
                </small>
              )}
            </>
          ) : (
            <>
              <strong>{companion && companion.stage === 'egg' ? 'You found a dragon egg!' : 'Find your first dragon egg'}</strong>
              <small>{companion && companion.stage === 'egg' ? `${stageText(companion)} Hatched dragons give you a power.` : 'Play a game to start.'}</small>
            </>
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
      </div>
      <details className="game-options">
        <summary>
          <span aria-hidden="true">⚙️</span>
          <span className="options-summary">
            {data.settings.focusTable ? `Just the ${data.settings.focusTable}s` : 'All facts'} · {data.settings.length} questions ·{' '}
            {data.settings.fastMs / 1000}s speed
          </span>
          <span className="options-change">Change</span>
        </summary>
        <div className="options-body">
          <label>
            Practice
            <select value={data.settings.focusTable} onChange={(e) => onSettings({ focusTable: Number(e.target.value) })} aria-label="Which facts to practice">
              <option value={0}>All facts (recommended)</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Just the {i + 1}s
                </option>
              ))}
            </select>
          </label>
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
              <option value={5000}>Relaxed (5 sec)</option>
              <option value={3000}>Standard (3 sec)</option>
              <option value={2000}>Speedy (2 sec)</option>
            </select>
          </label>
        </div>
      </details>
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
  const { summary, mode, rival, score, league, quests, grew } = screen;
  useEffect(() => {
    if (grew.length) sounds.hatch();
  }, [grew]);
  const pct = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  const won = isSoccer(mode) && score.us > score.them;
  const party = won || grew.length > 0 || pct === 100 || summary.boss === 'beaten';
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
            ? `👑 You beat the boss! +${BOSS_BONUS} bonus snacks.`
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
      {grew.map((d) => (
        <div key={d.species.table} className="grew">
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

function MatchResult({ us, them, rival }: { us: number; them: number; rival: string }) {
  const text = us > them ? `🏆 You beat the ${rival}` : us === them ? `🤝 A draw with the ${rival}` : `The ${rival} won this time`;
  return (
    <p className="match-result">
      {text}, {us}–{them}!
    </p>
  );
}
