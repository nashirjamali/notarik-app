import { Animated, Pressable, StyleSheet, View } from "react-native";

import Body from "../../../assets/svg/mascot-body.svg";
import Eyes from "../../../assets/svg/mascot-eyes.svg";
import Pupils from "../../../assets/svg/mascot-pupils.svg";
import { IDLE, TAP } from "./motion";
import type { HeroMotion } from "./useHeroMotion";

// The three layers are 120 x 102.353 and share one coordinate space, so they stack exactly.
const MARK_HEIGHT = 102.353;
// The eyes are centred at y = 41.9; blinking squashes them around that line, not the layer centre.
const EYE_LINE = 41.9 - MARK_HEIGHT / 2;

const mix = (value: Animated.Value, from: number, to: number) =>
  value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

/** The Notarik mark: body, eyes that blink and pupils that follow a touch. Decorative for screen readers. */
export function Mascot({ motion }: { motion: HeroMotion }) {
  const { drop, land, hopY, float, breathe, blink, eyesScale, lookX, lookY, lean } = motion;
  return (
    <Pressable
      accessible={false}
      onPress={motion.hop}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={styles.slot}
    >
      <Animated.View
        style={[
          styles.mark,
          {
            opacity: drop.interpolate({ inputRange: [0, 0.3], outputRange: [0, 1], extrapolate: "clamp" }),
            transform: [
              { translateY: mix(drop, -60, 0) },
              { translateY: hopY },
              { translateY: mix(float, 0, -IDLE.mascotFloat) },
              { rotate: lean.interpolate({ inputRange: [-10, 10], outputRange: ["-10deg", "10deg"] }) },
              { scaleX: mix(land, 1, 1.1) },
              { scaleY: mix(land, 1, TAP.landSquashY) },
              { scale: mix(breathe, 1, IDLE.breatheTo) },
            ],
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <Body />
        </View>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                { translateY: EYE_LINE },
                { scaleY: blink },
                { translateY: -EYE_LINE },
                { scale: eyesScale },
              ],
            },
          ]}
        >
          <Eyes />
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform: [{ translateX: lookX }, { translateY: lookY }] }]}
          >
            <Pupils />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { position: "absolute", left: 135, top: 130, width: 120, height: 120 },
  mark: { position: "absolute", left: 0, top: 8.82, width: 120, height: MARK_HEIGHT },
});
