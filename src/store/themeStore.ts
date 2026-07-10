import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'clockly-theme';

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return mode === 'dark';
}

function applyTheme(isDark: boolean) {
  const root = document.documentElement;
  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0f1016' : '#f8f7fb');
}

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const initialMode = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system';
const initialIsDark = resolveIsDark(initialMode);
if (typeof document !== 'undefined') applyTheme(initialIsDark);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  isDark: initialIsDark,
  setMode: (mode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    const isDark = resolveIsDark(mode);
    applyTheme(isDark);
    set({ mode, isDark });
  },
}));
