import {
  useCallback,
  useLayoutEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ThemeContext, THEME_STORAGE_KEY, applyThemeToDom } from "./ThemeContext";
import type { Theme } from "./ThemeContext";

function readStoredTheme(): Theme {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

    return storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : "light";
  } catch {
    return "light";
  }
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The in-memory theme remains usable when storage is unavailable.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initialTheme = readStoredTheme();
    applyThemeToDom(initialTheme);
    return initialTheme;
  });

  useLayoutEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: Theme): void => {
    applyThemeToDom(nextTheme);
    storeTheme(nextTheme);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback((): void => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
