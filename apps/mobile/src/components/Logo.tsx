import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/Theme';

export function Logo({ size = 'default' }: { size?: 'default' | 'small' }) {
  const theme = useTheme();
  const dimensions = size === 'small' ? 24 : 32;
  const fontSize = size === 'small' ? 16 : 20;
  
  return (
    <View style={styles.container}>
      <View style={[
        styles.ghost,
        {
          width: dimensions,
          height: dimensions,
          backgroundColor: theme.accent,
          borderRadius: dimensions * 0.25,
        }
      ]}>
        <View style={styles.eyes}>
          <View style={[styles.eye, { backgroundColor: theme.text }]} />
          <View style={[styles.eye, { backgroundColor: theme.text }]} />
        </View>
        <View style={[styles.waves, { backgroundColor: theme.accent }]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.wave, { backgroundColor: theme.bg }]} />
          ))}
        </View>
      </View>
      <Text style={[
        styles.wordmark,
        {
          color: theme.text,
          fontSize,
          fontFamily: 'Poppins_600SemiBold',
        }
      ]}>
        notarik
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ghost: {
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  eyes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  eye: {
    width: 6,
    height: 8,
    borderRadius: 3,
  },
  waves: {
    flexDirection: 'row',
    height: 8,
    marginTop: 4,
  },
  wave: {
    flex: 1,
    height: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  wordmark: {
    fontWeight: '600',
    letterSpacing: -0.5,
  },
});
