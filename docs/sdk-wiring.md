# Rundot SDK Wiring

What each Run.Game SDK wrapper in `src/services/*` does, what's exercised out of the box, and where to
extend. The kit ships the wrappers; your game decides when to call them — there's no built-in loop.

**Source of truth for the SDK API itself:** [`.rundot-docs/rundot-developer-platform/api/`](../.rundot-docs/rundot-developer-platform/api/),
regenerated on `npm install`. Read the surface's doc before writing code against it; treat the generated
docs as canonical when they disagree with this file.

For *which* surfaces fit a cozy game, see [`../AGENTS.md`](../AGENTS.md).

---

## Status at a glance

The kit's only running code is the blank starter and its dev-only **SDK panel** (`src/starter/SdkPanel.tsx`),
which exercises a few wrappers so you can see the plumbing. Everything else is built and ready to wire.

| Surface | Service | Status |
|---|---|---|
| Storage | `storage.ts` | **Exercised** — save/load round-trip in the SDK panel |
| Time | `time.ts` | **Exercised** — server-time delta in the SDK panel |
| Environment | `environment.ts` | **Exercised** — dev flag, role, device, safe-area insets |
| Ads (rewarded) | `ads.ts` | **Exercised** — a demo rewarded placement in the SDK panel |
| Purchases (IAP) | `iap.ts` | **Ready to wire** — RunBucks spend + subscriptions |
| Notifications | `notifications.ts` | **Ready to wire** — schedule a reminder with your copy |
| Sharing | `sharing.ts` | **Ready to wire** — share a moment with kit-stamped params |
| Leaderboard | `leaderboard.ts` | **Ready to wire** — submit/query helpers (co-opetition, see below) |
| Analytics | `analytics.ts` | **Live** — `game_opened` fires at boot; emit more as you build |
| Lifecycles | `lifecycles.ts` | **Ready to wire** — pause/resume/save hooks |

---

## Two load-bearing rules

### 1. SDK calls only via `src/services/<surface>.ts`

