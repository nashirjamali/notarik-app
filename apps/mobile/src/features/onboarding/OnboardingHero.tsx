import { useRef, useState, type ComponentRef } from "react";
import { Animated, Platform, StyleSheet, View, type GestureResponderEvent, type ViewProps } from "react-native";

import SoftCircle from "../../../assets/svg/onboarding-soft-circle.svg";
import { FloatingIcon, type Slot } from "./FloatingIcon";
import { Mascot } from "./Mascot";
import { ICON_ORDER, staggerDelay, type IconName } from "./motion";
import { useHeroMotion } from "./useHeroMotion";
import { useScreenActive } from "./useMotionState";

const camera = require("../../../assets/icons/onboarding-camera.png");
const coffee = require("../../../assets/icons/onboarding-coffee.png");
const groceries = require("../../../assets/icons/onboarding-groceries.png");
const receipt = require("../../../assets/icons/onboarding-receipt.png");

// The mascot centre in hero coordinates: slot (135, 130) plus half of 120 x 120.
const MASCOT_CENTER = { x: 195, y: 181 };

const ICONS: Record<IconName, { source: number; slot: Slot; imageSize: number; tiltDeg: number }> = {
  camera: { source: camera, slot: { left: 40, top: 26.64, size: 108.426 }, imageSize: 96, tiltDeg: -8 },
  coffee: { source: coffee, slot: { left: 258.8, top: 60, size: 88.043 }, imageSize: 76, tiltDeg: 10 },
  groceries: { source: groceries, slot: { left: 28.38, top: 252, size: 101.113 }, imageSize: 92, tiltDeg: 6 },
  receipt: { source: receipt, slot: { left: 262, top: 232.72, size: 101.944 }, imageSize: 88, tiltDeg: -10 },
};

/** The hero of the onboarding screen: soft circle, mascot and four icons that move and react to touch. */
export function OnboardingHero({ ready, reduce }: { ready: boolean; reduce: boolean }) {
  const active = useScreenActive();
  const motion = useHeroMotion({ ready, reduce, active });
  const heroRef = useRef<ComponentRef<typeof View>>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [measured, setMeasured] = useState(false);

  function measure() {
    heroRef.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
      setMeasured(true);
    });
  }

  function follow(event: GestureResponderEvent) {
    if (!measured) return;
    const native = event.nativeEvent as unknown as { pageX?: number; pageY?: number; clientX?: number; clientY?: number };
    const x = Platform.OS === "web" ? (native.clientX ?? native.pageX) : native.pageX;
    const y = Platform.OS === "web" ? (native.clientY ?? native.pageY) : native.pageY;
    if (x == null || y == null) return;
    motion.look(x - origin.current.x - MASCOT_CENTER.x, y - origin.current.y - MASCOT_CENTER.y);
  }

  const pointerProps: ViewProps =
    Platform.OS === "web"
      ? ({
          onPointerEnter: measure,
          onPointerMove: follow,
          onPointerLeave: motion.release,
        } as unknown as ViewProps)
      : {};

  return (
    <View
      ref={heroRef}
      style={styles.hero}
      onLayout={measure}
      onTouchStart={(event) => {
        measure();
        follow(event);
      }}
      onTouchMove={follow}
      onTouchEnd={motion.release}
      onTouchCancel={motion.release}
      {...pointerProps}
    >
      <Animated.View
        style={[
          styles.softCircle,
          {
            opacity: motion.circle,
            transform: [
              { scale: motion.circle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
            ],
          },
        ]}
      >
        <SoftCircle />
      </Animated.View>
      <Mascot motion={motion} />
      {ICON_ORDER.map((name, index) => (
        <FloatingIcon
          key={name}
          name={name}
          {...ICONS[name]}
          origin={MASCOT_CENTER}
          enterDelay={staggerDelay(index)}
          nudge={motion.nudge}
          ready={ready}
          reduce={reduce}
          active={active}
          settled={motion.entered}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: "absolute", top: 84, left: 0, width: 390, height: 380 },
  softCircle: { position: "absolute", left: 55, top: 50 },
});
