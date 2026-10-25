import { Text, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/Theme';
import SparkleIcon from '../../assets/svg/icon-sparkle.svg';

interface SuggestionChipProps {
  text: string;
  onPress?: () => void;
}

export function SuggestionChip({ text, onPress }: SuggestionChipProps) {
  const theme = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: theme.surface,
          borderRadius: theme.radius.pill,
          borderWidth: 1,
          borderColor: theme.border,
          paddingVertical: theme.spacing[8],
          paddingHorizontal: theme.spacing[14],
        }
      ]}
    >
      <View style={styles.iconContainer}>
        <SparkleIcon width={16} height={16} color={theme.accent} />
      </View>
      <Text style={[
        styles.text,
        {
          color: theme.text,
          ...theme.type.caption,
        }
      ]}>
        {text}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '400',
  },
});
