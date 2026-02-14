import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useServerListStore } from '../stores/serverListStore';
import { gateway } from '../gateway/connection';
import { connectionManager } from '../lib/connectionManager';

export function useGateway() {
  const token = useAuthStore((s) => s.token);
  const serverCount = useServerListStore((s) => s.servers.length);
  const managedServerCount = useServerListStore((s) =>
    s.servers.filter((server) => Boolean(server.token)).length
  );

  useEffect(() => {
    if (!token) {
      gateway.disconnect();
      connectionManager.disconnectAll();
      return;
    }

    // Multi-server mode owns gateway sockets via connectionManager.
    // Keep the legacy singleton gateway disconnected to avoid duplicate
    // sockets for the same user/session.
    if (serverCount > 0 && managedServerCount > 0) {
      gateway.disconnect();
      connectionManager.connectAll().catch(() => {
        // Per-server errors are handled inside connectionManager.
      });
      return;
    }

    gateway.connect();

    return () => {
      gateway.disconnect();
    };
  }, [token, serverCount, managedServerCount]);
}
