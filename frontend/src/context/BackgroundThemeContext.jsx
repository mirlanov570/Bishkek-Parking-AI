import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const BACKGROUND_THEME_STORAGE_KEY = 'bishkek-parking-background-theme';

export const BACKGROUND_THEMES = [
  {
    id: 'light',
    label: 'Light',
    title: 'Светлая тема',
  },
  {
    id: 'blue',
    label: 'Blue',
    title: 'Синяя тема',
  },
  {
    id: 'dark',
    label: 'Dark',
    title: 'Темная тема',
  },
];

const DEFAULT_BACKGROUND_THEME = BACKGROUND_THEMES[0].id;

const LEGACY_THEME_MAP = {
  ethereal: 'blue',
  inferno: 'dark',
};

const BackgroundThemeContext = createContext(null);

const isValidTheme = (themeId) => BACKGROUND_THEMES.some((theme) => theme.id === themeId);

const normalizeTheme = (themeId) => {
  if (LEGACY_THEME_MAP[themeId]) {
    return LEGACY_THEME_MAP[themeId];
  }

  return themeId;
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_BACKGROUND_THEME;
  }

  const savedTheme = normalizeTheme(window.localStorage.getItem(BACKGROUND_THEME_STORAGE_KEY));

  return isValidTheme(savedTheme) ? savedTheme : DEFAULT_BACKGROUND_THEME;
};

export function BackgroundThemeProvider({ children }) {
  const [backgroundTheme, setBackgroundThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.backgroundTheme = backgroundTheme;
    window.localStorage.setItem(BACKGROUND_THEME_STORAGE_KEY, backgroundTheme);
  }, [backgroundTheme]);

  const setBackgroundTheme = (themeId) => {
    const nextTheme = normalizeTheme(themeId);

    if (!isValidTheme(nextTheme)) return;

    setBackgroundThemeState(nextTheme);
  };

  const value = useMemo(
    () => ({
      backgroundTheme,
      themes: BACKGROUND_THEMES,
      setBackgroundTheme,
    }),
    [backgroundTheme],
  );

  return (
    <BackgroundThemeContext.Provider value={value}>
      {children}
    </BackgroundThemeContext.Provider>
  );
}

export function useBackgroundTheme() {
  const context = useContext(BackgroundThemeContext);

  if (!context) {
    throw new Error('useBackgroundTheme must be used inside BackgroundThemeProvider');
  }

  return context;
}