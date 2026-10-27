import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { FadeUp } from '@/features/onboarding/FadeUp';
import { ENTRANCE } from '@/features/onboarding/motion';
import { OnboardingHero } from '@/features/onboarding/OnboardingHero';
import { useReduceMotion, useScreenActive } from '@/features/onboarding/useMotionState';
import { useTheme } from '@/theme/Theme';

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const motion = useReduceMotion();
  const { active, visits } = useScreenActive();
  const reduce = motion.reduce;
  // The entrance plays on the first focus and again every time the screen is opened.
  const ready = motion.ready && visits > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={styles.content}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.frame, { backgroundColor: theme.surface }]}>
        <OnboardingHero ready={ready} reduce={reduce} active={active} visits={visits} />

        <FadeUp ready={ready} reduce={reduce} visits={visits} delay={ENTRANCE.copyStartMs} style={styles.copy}>
          <Text style={[styles.headline, { color: theme.text, ...theme.type.headline.hero }]}>
            Your money,{'\n'}sorted.
          </Text>
          <Text style={[styles.body, { color: theme.muted, ...theme.type.body2 }]}>
            Snap a receipt or just type it. Notarik does the rest.
          </Text>
        </FadeUp>

        <FadeUp ready={ready} reduce={reduce} visits={visits} delay={ENTRANCE.buttonsStartMs} style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/signup')}
            style={({ pressed }) => [
              styles.primary,
              {
                height: theme.buttonHeights.primary,
                borderRadius: theme.radius.md,
                backgroundColor: theme.accent,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ color: theme.accentText, ...theme.type.button1 }}>Get started</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [
              styles.secondary,
              {
                height: theme.buttonHeights.secondary,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ color: theme.text, ...theme.type.button1 }}>I already have an account</Text>
          </Pressable>
        </FadeUp>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
  },
  frame: {
    width: '100%',
    maxWidth: 390,
    minHeight: 844,
    flexGrow: 1,
  },
  copy: {
    position: 'absolute',
    top: 500,
    left: 24,
    width: 342,
    gap: 12,
  },
  headline: {
    fontWeight: '700',
  },
  body: {
    fontWeight: '400',
  },
  actions: {
    position: 'absolute',
    top: 690,
    left: 24,
    width: 342,
    gap: 8,
  },
  primary: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
