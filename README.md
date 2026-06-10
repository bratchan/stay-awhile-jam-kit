# Stay Awhile Jam Kit

A bare-bones starter for building a **cozy game** on Run.Game for the Stay Awhile jam. The SDK
integration is done for you: saving, server time, gentle notifications, in-app purchases, rewarded ads,
sharing, and analytics. There's no sample game and no mechanics on purpose, you bring the idea.

Cozy is a feeling, not a formula. Farming, decorating, tending, tidying, collecting, wandering, brewing,
whatever you dream up. This kit gets the platform plumbing out of your way so you can spend the jam on
*your* game instead of someone else's template.

---

## Quickstart

```bash
# 1. Clone the kit into your own project
git clone https://github.com/series-ai/stay-awhile-jam-kit.git my-cozy-game
cd my-cozy-game

# 2. Install. The SDK's postinstall regenerates the local SDK docs.
npm install

# 3. REQUIRED: create your Rundot game. The kit ships no game ID, so this
#    writes yours into game.config.prod.json. Run it before `npm run dev`.
rundot init

# 4. Boot the dev sandbox.
npm run dev
```

`npm run dev` opens the URL the CLI prints. It boots a blank welcome screen plus a dev-only SDK panel
that shows the service wrappers working (save/load, server time, a rewarded ad). That's your starting
point, delete `src/starter/*` and build your world.

When your game is ready, ship it (update the CLI first, see below):

```bash
rundot update      # submitting on an old CLI isn't supported
rundot deploy
```

Full walkthrough, prerequisites, and troubleshooting: [`docs/getting-started.md`](docs/getting-started.md).

---

## What's in the box

**SDK wrappers** (`src/services/*`) are the point of the kit, fail-loud wrappers for STORAGE, TIME, ADS
(rewarded-only), PURCHASES, NOTIFICATIONS, LEADERBOARD, ANALYTICS, SHARING, LIFECYCLES, and ENVIRONMENT.
Your game code never calls `RundotGameAPI.*` directly; the wrappers own the SDK quirks. The starter's SDK
panel exercises a few of them; the rest are ready to wire when you need them. See
[`docs/sdk-wiring.md`](docs/sdk-wiring.md) for what each one does and its status.

**A theme system** (`src/theme/*`) — edit `src/theme/default.ts` to set your colors, spacing, and type.

**A blank starter** (`src/starter/*`) — a welcome screen and the dev SDK panel. Replace it with your game.
`src/App.tsx` is a one-line indirection to whatever root you build.

That's it. No engine, no genre, no prescribed loop. The guidance for *which* SDK surfaces fit a cozy game
lives in [`AGENTS.md`](AGENTS.md), point your coding agent at it.

---

## Which SDK surfaces fit a cozy game

[`AGENTS.md`](AGENTS.md) has the full list with links into the local SDK docs, but the short version:
reach for **STORAGE** (persist the world), **TIME** (daily rhythms), **NOTIFICATIONS** (a gentle nudge,
never a nag), the **asset-gen** surfaces (IMAGE_GEN / SPRITE_GEN / AUDIO_GEN to make cozy art and sound
solo), **PURCHASES** (cosmetic decoration packs), and **SHARING** (show off your space). Keep ads
rewarded-only and optional. If you want a leaderboard, frame it as **co-opetition** (shared/community
goals), not a cutthroat high-score ladder.

---

## Stack

- **React 18 + TypeScript + Vite 6** on `@series-inc/rundot-game-sdk`
- **Build target:** HTML5, mobile-first, deployed via `rundot deploy`
- **Tests:** Vitest + Testing Library.

---

## Project layout

```
src/
├── services/              # Run.Game SDK wrappers — fail-loud contracts (the kit)
├── theme/                 # theme tokens — edit default.ts for your look
├── starter/               # the blank welcome screen + dev SDK panel — replace this
├── components/            # ErrorBoundary
├── App.tsx                # one-line indirection — points at the starter by default
└── main.tsx               # boot
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
