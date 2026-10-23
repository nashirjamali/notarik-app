import { View, StyleSheet } from 'react-native';
import LogoFullSvg from '@/assets/svg/logo-full.svg';

export function Logo({ size = 'default' }: { size?: 'default' | 'small' }) {
  const height = size === 'small' ? 20 : 28;
  
  return (
    <View style={styles.container}>
      <LogoFullSvg width={height * 3.5} height={height} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
