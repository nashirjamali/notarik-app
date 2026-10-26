import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/Theme';
import { HomeHeader } from '@/components/HomeHeader';
import { ActionCard } from '@/components/ActionCard';
import { ShortcutTile } from '@/components/ShortcutTile';
import { SuggestionChip } from '@/components/SuggestionChip';
import CameraIcon from '../../../assets/svg/icon-camera.svg';
import LogoMark from '../../../assets/svg/logo-mark.svg';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const suggestions = [
    'Am I on track this month?',
    'Log nasi goreng 25k',
    'Show my coffee spending',
  ];
  
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.surface }]}
    >
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
            icon={<CameraIcon width={32} height={32} color={theme.accentText} />}
            variant="primary"
            onPress={() => router.push('/snap')}
          />
          <ActionCard
            title="Ask Notarik"
            subtitle="Ask anything about your spending"
            icon={<LogoMark width={32} height={28} />}
            variant="subtle"
            onPress={() => router.push('/chat')}
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
            icon={require('../../../assets/icons/quick-add.png')}
            tintColor="#E9E3F4"
            onPress={() => router.push('/quick-add')}
          />
          <ShortcutTile
            label="Recap"
            icon={require('../../../assets/icons/recap.png')}
            tintColor="#D9EAF4"
            onPress={() => {}}
          />
          <ShortcutTile
            label="Budget"
            icon={require('../../../assets/icons/budget.png')}
            tintColor="#D9F2E6"
            onPress={() => {}}
          />
          <ShortcutTile
            label="Transactions"
            icon={require('../../../assets/icons/transactions.png')}
            tintColor="#FEF0DC"
            onPress={() => router.push('/(app)/transactions')}
          />
        </ScrollView>
        
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { paddingHorizontal: theme.spacing[24] }]}>
            <LogoMark width={16} height={14} />
            <Text style={[
              styles.sectionLabel,
              {
                color: theme.muted,
                ...theme.type.captionSmallBold,
              }
            ]}>
              Try asking Notarik
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.suggestions,
              { gap: theme.spacing[8], paddingLeft: theme.spacing[24] },
            ]}
          >
            {suggestions.map((text, i) => (
              <SuggestionChip
                key={i}
                text={text}
                onPress={() => router.push({ pathname: '/chat', params: { prompt: text } })}
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  },
  suggestions: {
    paddingVertical: 4,
  },
});
