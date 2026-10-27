import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { keyboardCover, sheetMaxHeight, shouldCloseOnPull } from "@/lib/sheet";
import { useTheme } from "@/theme/Theme";
import Close from "../../assets/svg/sheet-x.svg";

type Props = {
  title: string;
  subtitle?: string;
  /** Called once the sheet has slid away. Leave the screen here. */
  onClosed: () => void;
  /** The sticky bar under the content, usually the Save button. */
  footer?: ReactNode;
  /** The space between the content blocks. */
  gap?: number;
  children: ReactNode;
};

/**
 * The modal bottom sheet of the app (Quick add, Edit budgets). It fades a scrim in, slides up, and
 * closes by the X, a tap on the scrim or a pull down on its top. It sits on top of the keyboard and is
 * only as tall as its content, never taller than the room under the status bar.
 *
 * Use it inside a screen presented as a `transparentModal` with `animation: "none"`.
 */
export function BottomSheet({ title, subtitle, onClosed, footer, gap = 20, children }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [slide] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const [keyboard, setKeyboard] = useState(0);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    Animated.timing(slide, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide]);

  useEffect(() => {
    const ios = Platform.OS === "ios";
    const show = Keyboard.addListener(ios ? "keyboardWillChangeFrame" : "keyboardDidShow", (event) =>
      setKeyboard(keyboardCover(height, event.endCoordinates.screenY)),
    );
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [height]);

  // Closing is a state, so the slide out always ends in the latest `onClosed`.
  useEffect(() => {
    if (!closing) return;
    let cancelled = false;
    Keyboard.dismiss();
    Animated.timing(slide, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (!cancelled) onClosed();
    });
    return () => {
      cancelled = true;
    };
  }, [closing, onClosed, slide]);

  // Pulling the top of the sheet down closes it; letting go early springs it back.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => drag.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (shouldCloseOnPull(gesture.dy, gesture.vy)) {
          setClosing(true);
          Animated.timing(drag, { toValue: 0, duration: 0, useNativeDriver: true }).start();
        } else {
          Animated.spring(drag, { toValue: 0, friction: 8, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );

  const close = () => setClosing(true);

  return (
    <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: slide }]}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
        />
      </Animated.View>
      <View style={styles.avoid} pointerEvents="box-none">
        <Animated.View
          onLayout={(event) => setMeasuredHeight(event.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            {
              maxHeight: sheetMaxHeight(height, insets.top, keyboard),
              marginBottom: keyboard,
              backgroundColor: theme.surface,
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [measuredHeight || height, 0] }) },
                { translateY: drag },
              ],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={[styles.grabber, { backgroundColor: theme.border }]} />
            <View style={styles.header}>
              <View style={styles.titles}>
                <Text accessibilityRole="header" style={{ color: theme.text, ...theme.type.body1Bold }}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>{subtitle}</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close sheet"
                onPress={close}
                style={[styles.closeButton, { backgroundColor: theme.bg }]}
              >
                <Close />
              </Pressable>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={[styles.content, { gap }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? (
            <View
              style={[
                styles.footer,
                { backgroundColor: theme.surface, paddingBottom: keyboard > 0 ? 12 : Math.max(insets.bottom, 0) + 24 },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  avoid: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: {
    width: "100%",
    maxWidth: 430,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
  },
  grabber: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  titles: { flexShrink: 1 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
});
