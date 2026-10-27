import { Logo } from './Logo';
import { TopBar, TopBarButton } from './TopBar';
import BellIcon from '../../assets/svg/icon-bell.svg';

export function HomeHeader({ onNotificationPress }: { onNotificationPress?: () => void }) {
  return (
    <TopBar
      align="start"
      left={<Logo />}
      right={
        <TopBarButton label="Notifications" onPress={onNotificationPress}>
          <BellIcon width={24} height={24} />
        </TopBarButton>
      }
      // Figma starts the content 12 below the 96 high bar; the Home sections are spaced 20 apart.
      style={{ marginBottom: -8 }}
    />
  );
}
