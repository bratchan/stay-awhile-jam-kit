// src/starter/SdkPanel.tsx
/**
 * SdkPanel — a dev-only diagnostic that exercises the kit's SDK wrappers so you
 * can see the Run.Game plumbing working and copy the call patterns. Every row
 * goes through src/services/* (never RundotGameAPI directly). StarterApp only
 * renders it when isDev() is true, so players never see it.
 *
 * The storage row is a plumbing demo (a persisted visit counter), not a game
 * mechanic — proof that save/load round-trips, nothing more.
 */
import { useState } from 'react';
import { getServerNow } from '../services/time';
import { isDev, isMobile, isWeb, getDevice, getMyRole, type KitRole } from '../services/environment';
import { isRewardedAdReady, presentRewardedAd } from '../services/ads';
import { SAVE_KEY, loadSave, persistSave, clearSave } from '../services/storage';
import { theme } from '../theme';

const REWARD_PLACEMENT = 'reward_demo';

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        borderRadius: theme.borderRadius.sm,
        padding: theme.spacing.md,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xs,
        textAlign: 'left',
      }}
    >
      <div style={{ fontWeight: theme.fontWeight.semibold }}>{title}</div>
      {children}
    </div>
  );
}

const dim = { fontSize: theme.fontSize.sm, color: theme.colors.text.muted } as const;

export function SdkPanel() {
  const [role, setRole] = useState<KitRole | null>(null);
  const [time, setTime] = useState('');
  const [ad, setAd] = useState('');
  const [visits, setVisits] = useState<number | null>(null);

  const device = getDevice();

  const checkRole = async () => setRole(await getMyRole().catch(() => 'none' as KitRole));
  const fetchTime = async () => {
    const server = await getServerNow();
    setTime(`server Δ ${server - Date.now()}ms`);
  };
  const checkAd = async () => setAd(`ready: ${await isRewardedAdReady(REWARD_PLACEMENT)}`);
  const showAd = async () => setAd(`rewarded: ${(await presentRewardedAd(REWARD_PLACEMENT)).rewarded}`);
  const readVisits = async () => setVisits(((await loadSave()).data['visits'] as number) ?? 0);
  const addVisit = async () => {
    const s = await loadSave();
    const next = ((s.data['visits'] as number) ?? 0) + 1;
    await persistSave({ ...s, data: { ...s.data, visits: next } });
    setVisits(next);
  };
  const reset = async () => {
    await clearSave();
    setVisits(0);
  };

  return (
    <section style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
      <p style={{ ...dim, margin: 0 }}>
        Dev-only. Each row exercises a wrapper in <code>src/services/*</code> — the SDK plumbing the kit did for you.
      </p>

      <Row title="Environment">
        <div style={dim}>
          dev {String(isDev())} · web {String(isWeb())} · mobile {String(isMobile())} · device {device?.deviceType ?? 'unknown'}
        </div>
        <button onClick={checkRole}>Check my role</button>
        {role && <div style={dim}>role: {role}</div>}
      </Row>

      <Row title="Server time">
        <button onClick={fetchTime}>Fetch server time</button>
        {time && <div style={dim}>{time}</div>}
      </Row>

      <Row title="Storage (save/load round-trip)">
        <div style={dim}>key {SAVE_KEY}</div>
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <button onClick={readVisits}>Load</button>
          <button onClick={addVisit}>Save +1 visit</button>
          <button onClick={reset}>Clear save</button>
        </div>
        {visits !== null && <div style={dim}>visits: {visits}</div>}
      </Row>

      <Row title="Rewarded ad">
        <div style={{ display: 'flex', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
          <button onClick={checkAd}>Check ready</button>
          <button onClick={showAd}>Show rewarded ad</button>
        </div>
        {ad && <div style={dim}>{ad}</div>}
      </Row>
    </section>
  );
}

export default SdkPanel;
