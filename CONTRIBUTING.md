# Contributing

## TypeScript for C# and Python programmers

This app is written in TypeScript, so if you know C#, you'll recognize a
lot of it: the same person (Anders Hejlsberg) designed both languages.

| C# | TypeScript |
| --- | --- |
| `int x = 5;` | `const x: number = 5;` (or `let` if it changes) |
| `class Fact { public int A; }` | `interface Fact { a: number; }` |
| `List<Fact>` | `Fact[]` |
| `Dictionary<string, int>` | `Record<string, number>` |
| `x => x * 2` | `(x) => x * 2` |
| `$"{a} × {b}"` | `` `${a} × ${b}` `` |

Like a lot of Python code, most of this app is plain functions and data,
not big class hierarchies.

## Good first projects

1. **Tune the hints.** Edit `src/engine/hints.ts` to make the strategy hints
   clearer or funnier.
2. **Write a test.** Add a case to `src/engine/engine.test.ts`, like "a fact
   in box 5 waits 21 days". Run `npm run test:watch` while you work.
3. **Change the game rules.** In `src/engine/scheduler.ts`, try a different
   `WAIT_DAYS` or `DEFAULT_FAST_MS` and see what the tests say.
4. **Make a new game mode.** Copy `src/modes/PenaltyKicks.tsx`. Your mode
   gets `last` (the latest answer: right or wrong, fast or slow) and draws
   whatever it wants. Then add a card for it in `src/App.tsx`.

## How to send a change

1. Make a branch: `git checkout -b my-idea`.
2. Make your change and run `npm test`.
3. Push and open a pull request. The tests run automatically, and a parent
   reviews it before it goes live.
