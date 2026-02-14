import { useEffect, useRef } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { sanitizeCustomCss } from '../lib/security';

type ThemeName = 'dark' | 'light' | 'amoled';

const THEME_VARIABLES: Record<ThemeName, Record<string, string>> = {
  dark: {
    'color-bg-primary': '#0b1018',
    'color-bg-secondary': '#0f1420',
    'color-bg-tertiary': '#060a12',
    'color-bg-accent': '#151d2c',
    'color-bg-floating': 'rgba(7, 11, 18, 0.93)',
    'color-bg-mod-subtle': 'rgba(255, 255, 255, 0.04)',
    'color-bg-mod-strong': 'rgba(255, 255, 255, 0.1)',
    'color-text-primary': '#edf3ff',
    'color-text-secondary': '#aab8d1',
    'color-text-muted': '#7786a1',
    'color-text-link': '#7dc3ff',
    'color-accent-primary': '#6782ff',
    'color-accent-primary-hover': '#7e97ff',
    'color-accent-success': '#35c18f',
    'color-accent-danger': '#ff5d72',
    'color-accent-warning': '#ffce62',
    'color-border-subtle': 'rgba(157, 180, 223, 0.14)',
    'color-border-strong': 'rgba(176, 200, 244, 0.24)',
    'color-scrollbar-track': 'rgba(7, 10, 16, 0.46)',
    'color-scrollbar-thumb': 'rgba(126, 156, 214, 0.34)',
    'color-channel-icon': '#8897b5',
    'color-interactive-normal': '#a4b2cb',
    'color-interactive-hover': '#e3ecff',
    'color-interactive-active': '#f3f7ff',
    'color-interactive-muted': '#4b586f',
    'color-status-online': '#35c18f',
    'color-status-idle': '#ffce62',
    'color-status-dnd': '#ff5d72',
    'color-status-offline': '#6e7991',
    'color-status-streaming': '#8b6fff',
    'app-bg-layer-one': 'radial-gradient(130% 90% at 0% 0%, rgba(103, 130, 255, 0.1) 0%, rgba(103, 130, 255, 0) 52%)',
    'app-bg-layer-two': 'radial-gradient(120% 90% at 100% 0%, rgba(53, 193, 143, 0.07) 0%, rgba(53, 193, 143, 0) 44%)',
    'app-bg-base': 'linear-gradient(180deg, #05080f 0%, #04070d 100%)',
    'overlay-backdrop': 'rgba(1, 4, 10, 0.72)',
    'glass-rail-fill-top': 'rgba(255, 255, 255, 0.04)',
    'glass-rail-fill-bottom': 'rgba(255, 255, 255, 0.012)',
    'glass-panel-fill-top': 'rgba(255, 255, 255, 0.036)',
    'glass-panel-fill-bottom': 'rgba(255, 255, 255, 0.01)',
    'glass-modal-fill-top': 'rgba(11, 16, 26, 0.95)',
    'glass-modal-fill-bottom': 'rgba(7, 11, 18, 0.94)',
    'panel-divider-glint': 'rgba(255, 255, 255, 0.02)',
    'scrollbar-auto-thumb-hover': 'rgba(126, 156, 214, 0.5)',
    'sidebar-bg': 'rgba(6, 10, 16, 0.76)',
    'sidebar-border': 'rgba(255, 255, 255, 0.07)',
    'sidebar-active-indicator': 'var(--color-accent-primary)',
    'ambient-glow-primary': 'rgba(103, 130, 255, 0.15)',
    'ambient-glow-success': 'rgba(53, 193, 143, 0.09)',
    'ambient-glow-danger': 'rgba(255, 93, 114, 0.06)',
    'accent-primary-rgb': '103, 130, 255',
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
    'app-bg-layer-one': 'radial-gradient(120% 90% at 0% 0%, rgba(80, 103, 241, 0.2) 0%, rgba(80, 103, 241, 0) 54%)',
    'app-bg-layer-two': 'radial-gradient(115% 90% at 100% 0%, rgba(31, 159, 114, 0.15) 0%, rgba(31, 159, 114, 0) 48%)',
    'app-bg-base': 'linear-gradient(180deg, #edf2fb 0%, #e3eaf7 100%)',
    'overlay-backdrop': 'rgba(18, 26, 40, 0.4)',
    'glass-rail-fill-top': 'rgba(255, 255, 255, 0.78)',
    'glass-rail-fill-bottom': 'rgba(223, 232, 248, 0.64)',
    'glass-panel-fill-top': 'rgba(255, 255, 255, 0.72)',
    'glass-panel-fill-bottom': 'rgba(227, 236, 248, 0.58)',
    'glass-modal-fill-top': 'rgba(253, 255, 255, 0.94)',
    'glass-modal-fill-bottom': 'rgba(236, 243, 252, 0.94)',
    'panel-divider-glint': 'rgba(20, 44, 82, 0.08)',
    'scrollbar-auto-thumb-hover': 'rgba(88, 110, 150, 0.45)',
    'sidebar-bg': 'rgba(248, 251, 255, 0.74)',
    'sidebar-border': 'rgba(36, 58, 92, 0.14)',
    'sidebar-active-indicator': 'var(--color-accent-primary)',
    'ambient-glow-primary': 'rgba(80, 103, 241, 0.19)',
    'ambient-glow-success': 'rgba(31, 159, 114, 0.14)',
    'ambient-glow-danger': 'rgba(215, 59, 97, 0.08)',
    'accent-primary-rgb': '71, 111, 255',
  },
  amoled: {
    'color-bg-primary': '#000000',
    'color-bg-secondary': '#000000',
    'color-bg-tertiary': '#000000',
    'color-bg-accent': '#080a0f',
    'color-bg-floating': 'rgba(0, 0, 0, 0.98)',
    'color-bg-mod-subtle': 'rgba(255, 255, 255, 0.055)',
    'color-bg-mod-strong': 'rgba(255, 255, 255, 0.12)',
    'color-text-primary': '#f5f8ff',
    'color-text-secondary': '#aebad2',
    'color-text-muted': '#6f7d96',
    'color-text-link': '#8dc2ff',
    'color-accent-primary': '#748dff',
    'color-accent-primary-hover': '#8da3ff',
    'color-accent-success': '#3bcf98',
    'color-accent-danger': '#ff5f7f',
    'color-accent-warning': '#ffd271',
    'color-border-subtle': 'rgba(255, 255, 255, 0.12)',
    'color-border-strong': 'rgba(255, 255, 255, 0.22)',
    'color-scrollbar-track': 'rgba(255, 255, 255, 0.06)',
    'color-scrollbar-thumb': 'rgba(255, 255, 255, 0.26)',
    'color-channel-icon': '#8d9ab6',
    'color-interactive-normal': '#a9b5cd',
    'color-interactive-hover': '#edf2ff',
    'color-interactive-active': '#ffffff',
    'color-interactive-muted': '#4d5871',
    'color-status-online': '#3bcf98',
    'color-status-idle': '#ffd271',
    'color-status-dnd': '#ff5f7f',
    'color-status-offline': '#72819d',
    'color-status-streaming': '#8f70ff',
    'app-bg-layer-one': 'none',
    'app-bg-layer-two': 'none',
    'app-bg-base': '#000000',
    'overlay-backdrop': 'rgba(0, 0, 0, 0.86)',
    'glass-rail-fill-top': 'rgba(0, 0, 0, 0.9)',
    'glass-rail-fill-bottom': 'rgba(0, 0, 0, 0.9)',
    'glass-panel-fill-top': 'rgba(0, 0, 0, 0.86)',
    'glass-panel-fill-bottom': 'rgba(0, 0, 0, 0.86)',
    'glass-modal-fill-top': 'rgba(0, 0, 0, 0.94)',
    'glass-modal-fill-bottom': 'rgba(0, 0, 0, 0.94)',
    'panel-divider-glint': 'rgba(255, 255, 255, 0.02)',
    'scrollbar-auto-thumb-hover': 'rgba(255, 255, 255, 0.36)',
    'sidebar-bg': 'rgba(0, 0, 0, 0.94)',
    'sidebar-border': 'rgba(255, 255, 255, 0.12)',
    'sidebar-active-indicator': 'var(--color-accent-primary)',
    'ambient-glow-primary': 'transparent',
    'ambient-glow-success': 'transparent',
    'ambient-glow-danger': 'transparent',
    'accent-primary-rgb': '116, 141, 255',
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
  const setTheme = useUIStore((s) => s.setTheme);
  const compactMode = useUIStore((s) => s.compactMode);
  const customCss = useUIStore((s) => s.customCss);
  const settings = useAuthStore((s) => s.settings);
  const initializedFromServer = useRef(false);

  // Hydrate local theme once from server settings so user changes apply immediately.
  useEffect(() => {
    if (!settings) {
      initializedFromServer.current = false;
      return;
    }
    if (!initializedFromServer.current) {
      if (settings.theme === 'dark' || settings.theme === 'light' || settings.theme === 'amoled') {
        setTheme(settings.theme);
      }
      initializedFromServer.current = true;
    }
  }, [settings, setTheme]);

  const requestedTheme = theme;
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
