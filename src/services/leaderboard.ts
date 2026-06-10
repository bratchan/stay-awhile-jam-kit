/**
 * LEADERBOARD service — Simple mode, a single numeric score.
 *
 * Contract: docs/sdk-wiring.md § LEADERBOARD. Wraps
 * `RundotGameAPI.leaderboard` in Simple mode (no token, no score sealing). The
 * server-side `config.json` carries `{ leaderboard: { requiresToken: false } }`;
 * this wrapper assumes the default mode/period (alltime), so SDK calls omit
 * `mode`/`period` and let the server auto-resolve.
 *
 * There's no built-in score meaning — your game decides what a score is and when
 * to submit it via {@link submitScore}. Debouncing is the caller's job; this
 * wrapper just submits what it's given. (The Stay Awhile jam itself is judged on
 * average daily players, computed platform-side, so a leaderboard is optional.)
 *
 * Cozy note: a raw high-score ladder isn't cozy. If you surface a board at all,
 * lean co-opetition — celebrate participation and shared/community goals (most
 * welcomed visitors, a collective harvest, gardens grown this week) over
 * cutthroat ranking. The wrapper is neutral; the framing is your call.
 *
 * Fail-loud split: a submit failing is best-effort — we retry once, then log
 * `leaderboard_submit_failed` and return without blocking the game. A *query*
 * failing is surfaced as a typed {@link KitLeaderboardError} so the UI can show
 * its "Couldn't load — retrying" toast.
 */
import RundotGameAPI from '@series-inc/rundot-game-sdk/api';
import { track } from './analytics';

/** Typed leaderboard failure (query path only). */
export class KitLeaderboardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KitLeaderboardError';
  }
}

/** A single leaderboard row in the kit's terms. */
export interface KitLeaderboardEntry {
  profileId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  rank: number | null;
  isSeed?: boolean;
}

/** Podium + surrounding context for the leaderboard screen. */
export interface KitPodium {
  top: KitLeaderboardEntry[];
  ahead: KitLeaderboardEntry[];
  player: KitLeaderboardEntry | null;
  behind: KitLeaderboardEntry[];
}

/** Map an SDK entry to the kit's slimmer shape. */
function toKitEntry(e: {
  profileId: string;
  username: string;
  avatarUrl: string | null;
  score: number;
  rank: number | null;
  isSeed?: boolean;
}): KitLeaderboardEntry {
  const entry: KitLeaderboardEntry = {
    profileId: e.profileId,
    username: e.username,
    avatarUrl: e.avatarUrl,
    score: e.score,
    rank: e.rank,
  };
  if (e.isSeed !== undefined) entry.isSeed = e.isSeed;
  return entry;
}

/**
 * Submit a score. Best-effort: retries once on failure, then logs
 * `leaderboard_submit_failed` and returns `false` without throwing — a
 * leaderboard outage must never block the game. Returns `true` when the server
 * accepted the score.
 *
 * `durationMs` is required by the SDK; for a cumulative metric there's no
 * meaningful run duration, so it defaults to 0.
 */
export async function submitScore(score: number, durationMs = 0): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await RundotGameAPI.leaderboard.submitScore({
        score,
        duration: durationMs,
      });
      return result.accepted;
    } catch (err) {
      if (attempt === 0) {
        console.warn('[kit/sdk] leaderboard:submit retry:', err);
        continue;
      }
      console.warn('[kit/sdk] leaderboard:submit failed:', err);
      track('leaderboard_submit_failed');
    }
  }
  return false;
}

/**
 * Top `n` scores. Throws {@link KitLeaderboardError} on failure (UI retries).
 */
export async function getTopN(n: number): Promise<KitLeaderboardEntry[]> {
  try {
    const res = await RundotGameAPI.leaderboard.getPagedScores({ limit: n });
    return res.entries.map(toKitEntry);
  } catch (err) {
    throw new KitLeaderboardError(`getTopN(${n}) failed: ${String(err)}`);
  }
}

/**
 * Podium (top N) plus the player's neighbourhood. Throws
 * {@link KitLeaderboardError} on failure.
 */
export async function getPodiumWithContext(
  topCount: number,
  contextAhead: number,
  contextBehind: number,
): Promise<KitPodium> {
  try {
    const res = await RundotGameAPI.leaderboard.getPodiumScores({
      topCount,
      contextAhead,
      contextBehind,
    });
    const ctx = res.context;
    return {
      top: ctx.topEntries.map(toKitEntry),
      ahead: ctx.beforePlayer.map(toKitEntry),
      player: ctx.playerEntry ? toKitEntry(ctx.playerEntry) : null,
      behind: ctx.afterPlayer.map(toKitEntry),
    };
  } catch (err) {
    throw new KitLeaderboardError(`getPodiumWithContext failed: ${String(err)}`);
  }
}

/** The player's current rank, or null if unranked. Throws on query failure. */
export async function getMyRank(): Promise<number | null> {
  try {
    const res = await RundotGameAPI.leaderboard.getMyRank();
    return res.rank;
  } catch (err) {
    throw new KitLeaderboardError(`getMyRank failed: ${String(err)}`);
  }
}
