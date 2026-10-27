import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

import { ENTRANCE } from "./motion";

/** Fades its children in while they rise a few px. Taps work from the first frame. */
export function FadeUp({
  ready,
  reduce,
  delay,
  style,
  children,
}: {
  ready: boolean;
  reduce: boolean;
  delay: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!ready) return;
    if (reduce) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: ENTRANCE.fadeMs,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [ready, reduce, delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [ENTRANCE.riseFrom, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
