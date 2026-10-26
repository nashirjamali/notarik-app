import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/Theme';
import SoftCircle from '../../assets/svg/onboarding-soft-circle.svg';
import Mark from '../../assets/svg/onboarding-mark.svg';

const camera = require('../../assets/icons/onboarding-camera.png');
const coffee = require('../../assets/icons/onboarding-coffee.png');
const groceries = require('../../assets/icons/onboarding-groceries.png');
const receipt = require('../../assets/icons/onboarding-receipt.png');

export default function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.surface }}
      contentContainerStyle={styles.content}
      bounces={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.frame, { backgroundColor: theme.surface }]}>
        <View style={styles.hero}>
          <View style={styles.softCircle}>
            <SoftCircle />
          </View>
          <View style={styles.mascot}>
            <View style={styles.mark}>
              <Mark />
            </View>
          </View>
          <View style={[styles.iconSlot, styles.cameraSlot]}>
            <Image source={camera} style={[styles.camera, styles.tiltCamera]} />
          </View>
          <View style={[styles.iconSlot, styles.coffeeSlot]}>
            <Image source={coffee} style={[styles.coffee, styles.tiltCoffee]} />
          </View>
          <View style={[styles.iconSlot, styles.groceriesSlot]}>
            <Image source={groceries} style={[styles.groceries, styles.tiltGroceries]} />
          </View>
          <View style={[styles.iconSlot, styles.receiptSlot]}>
            <Image source={receipt} style={[styles.receipt, styles.tiltReceipt]} />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={[styles.headline, { color: theme.text, ...theme.type.headline.hero }]}>
            Your money,{'\n'}sorted.
          </Text>
          <Text style={[styles.body, { color: theme.muted, ...theme.type.body2 }]}>
            Snap a receipt or just type it. Notarik does the rest.
          </Text>
        </View>

        <View style={styles.actions}>
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
        </View>
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
  hero: {
    position: 'absolute',
    top: 84,
    left: 0,
    width: 390,
    height: 380,
  },
  softCircle: {
    position: 'absolute',
    left: 55,
    top: 50,
  },
  mascot: {
    position: 'absolute',
    left: 135,
    top: 130,
    width: 120,
    height: 120,
  },
  mark: {
    position: 'absolute',
    left: 0,
    top: 8.82,
  },
  iconSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraSlot: {
    left: 40,
    top: 26.64,
    width: 108.426,
    height: 108.426,
  },
  coffeeSlot: {
    left: 258.8,
    top: 60,
    width: 88.043,
    height: 88.043,
  },
  groceriesSlot: {
    left: 28.38,
    top: 252,
    width: 101.113,
    height: 101.113,
  },
  receiptSlot: {
    left: 262,
    top: 232.72,
    width: 101.944,
    height: 101.944,
  },
  camera: {
    width: 96,
    height: 96,
  },
  coffee: {
    width: 76,
    height: 76,
  },
  groceries: {
    width: 92,
    height: 92,
  },
  receipt: {
    width: 88,
    height: 88,
  },
  tiltCamera: {
    transform: [{ rotate: '-8deg' }],
  },
  tiltCoffee: {
    transform: [{ rotate: '10deg' }],
  },
  tiltGroceries: {
    transform: [{ rotate: '6deg' }],
  },
  tiltReceipt: {
    transform: [{ rotate: '-10deg' }],
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
