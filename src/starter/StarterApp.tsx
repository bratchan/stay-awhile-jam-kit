// src/starter/StarterApp.tsx
/**
 * StarterApp — the kit's default app, and deliberately almost nothing.
 *
 * It is a blank welcome screen plus a dev-only panel that proves the Run.Game
 * SDK plumbing in src/services/* is wired. There is no game here on purpose:
 * this is a cozy-jam scaffold, not a template to clone. Delete this folder and
 * build your own world. AGENTS.md lists the SDK surfaces worth reaching for.
 */
import { getSafeArea, isDev } from '../services/environment';
import { theme } from '../theme';
import { SdkPanel } from './SdkPanel';

export function StarterApp() {
  const safeArea = getSafeArea();
  const c = theme.colors;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: c.background,
        color: c.text.primary,
        paddingTop: safeArea.top,
        paddingBottom: safeArea.bottom,
      }}
    >
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: theme.spacing.xl,
          gap: theme.spacing.md,
        }}
      >
        <div style={{ fontSize: theme.fontSize.xxl, fontWeight: theme.fontWeight.bold, letterSpacing: '-0.02em' }}>
          Stay Awhile
        </div>
        <p style={{ fontSize: theme.fontSize.lg, color: c.text.muted, margin: 0, maxWidth: 420, lineHeight: 1.5 }}>
          Your cozy game starts here. This screen is a blank scaffold, not a game.
        </p>
        <p style={{ fontSize: theme.fontSize.sm, color: c.text.muted, margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
          Replace <code>src/starter/*</code> with your own world. The Run.Game SDK is already
          wired through <code>src/services/*</code> — read <code>AGENTS.md</code> for the surfaces
          worth reaching for in a cozy game (save state, gentle notifications, AI art &amp; audio,
          cosmetic purchases).
        </p>

        {isDev() && <SdkPanel />}
      </main>
    </div>
  );
}

export default StarterApp;
