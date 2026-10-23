import { Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/Theme';

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
      <Text style={[
        styles.sparkle,
        { color: theme.accent }
      ]}>
        ✨
      </Text>
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
  sparkle: {
    fontSize: 14,
  },
  text: {
    fontWeight: '400',
  },
});
