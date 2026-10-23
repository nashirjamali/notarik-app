import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/Theme';
import { HomeHeader } from '@/components/HomeHeader';
import { ActionCard } from '@/components/ActionCard';
import { ShortcutTile } from '@/components/ShortcutTile';
import { SuggestionChip } from '@/components/SuggestionChip';

const CameraIcon = ({ color }: { color: string }) => (
  <View style={[styles.cameraIcon, { borderColor: color }]}>
    <View style={[styles.cameraLens, { borderColor: color }]} />
  </View>
);

const GhostIcon = ({ color }: { color: string }) => (
  <View style={[styles.ghostIcon, { backgroundColor: color }]}>
    <View style={styles.ghostEyes}>
      <View style={styles.ghostEye} />
      <View style={styles.ghostEye} />
    </View>
  </View>
);

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const suggestions = [
    'Am I on track this month?',
    'Log nasi goreng 25k',
    'Show my coffee spending',
  ];
  
  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <ScrollView 
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.spacing[24] + 112 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader onNotificationPress={() => {}} />
        
        <View style={[styles.section, { paddingHorizontal: theme.spacing[24] }]}>
          <Text style={[
            styles.headline,
            {
              color: theme.text,
              ...theme.type.headline.hero,
            }
          ]}>
            Snap it.{'\n'}We&apos;ll sort it.
          </Text>
        </View>
        
        <View style={[
          styles.cardsRow,
          {
            paddingHorizontal: theme.spacing[24],
            gap: theme.spacing[12],
          }
        ]}>
          <ActionCard
            title="Snap receipt"
            subtitle="Photo a receipt, we'll do the rest"
            icon={<CameraIcon color={theme.accentText} />}
            variant="primary"
            onPress={() => router.push('/(app)/add')}
          />
          <ActionCard
            title="Ask Notarik"
            subtitle="Ask anything about your spending"
            icon={<GhostIcon color={theme.accent} />}
            variant="subtle"
            onPress={() => router.push('/(app)/chat')}
          />
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.shortcuts,
            {
              paddingHorizontal: theme.spacing[24],
              gap: theme.spacing[16],
            }
          ]}
        >
          <ShortcutTile
            label="Quick add"
            icon={require('@/assets/icons/quick-add.png')}
            onPress={() => router.push('/(app)/add')}
          />
          <ShortcutTile
            label="Recap"
            icon={require('@/assets/icons/recap.png')}
            onPress={() => {}}
          />
          <ShortcutTile
            label="Budget"
            icon={require('@/assets/icons/budget.png')}
            onPress={() => {}}
          />
          <ShortcutTile
            label="Transactions"
            icon={require('@/assets/icons/transactions.png')}
            onPress={() => router.push('/(app)/transactions')}
          />
        </ScrollView>
        
        <View style={[styles.section, { paddingHorizontal: theme.spacing[24] }]}>
          <Text style={[
            styles.sectionLabel,
            {
              color: theme.muted,
              ...theme.type.captionSmallBold,
            }
          ]}>
            Try asking Notarik
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.suggestions, { gap: theme.spacing[8] }]}
          >
            {suggestions.map((text, i) => (
              <SuggestionChip
                key={i}
                text={text}
                onPress={() => router.push('/(app)/chat')}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  headline: {
    fontWeight: '700',
  },
  cardsRow: {
    flexDirection: 'row',
  },
  shortcuts: {
    paddingVertical: 8,
  },
  sectionLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestions: {
    paddingVertical: 4,
  },
  cameraIcon: {
    width: 32,
    height: 28,
    borderWidth: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLens: {
    width: 16,
    height: 16,
    borderWidth: 3,
    borderRadius: 8,
  },
  ghostIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  ghostEyes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  ghostEye: {
    width: 4,
    height: 6,
    backgroundColor: '#FEFEFE',
    borderRadius: 2,
  },
});
