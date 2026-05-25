import { create } from "zustand";

type Theme = "light" | "dark";

const STORAGE_KEY = "pmc_theme";

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "dark";
}

function applyThemeToDom(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

// Apply immediately on module load so there's no flash before React mounts
applyThemeToDom(readStoredTheme());

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    // Apply to DOM directly — don't wait for a React re-render cycle
    applyThemeToDom(theme);
    // Persist as a plain string so localStorage.getItem("pmc_theme") returns "light"/"dark"
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    // Update Zustand state so subscribers (ThemeToggle icon, etc.) re-render
    set({ theme });
  },
}));
