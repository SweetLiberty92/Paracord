import { useEffect, type ReactNode } from 'react';
import { useGateway } from '../hooks/useGateway';
import { useTheme } from '../hooks/useTheme';
import { useVoiceKeybinds } from '../hooks/useVoiceKeybinds';
import { useAuthStore } from '../stores/authStore';
import { useGuildStore } from '../stores/guildStore';

function AppInitializer({ children }: { children: ReactNode }) {
  // Initialize gateway connection when authenticated
  useGateway();
  // Apply theme CSS variables on mount and when theme changes
  useTheme();
  // Register global voice keybind handlers from user settings
  useVoiceKeybinds();
  const token = useAuthStore((s) => s.token);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const fetchGuilds = useGuildStore((s) => s.fetchGuilds);

  useEffect(() => {
    if (token) {
      void fetchUser();
      void fetchGuilds();
    }
  }, [token, fetchUser, fetchGuilds]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return <AppInitializer>{children}</AppInitializer>;
}
