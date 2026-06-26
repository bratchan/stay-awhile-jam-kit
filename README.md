# Cat Cafe

Cat Cafe is a cozy Run.Game jam game where you play as the cafe cat. Customers visit the shop,
order drinks, linger at table spots, and share story chapters as you serve them and comfort them
with small cat actions.

The project is built on the Stay Awhile kit, so the Run.Game SDK wrappers and local docs are still in
the repo. Game work now lives across `src/App.tsx`, `src/components/`, `src/game/`, `src/index.css`,
and the runtime assets under `public/`.

---

## Quickstart

```bash
# 1. Open this project folder
cd C:\Users\BratKelley\Desktop\cozy2

# 2. Install dependencies. The SDK's postinstall regenerates the local SDK docs.
npm install

# 3. Boot the dev sandbox.
npm run dev
```

`npm run dev` opens the URL Vite prints. The main game root is `src/App.tsx`; shared icons/meters live in
`src/components/`, and data-heavy game definitions live in `src/game/`.

When your game is ready, ship it (update the CLI first, see below):

```bash
rundot update      # submitting on an old CLI isn't supported
rundot deploy
```

Full walkthrough, prerequisites, and troubleshooting: [`docs/getting-started.md`](docs/getting-started.md).

---

## Need To Do / Handoff Notes

Use this section when moving work to another computer. Pull the latest repo first, then run:

```bash
npm install
npm run dev
```

Before deploying, run:

```bash
npm run typecheck
npm run build
rundot update
rundot deploy
```

Current Need To Do:

- Do not deploy until the creator says so.
- Run one final Run.Game/mobile-device smoke test after deployment is approved.
- Optional polish for later: add haptics if the installed Run.Game SDK exposes the haptics API in this project.

Asset note:

- Runtime assets must live in `public/` or `public/cdn-assets/` so they ship in the build.
- Current Cat Cafe images live under `public/cat/` and `public/admin-uploads/`.
- If images are missing on a new computer, check that `public/cat/` was committed or copy that folder from the old computer.

Deploy note:

- Initialize/deploy as a Run.Game game named `Cat Cafe`.
- If `rundot deploy` fails because the game is not initialized, run `rundot init` and name it `Cat Cafe`.
- If deploy fails for auth, run `rundot login`.

---

## What's in the box

**SDK wrappers** (`src/services/*`) are the point of the kit, fail-loud wrappers for STORAGE, TIME, ADS
(rewarded-only), PURCHASES, NOTIFICATIONS, LEADERBOARD, ANALYTICS, SHARING, LIFECYCLES, and ENVIRONMENT.
Your game code never calls `RundotGameAPI.*` directly; the wrappers own the SDK quirks. Every wrapper is
built, unit-tested, and ready to wire when you need it. See
[`docs/sdk-wiring.md`](docs/sdk-wiring.md) for what each one does.

**A theme system** (`src/theme/*`) — edit `src/theme/default.ts` to set your colors, spacing, and type.

**A blank starter** (`src/starter/*`) — a welcome screen. Replace it with your game.
`src/App.tsx` is a one-line indirection to whatever root you build.

That's it. No engine, no genre, no prescribed loop. The guidance for *which* SDK surfaces fit a cozy game
lives in [`AGENTS.md`](AGENTS.md), point your coding agent at it.

---

## Which SDK surfaces fit a cozy game

[`AGENTS.md`](AGENTS.md) has the full list with links into the local SDK docs, but the short version:
reach for **STORAGE** (persist the world), **TIME** (daily rhythms), **growth timers** (seeds that sprout
while the player is away: a planted-at timestamp in the save, checked against server time),
**NOTIFICATIONS** (a gentle nudge, never a nag),
the **asset-gen** surfaces (IMAGE_GEN / SPRITE_GEN / AUDIO_GEN to make cozy art and sound solo),
**PURCHASES** (cosmetic decoration packs), and **SHARING + CONTEXT** (show off your space, gift a friend
a seed). Keep ads rewarded-only and optional. If you want a leaderboard, frame it as **co-opetition**
(shared/community goals), not a cutthroat high-score ladder.

For wiring patterns that combine these (daily check-in, growth timers, gifting, a cosmetic shop, a
rewarded boost), see [`docs/cozy-recipes.md`](docs/cozy-recipes.md).

---

## Stack

- **React 18 + TypeScript + Vite 6** on `@series-inc/rundot-game-sdk`
- **Build target:** HTML5, mobile-first, deployed via `rundot deploy`
- **Tests:** Vitest + Testing Library.

---

## Project layout

```text
src/
- components/            # reusable React UI: ErrorBoundary, icons, meters
- game/                  # game data and helpers split out of the main app
- services/              # Run.Game SDK wrappers, fail-loud contracts from the kit
- theme/                 # theme tokens; edit default.ts for base look
- starter/               # original kit starter files
- App.tsx                # main Cat Cafe game root
- index.css              # Cat Cafe layout and styling
- main.tsx               # boot
```

---

## AI-assisted building

Building with Claude Code, Cursor, Gemini, or another coding agent? The repo ships agent-orientation
files — [`AGENTS.md`](AGENTS.md) (plus [`CLAUDE.md`](CLAUDE.md) and [`GEMINI.md`](GEMINI.md)) — that point
your assistant at the SDK doc index and the surfaces worth reaching for in a cozy game, so it helps you
build your game with creative freedom instead of imposing a template.

---

## License

See [`LICENSE.txt`](LICENSE.txt).
