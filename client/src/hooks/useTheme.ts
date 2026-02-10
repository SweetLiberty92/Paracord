import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { sanitizeCustomCss } from '../lib/security';

type ThemeName = 'dark' | 'light' | 'amoled';

const THEME_VARIABLES: Record<ThemeName, Record<string, string>> = {
  dark: {
    'color-bg-primary': '#10141d',
    'color-bg-secondary': '#141a26',
    'color-bg-tertiary': '#0a0f18',
    'color-bg-accent': '#1d2635',
    'color-bg-floating': 'rgba(10, 14, 23, 0.9)',
    'color-bg-mod-subtle': 'rgba(255, 255, 255, 0.05)',
    'color-bg-mod-strong': 'rgba(255, 255, 255, 0.12)',
    'color-text-primary': '#f2f6ff',
    'color-text-secondary': '#b6c2d9',
    'color-text-muted': '#8190ab',
    'color-text-link': '#7ecbff',
    'color-accent-primary': '#6f86ff',
    'color-accent-primary-hover': '#8a9dff',
    'color-accent-success': '#35c18f',
    'color-accent-danger': '#ff5d72',
    'color-accent-warning': '#ffce62',
    'color-border-subtle': 'rgba(161, 184, 230, 0.16)',
    'color-border-strong': 'rgba(177, 200, 242, 0.28)',
    'color-scrollbar-track': 'rgba(9, 13, 20, 0.42)',
    'color-scrollbar-thumb': 'rgba(129, 160, 219, 0.35)',
    'color-channel-icon': '#8a97b4',
    'color-interactive-normal': '#a8b4cc',
    'color-interactive-hover': '#e4edff',
    'color-interactive-active': '#f6f8ff',
    'color-interactive-muted': '#4f5a6f',
    'color-status-online': '#35c18f',
    'color-status-idle': '#ffce62',
    'color-status-dnd': '#ff5d72',
    'color-status-offline': '#6e7991',
    'color-status-streaming': '#8b6fff',
  },
  light: {
    'color-bg-primary': '#f4f7ff',
    'color-bg-secondary': '#e7ecf8',
    'color-bg-tertiary': '#dae2f2',
    'color-bg-accent': '#dde6fb',
    'color-bg-floating': 'rgba(249, 251, 255, 0.9)',
    'color-bg-mod-subtle': 'rgba(10, 28, 58, 0.07)',
    'color-bg-mod-strong': 'rgba(10, 28, 58, 0.13)',
    'color-text-primary': '#0f1b2d',
    'color-text-secondary': '#34435f',
    'color-text-muted': '#5a6984',
    'color-text-link': '#1f6dff',
    'color-accent-primary': '#476fff',
    'color-accent-primary-hover': '#345fee',
    'color-accent-success': '#1c9d71',
    'color-accent-danger': '#d73b61',
    'color-accent-warning': '#cc8b1f',
    'color-border-subtle': 'rgba(42, 66, 104, 0.18)',
    'color-border-strong': 'rgba(35, 58, 95, 0.3)',
    'color-scrollbar-track': 'rgba(52, 67, 95, 0.12)',
    'color-scrollbar-thumb': 'rgba(52, 67, 95, 0.32)',
    'color-channel-icon': '#4f5f7e',
    'color-interactive-normal': '#3f5070',
    'color-interactive-hover': '#21314f',
    'color-interactive-active': '#101f3a',
    'color-interactive-muted': '#95a3be',
    'color-status-online': '#1c9d71',
    'color-status-idle': '#cc8b1f',
    'color-status-dnd': '#d73b61',
    'color-status-offline': '#8d9ab4',
    'color-status-streaming': '#6a4dce',
  },
  amoled: {
    'color-bg-primary': '#05070d',
    'color-bg-secondary': '#090d17',
    'color-bg-tertiary': '#000000',
    'color-bg-accent': '#121a2a',
    'color-bg-floating': 'rgba(0, 0, 0, 0.94)',
    'color-bg-mod-subtle': 'rgba(255, 255, 255, 0.07)',
    'color-bg-mod-strong': 'rgba(255, 255, 255, 0.14)',
    'color-text-primary': '#f5f8ff',
    'color-text-secondary': '#b4bfd5',
    'color-text-muted': '#7987a2',
    'color-text-link': '#80b4ff',
    'color-accent-primary': '#7b8fff',
    'color-accent-primary-hover': '#92a4ff',
    'color-accent-success': '#3bcf98',
    'color-accent-danger': '#ff5f7f',
    'color-accent-warning': '#ffd271',
    'color-border-subtle': 'rgba(160, 183, 227, 0.17)',
    'color-border-strong': 'rgba(187, 210, 255, 0.3)',
    'color-scrollbar-track': 'rgba(2, 6, 12, 0.62)',
    'color-scrollbar-thumb': 'rgba(132, 162, 220, 0.34)',
    'color-channel-icon': '#8d9ab6',
    'color-interactive-normal': '#acb8cf',
    'color-interactive-hover': '#ebf1ff',
    'color-interactive-active': '#ffffff',
    'color-interactive-muted': '#4b576f',
    'color-status-online': '#3bcf98',
    'color-status-idle': '#ffd271',
    'color-status-dnd': '#ff5f7f',
    'color-status-offline': '#72819d',
    'color-status-streaming': '#8f70ff',
  },
};

