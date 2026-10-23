import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "./ThemeContext";

const DEFAULT_THEME_VALUE: ThemeContextValue = {
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  return context ?? DEFAULT_THEME_VALUE;
}
