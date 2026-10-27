import { useCallback, useEffect, useState } from "react";
import { Animated, Easing } from "react-native";

import { BLINK, ENTRANCE, eyeOffset, IDLE, isDoubleBlink, leanDegrees, nextBlinkDelay, TAP } from "./motion";

type Options = {
  ready: boolean;
  reduce: boolean;
  active: boolean;
  /** Changes every time the screen is opened; each new value replays the entrance. */
  visits: number;
};

const sine = Easing.inOut(Easing.sin);

/** All the animated values of the soft circle and the mascot, plus what to call on a tap or touch. */
export function useHeroMotion({ ready, reduce, active, visits }: Options) {
  const [circle] = useState(() => new Animated.Value(0));
  const [drop] = useState(() => new Animated.Value(0));
  const [land] = useState(() => new Animated.Value(0));
  const [hopY] = useState(() => new Animated.Value(0));
  const [float] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [blink] = useState(() => new Animated.Value(1));
  const [eyesScale] = useState(() => new Animated.Value(1));
  const [lookX] = useState(() => new Animated.Value(0));
  const [lookY] = useState(() => new Animated.Value(0));
  const [lean] = useState(() => new Animated.Value(0));
  const [nudge] = useState(() => new Animated.Value(0));
  // The visit whose entrance has finished; a new visit starts out not entered again.
  const [finishedVisit, setFinishedVisit] = useState(0);
  // With reduce motion there is no entrance to wait for.
  const entered = ready && (reduce || finishedVisit === visits);

  // Entrance: soft circle grows while the mascot drops, lands with a squash and settles.
  useEffect(() => {
    if (!ready) return;
    if (reduce) {
      circle.setValue(1);
      drop.setValue(1);
      return;
    }
    // A later visit starts from the hidden state again.
    circle.setValue(0);
    drop.setValue(0);
    land.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(circle, {
        toValue: 1,
        duration: ENTRANCE.circleMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(drop, {
          toValue: 1,
          duration: ENTRANCE.mascotLandMs,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(land, { toValue: 1, duration: ENTRANCE.squashMs, useNativeDriver: true }),
        Animated.spring(land, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
      ]),
    ]);
    animation.start((result) => result.finished && setFinishedVisit(visits));
    return () => animation.stop();
  }, [ready, reduce, visits, circle, drop, land]);

  const looping = ready && !reduce && entered && active;

  // Idle: float and breathe, each on its own period so they drift apart.
  useEffect(() => {
    if (!looping) return;
    const loopBetween = (value: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: ms / 2, easing: sine, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: ms / 2, easing: sine, useNativeDriver: true }),
        ]),
      );
    const floating = loopBetween(float, IDLE.mascotFloatMs);
    const breathing = loopBetween(breathe, IDLE.mascotFloatMs * 1.15);
    floating.start();
    breathing.start();
    return () => {
      floating.stop();
      breathing.stop();
    };
  }, [looping, float, breathe]);

  // Idle: blink at random intervals.
  useEffect(() => {
    if (!looping) return;
    let timer: ReturnType<typeof setTimeout>;
    let blinking: Animated.CompositeAnimation | null = null;
    const schedule = () => {
      timer = setTimeout(() => {
        const once = () => [
          Animated.timing(blink, { toValue: BLINK.closedScale, duration: BLINK.closeMs, useNativeDriver: true }),
          Animated.timing(blink, { toValue: 1, duration: BLINK.openMs, useNativeDriver: true }),
        ];
        // Now and then it blinks twice in a row.
        blinking = Animated.sequence(
          isDoubleBlink() ? [...once(), Animated.delay(BLINK.doubleGapMs), ...once()] : once(),
        );
        blinking.start(({ finished }) => finished && schedule());
      }, nextBlinkDelay());
    };
    schedule();
    return () => {
      clearTimeout(timer);
      blinking?.stop();
      blink.setValue(1);
    };
  }, [looping, blink]);

  /** The mascot hops, its eyes widen and the icons get pushed outward, then everything settles. */
  const hop = useCallback(() => {
    if (!ready || reduce) return;
    Animated.sequence([
      Animated.parallel([
        Animated.timing(hopY, {
          toValue: -TAP.hopHeight,
          duration: TAP.hopUpMs,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(eyesScale, { toValue: 1.08, friction: 5, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(nudge, { toValue: 1, duration: TAP.hopUpMs, useNativeDriver: true }),
          Animated.spring(nudge, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
        ]),
      ]),
      Animated.timing(hopY, {
        toValue: 0,
        duration: TAP.hopDownMs,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(land, { toValue: 1, duration: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(land, { toValue: 0, friction: 4, tension: 160, useNativeDriver: true }),
        Animated.spring(eyesScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      ]),
    ]).start();
  }, [ready, reduce, hopY, eyesScale, nudge, land]);

  /** The pupils and the lean follow a touch at (dx, dy) from the mascot centre. */
  const look = useCallback(
    (dx: number, dy: number) => {
      if (!ready || reduce) return;
      const offset = eyeOffset(dx, dy);
      lookX.setValue(offset.x);
      lookY.setValue(offset.y);
      lean.setValue(leanDegrees(dx));
    },
    [ready, reduce, lookX, lookY, lean],
  );

  const release = useCallback(() => {
    Animated.parallel(
      [lookX, lookY, lean].map((value) =>
        Animated.spring(value, { toValue: 0, friction: 6, tension: 80, useNativeDriver: true }),
      ),
    ).start();
  }, [lookX, lookY, lean]);

  return {
    circle,
    drop,
    land,
    hopY,
    float,
    breathe,
    blink,
    eyesScale,
    lookX,
    lookY,
    lean,
    nudge,
    entered,
    hop,
    look,
    release,
  };
}

export type HeroMotion = ReturnType<typeof useHeroMotion>;