const LEGACY_ALIASES: Record<string, string> = {
  'bg-primary': 'color-bg-primary',
  'bg-secondary': 'color-bg-secondary',
  'bg-tertiary': 'color-bg-tertiary',
  'bg-accent': 'color-bg-accent',
  'bg-floating': 'color-bg-floating',
  'bg-chat': 'color-bg-primary',
  'bg-mod-subtle': 'color-bg-mod-subtle',
  'bg-mod-strong': 'color-bg-mod-strong',
  'text-primary': 'color-text-primary',
  'text-secondary': 'color-text-secondary',
  'text-muted': 'color-text-muted',
  'text-link': 'color-text-link',
  'accent': 'color-accent-primary',
  'accent-primary': 'color-accent-primary',
  'accent-primary-hover': 'color-accent-primary-hover',
  'accent-success': 'color-accent-success',
  'accent-danger': 'color-accent-danger',
  'accent-warning': 'color-accent-warning',
  'border-subtle': 'color-border-subtle',
  'border-strong': 'color-border-strong',
  'channel-icon': 'color-channel-icon',
  'interactive-normal': 'color-interactive-normal',
  'interactive-hover': 'color-interactive-hover',
  'interactive-active': 'color-interactive-active',
  'interactive-muted': 'color-interactive-muted',
  'status-online': 'color-status-online',
  'status-idle': 'color-status-idle',
  'status-dnd': 'color-status-dnd',
  'status-offline': 'color-status-offline',
  'status-streaming': 'color-status-streaming',
  'scrollbar-auto-track': 'color-scrollbar-track',
  'scrollbar-auto-thumb': 'color-scrollbar-thumb',
};

export function useTheme() {
  const theme = useUIStore((s) => s.theme);
  const compactMode = useUIStore((s) => s.compactMode);
  const customCss = useUIStore((s) => s.customCss);
  const settings = useAuthStore((s) => s.settings);

  // Sync server-side theme preference when available
  const requestedTheme = settings?.theme || theme;
  const activeTheme: ThemeName =
    requestedTheme === 'light' || requestedTheme === 'amoled' || requestedTheme === 'dark'
      ? requestedTheme
      : 'dark';
  const compactFromSettings = Boolean(settings?.message_display_compact);
  const densityMode = compactMode || compactFromSettings ? 'compact' : 'default';

  useEffect(() => {
    const vars = THEME_VARIABLES[activeTheme] || THEME_VARIABLES.dark;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(vars)) {
      root.style.setProperty(`--${key}`, value);
    }
    for (const [legacyName, canonicalName] of Object.entries(LEGACY_ALIASES)) {
      const value = vars[canonicalName];
      if (value) {
        root.style.setProperty(`--${legacyName}`, value);
      }
    }
    root.setAttribute('data-theme', activeTheme);
    root.style.colorScheme = activeTheme === 'light' ? 'light' : 'dark';
  }, [activeTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', densityMode);
  }, [densityMode]);

  useEffect(() => {
    const id = 'paracord-custom-css';
    let styleEl = document.getElementById(id) as HTMLStyleElement | null;
    const css = sanitizeCustomCss(settings?.custom_css || customCss || '');
    if (css) {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = id;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    } else if (styleEl) {
      styleEl.remove();
    }
  }, [customCss, settings?.custom_css]);

  return { theme: activeTheme };
}
