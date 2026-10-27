import { useCallback, useEffect, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, type ImageSourcePropType } from "react-native";

import { ICON_DIRECTION, ICON_IDLE, IDLE, TAP, type IconName } from "./motion";

export type Slot = { left: number; top: number; size: number };

type Props = {
  name: IconName;
  source: ImageSourcePropType;
  slot: Slot;
  imageSize: number;
  tiltDeg: number;
  /** Where the mascot centre is, in hero coordinates; the icon pops out from there. */
  origin: { x: number; y: number };
  enterDelay: number;
  /** 0 to 1 and back; the mascot tap pushes every icon outward with it. */
  nudge: Animated.Value;
  ready: boolean;
  reduce: boolean;
  active: boolean;
  /** True once the entrance is over, when the idle bob may start. */
  settled: boolean;
};

const mix = (value: Animated.Value, from: number, to: number) =>
  value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

/** One 3D icon: pops out of the mascot, bobs on its own rhythm and wiggles when tapped. */
export function FloatingIcon({
  name,
  source,
  slot,
  imageSize,
  tiltDeg,
  origin,
  enterDelay,
  nudge,
  ready,
  reduce,
  active,
  settled,
}: Props) {
  const [enter] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(0));
  const [wiggle] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!ready) return;
    if (reduce) {
      enter.setValue(1);
      return;
    }
    const animation = Animated.sequence([
      Animated.delay(enterDelay),
      Animated.spring(enter, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [ready, reduce, enterDelay, enter]);

  const idle = ICON_IDLE[name];
  const looping = ready && !reduce && settled && active;
  useEffect(() => {
    if (!looping) return;
    const half = idle.periodMs / 2;
    const animation = Animated.sequence([
      Animated.delay(idle.delayMs),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bob, { toValue: 1, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: 0, duration: half, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [looping, idle.periodMs, idle.delayMs, bob]);

  const onPress = useCallback(() => {
    if (!ready || reduce) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(pop, { toValue: 1, duration: TAP.iconPopMs, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 0, friction: 4, tension: 140, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(wiggle, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.spring(wiggle, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
      ]),
    ]).start();
  }, [ready, reduce, pop, wiggle]);

  const direction = ICON_DIRECTION[name];
  const fromX = origin.x - (slot.left + slot.size / 2);
  const fromY = origin.y - (slot.top + slot.size / 2);

  return (
    <Pressable
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      onPress={onPress}
      style={[styles.slot, { left: slot.left, top: slot.top, width: slot.size, height: slot.size }]}
    >
      <Animated.View
        style={{
          opacity: enter.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            { translateX: mix(enter, fromX, 0) },
            { translateY: mix(enter, fromY, 0) },
            { translateY: mix(bob, 0, -IDLE.iconBob * idle.phase) },
            { translateX: mix(nudge, 0, direction.x * TAP.nudge) },
            { translateY: mix(nudge, 0, direction.y * TAP.nudge) },
            {
              rotate: bob.interpolate({
                inputRange: [0, 1],
                outputRange: [`${-IDLE.iconSwayDeg * idle.phase}deg`, `${IDLE.iconSwayDeg * idle.phase}deg`],
              }),
            },
            { rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: [`-${TAP.wiggleDeg}deg`, `${TAP.wiggleDeg}deg`] }) },
            { scale: mix(enter, 0.3, 1) },
            { scale: mix(pop, 1, TAP.iconPopScale) },
          ],
        }}
      >
        <Image
          source={source}
          style={{ width: imageSize, height: imageSize, transform: [{ rotate: `${tiltDeg}deg` }] }}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { position: "absolute", alignItems: "center", justifyContent: "center" },
});
