import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ServerConnectPage } from './pages/ServerConnectPage';
import { AppLayout } from './pages/AppLayout';
import { GuildPage } from './pages/GuildPage';
import { DMPage } from './pages/DMPage';
import { FriendsPage } from './pages/FriendsPage';
import { SettingsPage } from './pages/SettingsPage';
import { GuildSettingsPage } from './pages/GuildSettingsPage';
import { AdminPage } from './pages/AdminPage';
import { InvitePage } from './pages/InvitePage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { useAuthStore } from './stores/authStore';
import { getStoredServerUrl } from './lib/apiBaseUrl';

/**
 * Checks whether we need a server URL configured before proceeding.
 *
 * Returns:
 *   'ready'   - server URL is available (stored or same-origin auto-detected)
 *   'needed'  - no server URL and same-origin health check failed
 *   'loading' - still probing
 */
function useServerStatus() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'needed'>(() => {
    // If we already have a stored server URL, no need to probe
    if (getStoredServerUrl()) return 'ready';
    // If env var is set, we're also ready
    if (import.meta.env.VITE_API_URL || import.meta.env.VITE_WS_URL) return 'ready';
    return 'loading';
  });

  useEffect(() => {
    if (status !== 'loading') return;

    let cancelled = false;

    // Probe same-origin /health to see if we're served from the server itself
    fetch('/health', { signal: AbortSignal.timeout(5_000) })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.service === 'paracord') {
          setStatus('ready');
        } else {
          setStatus('needed');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('needed');
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  return status;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const serverStatus = useServerStatus();

  if (serverStatus === 'loading') {
    return (
      <div className="auth-shell">
        <p className="text-text-muted">Connecting...</p>
      </div>
    );
  }

  if (serverStatus === 'needed') {
    return <Navigate to="/connect" />;
  }

  if (!token) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const serverStatus = useServerStatus();

  if (serverStatus === 'loading') {
    return (
      <div className="auth-shell">
        <p className="text-text-muted">Connecting...</p>
      </div>
    );
  }

  if (serverStatus === 'needed') {
    return <Navigate to="/connect" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/connect" element={<ServerConnectPage />} />
      <Route path="/login" element={<AuthRoute><LoginPage /></AuthRoute>} />
      <Route path="/register" element={<AuthRoute><RegisterPage /></AuthRoute>} />
      <Route path="/invite/:code" element={<InvitePage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<FriendsPage />} />
        <Route path="guilds/:guildId/channels/:channelId" element={<GuildPage />} />
        <Route path="dms" element={<DMPage />} />
        <Route path="dms/:channelId" element={<DMPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="guilds/:guildId/settings" element={<GuildSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" />} />
    </Routes>
  );
}
