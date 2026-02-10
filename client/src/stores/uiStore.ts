import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'amoled';

interface UIState {
  sidebarOpen: boolean;
  memberSidebarOpen: boolean;
  theme: Theme;
  customCss: string;
  compactMode: boolean;

  toggleSidebar: () => void;
  toggleMemberSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setCustomCss: (css: string) => void;
  setCompactMode: (compact: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      memberSidebarOpen: true,
      theme: 'dark',
      customCss: '',
      compactMode: false,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleMemberSidebar: () => set((s) => ({ memberSidebarOpen: !s.memberSidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setCustomCss: (customCss) => set({ customCss }),
      setCompactMode: (compactMode) => set({ compactMode }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        customCss: state.customCss,
        compactMode: state.compactMode,
        memberSidebarOpen: state.memberSidebarOpen,
      }),
    }
  )
);
