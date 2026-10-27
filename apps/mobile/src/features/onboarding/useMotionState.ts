import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, AppState } from "react-native";

/** `ready` turns true once the OS answer is known; `reduce` is the "reduce motion" setting. */
export function useReduceMotion(): { ready: boolean; reduce: boolean } {
  const [state, setState] = useState({ ready: false, reduce: false });
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => alive && setState({ ready: true, reduce }))
      // Without an answer, play the motion rather than hide the screen.
      .catch(() => alive && setState({ ready: true, reduce: false }));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduce) =>
      setState({ ready: true, reduce }),
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return state;
}

/** True while the screen is focused and the app is in the foreground; loops stop otherwise. */
export function useScreenActive(): boolean {
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === "active");

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setForeground(next === "active"));
    return () => subscription.remove();
  }, []);

  return focused && foreground;
}