App code never calls `RundotGameAPI.*` directly — every call goes through a service wrapper. This
centralizes error handling, the test-mock seam, and the kit's opinions, so when the SDK shifts shape
(it's beta in places) one file changes per surface, not your whole game.

### 2. Fail loud — but split "best-effort" from "load-bearing"

Unhandled rejections crash the host back to the RUN catalog (see
[`error-handling.md`](../.rundot-docs/rundot-developer-platform/error-handling.md)), so the wrappers wrap
every call:

- **Load-bearing** (storage reads, IAP purchases, rewarded-ad results): `try/catch`, then throw a *typed*
  error the caller handles. Never silent-default.
- **Best-effort** (analytics, notifications, sharing, haptics): attach `.catch()` (the `catchVoid` helper
  in `_runtime.ts`). Failure doesn't touch the UX.

`_runtime.ts` also installs a global `unhandledrejection` net — a backstop, not a substitute for per-call
wrapping.

---

## Per-surface notes

### STORAGE — `storage.ts`
Wraps [`appStorage`](../.rundot-docs/rundot-developer-platform/api/STORAGE.md). One versioned save blob
under `kit_save_v1` (schema version in the key; migrations run on load). API: `loadSave()`,
`persistSave(state)`, `clearSave()`, `defaultSaveState()`. The save is an opaque `{ version, savedAt, data }`
envelope — `data` is your game's, the wrapper only validates the envelope. Fail-loud: corrupt → `CORRUPT`,
quota → `QUOTA`, rate-limited (after retries) → `OFFLINE`. Budget: 128 KiB/bucket, 8 KiB/value.

### TIME — `time.ts`
Wraps [`time`](../.rundot-docs/rundot-developer-platform/api/TIME.md). `getServerNow()` returns server
Unix-ms (5-min cache); `refreshServerTime()` forces a re-anchor. **Anchor any timer on this, never
`Date.now()`** — a player can roll their device clock. First fetch failing is load-bearing (`KitTimeError`);
a later blip serves the cached anchor + delta.

### ADS — `ads.ts`
Wraps [`ads`](../.rundot-docs/rundot-developer-platform/api/ADS.md), **rewarded-only by design** (no
interstitial export — forced ads damage trust). `isRewardedAdReady(placement)` /
`presentRewardedAd(placement)`; `placement` is a string you choose. 5 rewarded views/UTC-day cap
(tunable via `setDailyAdCap`). Hidden on desktop (ads unsupported there). A mid-show reject grants the base
reward anyway and logs `rewarded_ad_failed`. Cozy stance: optional and gentle — a "watch to restock" at
most, never a wall.

### PURCHASES — `iap.ts`
Wraps [`iap`](../.rundot-docs/rundot-developer-platform/api/PURCHASES.md). `purchaseProduct(productId,
amount)` spends RunBucks (productId is a string you name, e.g. `decor_pack`); returns a typed
`KitPurchaseResult`. Also `getRunbucksBalance()`, `openPlatformStore()`, `getRunbucksIcon()`,
`hasMadePurchase()`, and subscriptions (`isSubscribed(tier)`, `getSubscriptionPackages()`,
`purchaseSubscription(tier, interval)` — prices fetched at runtime, never hardcoded). Cozy monetization is
cosmetic: themes, decoration packs, seeds. Show price *and* contents.

### NOTIFICATIONS — `notifications.ts`
Wraps [`notifications`](../.rundot-docs/rundot-developer-platform/api/NOTIFICATIONS.md). No built-in
triggers — `scheduleNotification(id, { title, body, delaySeconds })` with your own copy (id is namespaced
`kit_<id>`). `cancelAllKitNotifications()` (wire to resume), enable/disable via the explicit Settings
toggle only. Best-effort; skipped silently if permission is off. **Keep it kind** — a gentle nudge, never
streak-pressure.

### SHARING — `sharing.ts`
Wraps [`social`](../.rundot-docs/rundot-developer-platform/api/SHARING.md). `shareMoment({ title,
description?, imageUrl?, params? })` builds a kit-stamped (`kit: 'stay-awhile-jam'`) share link;
`createShareQRCode(...)` for in-person. Best-effort (returns `null` on failure). Great for letting players
show off their space — organic growth fits cozy better than ads.

### LEADERBOARD — `leaderboard.ts`
Wraps [`leaderboard`](../.rundot-docs/rundot-developer-platform/api/LEADERBOARD.md) (Simple mode).
`submitScore(score, durationMs?)`, `getTopN(n)`, `getPodiumWithContext(...)`, `getMyRank()`. **Co-opetition,
not a high-score ladder:** a cutthroat ranking isn't cozy. If you surface a board, celebrate participation
and shared/community goals (gardens grown this week, most welcomed visitors), not winners and losers. The
wrapper is neutral; the framing is yours. (The jam itself is judged on average daily players, computed
platform-side, so a board is optional.)

### ANALYTICS — `analytics.ts`
Wraps [`analytics`](../.rundot-docs/rundot-developer-platform/api/ANALYTICS.md). `track(event, params?)`
(typed built-ins like `game_opened`, `store_opened`, `iap_*`, `rewarded_ad_*`, plus any `custom_*`) and
`funnel(step, name, funnelName, funnelOrder)` (define your own funnels). Always best-effort; never crashes
the game.

### LIFECYCLES — `lifecycles.ts`
Wraps [`lifecycles`](../.rundot-docs/rundot-developer-platform/api/LIFECYCLES.md). Hook `onPause`/`onSleep`
to persist save (persist aggressively on `onSleep` — `onQuit` isn't guaranteed), `onResume`/`onAwake` to
reload + refresh server time. `disposeKitLifecycles()` for HMR teardown.

### ENVIRONMENT — `environment.ts`
Wraps [`system`](../.rundot-docs/rundot-developer-platform/api/ENVIRONMENT.md). `isDev()` (gates the
starter's dev SDK panel), `isMobile()`/`isWeb()`, `getDevice()`, `getSafeArea()` (host-chrome + notch
insets — pad your root so bottom UI clears the chrome), `getMyRole()` (`owner`/`editor`/`none`, for
creator-only tools in production). Safe defaults on failure.

---

## Adding a new SDK surface

1. **Read the matching doc** under `.rundot-docs/rundot-developer-platform/api/<NAME>.md`.
2. **Create `src/services/<surface>.ts`** following the existing wrappers (typed functions on the kit's
   terms, fail-loud split).
3. **Add a test** in `src/services/__tests__/` against the SDK mock (`__mocks__/rundot-game-sdk.ts`).
4. **Note it here.**

## Test strategy

Unit-test each wrapper against the mocked SDK (`npm test`), then smoke-test the real flows in the dev
sandbox (`npm run dev`). Unit tests passing is necessary, never sufficient — a mock can't tell you the
assembled game works inside the host, so exercise every surface against the real SDK before you ship.
