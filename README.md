# Math Facts

A math facts practice game for phones and computers. Kids practice
multiplication and division up to 12 × 12 for about 5 minutes a day, and
grow a hatchery of dragons as they learn:

- **Dragon hatchery** 🐉: every times table has its own dragon, like the
  Ember Drake for the 7s. Its egg appears when the kid starts that table,
  hatches when half the table's facts are known well, and is fully grown
  when every fact is mastered. Right answers in any game are snacks for the
  kid's companion dragon (fast answers are triple snacks), which levels up.

The practice happens inside two games:

- **Penalty Kicks** ⚽: every answer is a shot on goal. Fast right answers go
  in the top corner; wrong answers get saved.
- **Lantern Hunt** 🔦: the Tickle Monster is hiding in a dark house. Right
  answers light your lantern so you can search; wrong answers let the
  monster creep closer until... tickle attack!

- **Sky Race** 🏁: every right answer is a flap toward the finish line.
  Pick a course (Easy, Medium, Hard or Mixed facts), then race a ladder of
  7 rival dragons, your own ghost from last time on that course, or fly solo
  for a gold, silver or bronze medal. The ghost replays every flap at the
  exact time the kid made it. Every fact has a fair time (1 × 1 is quicker
  than 7 × 8, and none is over the speed goal), which sets solo medals and
  rival speeds.

Other things kids and parents can do:

- Earn a **speed title**, from Egg Wobbler to Comet Wing, based on how
  fast they usually answer compared with each fact's fair time.
- Collect **badges**, a permanent list of accomplishments: speed titles
  reached, longest streaks, facts and tables mastered, perfect games, goals,
  saves, monsters found, rivals and ghosts beaten in Sky Race, dragons
  hatched and more. Once earned, a badge is kept forever, even if a streak
  ends or a speed title slips.
- Keep a **daily streak** going, with one free rest day a week.
- **Name** their companion dragon.
- Pick **focus practice** on one table (good for homework), a **game
  length** (10, 20 or 30 questions) and a **speed goal** (5, 3 or 2
  seconds) on the home screen.
- See **trouble facts** on the fact map, the facts a kid is most stuck on.
- Turn **sound** on or off with the speaker button.
- Use it **offline** and add it to a phone's home screen like an app.

## How it helps kids learn

The game sits on top of a small learning engine in `src/engine/`:

- **Recall, not recognition.** Kids type the answer on a number pad.
- **Spaced repetition.** Each fact lives in one of 5 boxes. Right and fast
  moves it up a box and waits longer before it comes back (up to 3 weeks).
  A miss sends it back to box 1.
- **Fluency.** "Fast" means under 3 seconds, so a fact counts as known only
  when it's recalled, not counted out. The clock is never shown.
- **A few new facts at a time.** At most 3 new facts per session, mixed in
  with known ones. The first game is a placement check so nobody grinds
  through facts they already know.
- **Fix mistakes right away.** After a miss the kid sees the answer, a
  picture of it as rows of dots split the way the strategy works (6 × 8 is
  5 rows of 8 plus 1 more row), and a strategy hint (like "times 9 is times
  10 minus one"), types the right
  answer, and the fact comes back 3 questions later.
- **Division follows multiplication.** 56 ÷ 7 unlocks once 7 × 8 is learned.

The **fact map** shows every fact as a colored square, from gray (not tried)
to green (mastered).

## Running it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev      # open the link it prints
npm test         # run the engine tests
npm run build    # production build in dist/
```

Without Firebase settings the app runs in guest mode, saving progress in
the browser.

## Setting up Google sign-in (one time)

Progress is saved to the cloud with Firebase, so a kid's progress follows
them between a phone and the family computer. The free tier is plenty.

1. Go to the [Firebase console](https://console.firebase.google.com) and
   create a project (Google Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google →
   Enable.**
3. **Authentication → Settings → Authorized domains → Add domain:**
   `jonhill7.github.io`.
4. **Build → Firestore Database → Create database** (production mode, any
   nearby location). Open the **Rules** tab, paste in the contents of
   `firestore.rules` from this repo, and publish.
5. **Project settings → Your apps → Web (`</>`)**: register an app and copy
   the config values.
6. In GitHub: **Settings → Secrets and variables → Actions → Variables**,
   add `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`. For local
   development, copy `.env.example` to `.env.local` and fill it in.

These web config values aren't secret (every Firebase website sends them to
the browser); the Firestore rules are what keep each kid's data private.

Kids with supervised Google accounts (Family Link) may need a parent to
allow signing in to third-party apps.

## Publishing on GitHub Pages (one time)

In GitHub, go to **Settings → Pages → Build and deployment → Source** and
pick **GitHub Actions**. Every merge to `main` then runs the tests and
publishes the app at https://jonhill7.github.io/math-facts/. On a phone,
use "Add to Home Screen" for an app-like icon.

## Project layout

| Folder | What's in it |
| --- | --- |
| `src/engine/` | The learning engine: facts, spaced repetition, sessions, hints, dragon growth. No UI. Has tests. |
| `src/modes/` | One file per game mode. |
| `src/components/` | The number pad, the practice loop and the fact map. |
| `src/storage/` | Saving progress: in the browser for guests, Firebase for Google sign-in. |

Want to help build it? See [CONTRIBUTING.md](CONTRIBUTING.md).
