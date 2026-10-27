import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState, type ComponentType, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { InfoSheet } from "@/components/InfoSheet";
import { Toggle } from "@/components/Toggle";
import { useAuth } from "@/lib/auth";
import { exportTransactionsCsv, getMe, getSettings, patchSettings, type UserSettings } from "@/lib/client";
import { useTheme } from "@/theme/Theme";
import { categories, categoryLabels } from "@/theme/tokens";
import Bell from "../../../assets/svg/settings-bell.svg";
import Check from "../../../assets/svg/settings-check.svg";
import ChevronRight from "../../../assets/svg/settings-chevron-right.svg";
import Coin from "../../../assets/svg/settings-coin.svg";
import Download from "../../../assets/svg/settings-download.svg";
import Globe from "../../../assets/svg/settings-globe.svg";
import Help from "../../../assets/svg/settings-help.svg";
import Info from "../../../assets/svg/settings-info.svg";
import Lock from "../../../assets/svg/settings-lock.svg";
import Receipt from "../../../assets/svg/settings-receipt.svg";
import Tag from "../../../assets/svg/settings-tag.svg";
import Target from "../../../assets/svg/settings-target.svg";

type Icon = ComponentType<{ width?: number; height?: number }>;
type Sheet = "categories" | "help" | "privacy" | null;

const HELP = [
  "Tap + to snap a receipt or type a sentence like “kopi 25rb”.",
  "Ask Notarik in the Chat tab about your spending. It proposes changes and you confirm each one.",
  "Open Recap from Home to set a monthly budget and limits per category.",
];
const PRIVACY = [
  "Your expenses are stored in your own account and are only readable by you.",
  "Receipt photos are read by an AI model to fill in the details. Text on a receipt is never treated as an instruction.",
  "Notarik never saves anything by itself. Every change waits for your confirmation.",
];

function Row({
  icon: IconComponent,
  title,
  subtitle,
  value,
  onPress,
  right,
  tinted = false,
  last = false,
}: {
  icon: Icon;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  tinted?: boolean;
  last?: boolean;
}) {
  const theme = useTheme();
  const body = (
    <>
      <View style={[styles.iconTile, { backgroundColor: tinted ? theme.accentSubtle : theme.surface }]}>
        <IconComponent width={20} height={20} />
      </View>
      <View style={styles.rowText}>
        <Text style={{ color: theme.text, ...theme.type.captionBold }}>{title}</Text>
        {subtitle ? <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={{ color: theme.muted, ...theme.type.caption }}>{value}</Text> : null}
      {right ?? (onPress ? <ChevronRight width={20} height={20} /> : null)}
    </>
  );
  const rowStyle = [styles.row, tinted ? styles.rowTall : null, !last && { borderBottomColor: theme.border, borderBottomWidth: 1 }];
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={rowStyle}>
      {body}
    </Pressable>
  ) : (
    <View style={rowStyle}>{body}</View>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      <Text style={{ color: theme.muted, ...theme.type.captionSmallBold }}>{title}</Text>
      <View style={[styles.card, { backgroundColor: theme.bg }]}>{children}</View>
    </View>
  );
}

async function shareCsv(csv: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "notarik-expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: "notarik-expenses.csv", message: csv });
}

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { logout, session } = useAuth();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const me = useQuery({ queryKey: ["me", session?.userId], queryFn: getMe, enabled: Boolean(session) });
  const settingsKey = ["settings", session?.userId];
  const settings = useQuery({ queryKey: settingsKey, queryFn: getSettings, enabled: Boolean(session) });
  const change = useMutation({
    mutationFn: patchSettings,
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: settingsKey });
      const previous = queryClient.getQueryData<UserSettings>(settingsKey);
      queryClient.setQueryData<UserSettings>(settingsKey, (current) =>
        current ? { ...current, ...patch } : current,
      );
      return { previous };
    },
    onError: (_error, _patch, context) => queryClient.setQueryData(settingsKey, context?.previous),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: settingsKey }),
  });

  const name = me.data?.name?.trim() || me.data?.email?.split("@")[0] || "Notarik";
  const initial = name.charAt(0).toUpperCase();

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      await shareCsv(await exportTransactionsCsv());
    } catch {
      setExportError("Could not export your data");
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.surface }}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={{ color: theme.text, ...theme.type.body1Bold }}>
          Settings
        </Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.account, { backgroundColor: theme.bg }]}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSubtle }]}>
            <Text style={{ color: theme.accent, ...theme.type.body1Bold }}>{initial}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={{ color: theme.text, ...theme.type.body2Bold }}>{name}</Text>
            {me.data?.email ? (
              <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>{me.data.email}</Text>
            ) : null}
          </View>
        </View>

        <Group title="Notarik AI">
          <Row
            tinted
            icon={Receipt}
            title="Auto-read receipts"
            subtitle="Notarik fills in details from photos"
            right={
              <Toggle
                label="Auto-read receipts"
                value={settings.data?.auto_read_receipts ?? true}
                onChange={(next) => change.mutate({ auto_read_receipts: next })}
              />
            }
          />
          <Row
            tinted
            last
            icon={Check}
            title="Confirm before saving"
            subtitle="AI proposes, you commit"
            right={<Toggle label="Confirm before saving" value disabled />}
          />
        </Group>

        <Group title="Preferences">
          <Row icon={Coin} title="Currency" value="IDR (Rp)" />
          <Row icon={Globe} title="Language" value="English" />
          <Row
            last
            icon={Bell}
            title="Notifications"
            right={
              <Toggle
                label="Notifications"
                value={settings.data?.notifications ?? true}
                onChange={(next) => change.mutate({ notifications: next })}
              />
            }
          />
        </Group>

        <Group title="Money">
          <Row icon={Tag} title="Categories" onPress={() => setSheet("categories")} />
          <Row icon={Target} title="Budgets" onPress={() => router.push("/recap")} />
          <Row
            last
            icon={Download}
            title={exporting ? "Exporting…" : "Export data"}
            onPress={exporting ? undefined : () => void exportData()}
          />
        </Group>
        {exportError ? (
          <Text accessibilityRole="alert" style={{ color: theme.danger, ...theme.type.captionSmall }}>
            {exportError}
          </Text>
        ) : null}

        <Group title="About">
          <Row icon={Help} title="Help" onPress={() => setSheet("help")} />
          <Row icon={Lock} title="Privacy" onPress={() => setSheet("privacy")} />
          <Row last icon={Info} title="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        </Group>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Log out"
          onPress={() => void logout()}
          style={styles.logout}
        >
          <Text style={{ color: theme.danger, ...theme.type.button2 }}>Log out</Text>
        </Pressable>
      </ScrollView>

      <InfoSheet
        visible={sheet === "categories"}
        title="Categories"
        lines={[categories.map((name_) => categoryLabels[name_]).join(", "), "Notarik sorts each expense into one of these."]}
        onClose={() => setSheet(null)}
      />
      <InfoSheet visible={sheet === "help"} title="Help" lines={HELP} onClose={() => setSheet(null)} />
      <InfoSheet visible={sheet === "privacy"} title="Privacy" lines={PRIVACY} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { height: 108, justifyContent: "center", paddingHorizontal: 24 },
  content: { paddingHorizontal: 24, paddingBottom: 140, gap: 20 },
  account: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  group: { gap: 8 },
  card: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  rowTall: { paddingVertical: 10 },
  iconTile: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, minWidth: 0 },
  logout: { alignItems: "center", paddingVertical: 8 },
});
