import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useColorScheme } from "react-native";

import {
  getThemePreference,
  restoreThemePreference,
  subscribeThemePreference,
} from "@/lib/themePreference";
import { dark, light, type Theme } from "./tokens";

const ThemeContext = createContext<Theme>(light);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const preference = useSyncExternalStore(subscribeThemePreference, getThemePreference, getThemePreference);
  useEffect(() => {
    void restoreThemePreference();
  }, []);
  const resolved = preference === "system" ? scheme : preference;
  return (
    <ThemeContext.Provider value={resolved === "dark" ? dark : light}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
