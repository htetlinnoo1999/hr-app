import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { applyTheme, type Theme } from "@/lib/theme";

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** Color mode: explicit "light"/"dark", or "system" (follows the OS). */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** Advance light → dark → system → light. */
  cycleTheme: () => void;
}

const NEXT_THEME: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

/** UI preferences (persisted to localStorage so they survive reloads). */
export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      theme: "system",
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      cycleTheme: () => get().setTheme(NEXT_THEME[get().theme]),
    }),
    {
      name: "staffly.ui",
      storage: createJSONStorage(() => localStorage),
      // Re-apply the persisted theme once the store rehydrates (covers the
      // case where the pre-paint inline script and stored value diverge).
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
