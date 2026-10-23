import { createContext } from "react";

export type Theme = "light" | "dark";

export type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

export const THEME_STORAGE_KEY = "ecoplaza-theme";

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function applyThemeToDom(theme: Theme): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const body = document.body;

  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    if (body) {
      body.classList.add("dark");
      body.classList.remove("light");
    }
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    if (body) {
      body.classList.remove("dark");
      body.classList.add("light");
    }
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  }
}
