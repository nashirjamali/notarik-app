import { createContext, useContext, type ReactNode } from "react";

import { light, type Theme } from "./tokens";

const ThemeContext = createContext<Theme>(light);

// Light only: the designs and some icons have no dark version yet, so the app
// ignores the system appearance. Bring back a dark choice once they exist.
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={light}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
