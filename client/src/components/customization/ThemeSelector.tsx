import { useState } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';

type ThemeId = 'dark' | 'light' | 'amoled';

interface ThemeSelectorProps {
  currentTheme?: ThemeId;
  onThemeChange?: (theme: ThemeId) => void;
}

const ACCENT_COLORS = [
  { name: 'Blurple', value: '#5865f2' },
  { name: 'Green', value: '#23a55a' },
  { name: 'Pink', value: '#eb459e' },
  { name: 'Yellow', value: '#fee75c' },
  { name: 'Red', value: '#ed4245' },
  { name: 'Teal', value: '#1abc9c' },
  { name: 'Orange', value: '#e67e22' },
  { name: 'Purple', value: '#9b59b6' },
];

const THEMES: { id: ThemeId; label: string; icon: React.ReactNode; preview: { bg: string; sidebar: string; chat: string } }[] = [
  {
    id: 'dark',
    label: 'Dark',
    icon: <Moon size={20} />,
    preview: { bg: '#1e1f22', sidebar: '#2b2d31', chat: '#313338' },
  },
  {
    id: 'light',
    label: 'Light',
    icon: <Sun size={20} />,
    preview: { bg: '#e3e5e8', sidebar: '#f2f3f5', chat: '#ffffff' },
  },
  {
    id: 'amoled',
    label: 'AMOLED',
    icon: <Monitor size={20} />,
    preview: { bg: '#000000', sidebar: '#0a0a0a', chat: '#000000' },
  },
];

function shadeHex(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const channel = (start: number) => {
    const raw = parseInt(normalized.slice(start, start + 2), 16);
    const next = Math.max(0, Math.min(255, Math.round(raw + amount)));
    return next.toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export function ThemeSelector({ currentTheme: externalTheme, onThemeChange }: ThemeSelectorProps) {
  const [internalTheme, setInternalTheme] = useState<ThemeId>('dark');
  const [selectedAccent, setSelectedAccent] = useState('#5865f2');

  const theme = externalTheme ?? internalTheme;

  const handleThemeChange = (newTheme: ThemeId) => {
    setInternalTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', newTheme);
    }
    onThemeChange?.(newTheme);
  };

  const handleAccentChange = (color: string) => {
    setSelectedAccent(color);
    document.documentElement.style.setProperty('--accent-primary', color);
    document.documentElement.style.setProperty('--color-accent-primary', color);
    document.documentElement.style.setProperty('--accent-primary-hover', shadeHex(color, 20));
    document.documentElement.style.setProperty('--color-accent-primary-hover', shadeHex(color, 20));
  };

  return (
    <div>
      {/* Theme selection */}
      <div className="mb-6">
        <div className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          Theme
        </div>
        <div className="flex gap-3">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className="relative flex flex-col items-center gap-2 rounded-lg overflow-hidden transition-all"
              style={{
                border: theme === t.id ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
                width: '140px',
              }}
            >
              {/* Mini preview */}
              <div className="w-full h-16 flex" style={{ backgroundColor: t.preview.bg }}>
                <div className="w-6" style={{ backgroundColor: t.preview.sidebar }} />
                <div className="w-10" style={{ backgroundColor: t.preview.sidebar, opacity: 0.8 }} />
                <div className="flex-1" style={{ backgroundColor: t.preview.chat }} />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <span
                  style={{ color: theme === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                >
                  {t.icon}
                </span>
                <span
                  className="text-sm font-medium"
                  style={{ color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {t.label}
                </span>
              </div>
              {theme === t.id && (
                <div
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Check size={12} color="#fff" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Accent color */}
      <div>
        <div className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          Accent Color
        </div>
        <div className="flex gap-2 flex-wrap">
          {ACCENT_COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => handleAccentChange(c.value)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{
                backgroundColor: c.value,
                border: selectedAccent === c.value ? '3px solid var(--text-primary)' : '3px solid transparent',
              }}
              title={c.name}
            >
              {selectedAccent === c.value && <Check size={16} color="#fff" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
