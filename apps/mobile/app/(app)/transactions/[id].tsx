import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/Button";
import { CategoryIcon } from "@/components/CategoryIcon";
import { OptionSheet } from "@/components/OptionSheet";
import { AddExpenseForm, type ExpenseDraft } from "@/features/AddExpenseForm";
import { API_URL, ApiError, type FieldError } from "@/lib/api";
import { deleteTransaction, getTransaction, updateTransaction } from "@/lib/client";
import { formatIdr } from "@/lib/money";
import { fullDate, timeOf } from "@/lib/months";
import { localToday } from "@/lib/receipt";
import { getSession } from "@/lib/session";
import {
  paymentMethods,
  type PaymentMethod,
  type Transaction,
  type TransactionInput,
  type TransactionPage,
} from "@/lib/types";
import { TopBar, TopBarButton } from "@/components/TopBar";
import { useTheme } from "@/theme/Theme";
import { categories, categoryLabels, type Category } from "@/theme/tokens";
import ChevronDown from "../../../assets/svg/review-chevron-down.svg";
import ChevronRight from "../../../assets/svg/detail-chevron-right.svg";
import Mark from "../../../assets/svg/review-mark.svg";
import More from "../../../assets/svg/detail-more.svg";

const PREVIEW_ITEMS = 3;

function itemsSummary(items: Transaction["items"]): string {
  const shown = items.slice(0, PREVIEW_ITEMS).map((item) => item.name);
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
}

export default function TransactionDetail() {
  const theme = useTheme();
  const router = useRouter();
  const client = useQueryClient();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState<"category" | "payment" | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [itemsOpen, setItemsOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const query = useQuery({
    queryKey: ["transaction", id],
    queryFn: () => getTransaction(id),
  });
  const update = useMutation({
    mutationFn: (input: Partial<TransactionInput> & { payment_method?: PaymentMethod | null; note?: string | null }) =>
      updateTransaction(id, input),
    onSuccess: (saved) => {
      client.setQueryData(["transaction", id], saved);
      void client.invalidateQueries({ queryKey: ["transactions"] });
      setEditing(false);
      setError(null);
    },
    onError: (caught) => {
      setServerErrors(caught instanceof ApiError ? caught.details : []);
      setError(caught instanceof ApiError ? caught.message : "Could not reach the API");
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteTransaction(id),
    onSuccess: () => {
      client.setQueriesData<{ pages: TransactionPage[] }>(
        { queryKey: ["transactions", "list"] },
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((row) => row.id !== id),
                })),
              }
            : current,
      );
      void client.invalidateQueries({ queryKey: ["transactions"] });
      router.replace("/transactions");
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "Could not reach the API"),
  });

  const row = query.data;
  const token = getSession()?.accessToken;
  const today = localToday();
  const fromReceipt = row?.source === "photo" || row?.source === "pdf";
  const draft: ExpenseDraft | undefined = row
    ? {
        merchant: row.merchant,
        date: row.date,
        total: String(row.total_minor),
        category: row.category,
        items: row.items.map((item) => ({ name: item.name, amount: String(item.line_total_minor) })),
      }
    : undefined;

  function back() {
    if (router.canGoBack()) router.back();
    else router.replace("/transactions");
  }

  function saveNote(value: string) {
    const next = value.trim();
    setNoteDraft(null);
    if (row && next !== (row.note ?? "")) update.mutate({ note: next || null });
  }

  const info = (label: string, children: React.ReactNode, onPress?: () => void, last = false) => (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={onPress ? `Change ${label.toLowerCase()}` : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
    >
      <Text style={{ color: theme.muted, ...theme.type.caption }}>{label}</Text>
      <View style={styles.infoValue}>{children}</View>
    </Pressable>
  );

  const header = (
    <TopBar
      title="Details"
      onBack={back}
      right={
        <TopBarButton label="More" onPress={() => setMenu((value) => !value)}>
          <More />
        </TopBarButton>
      }
    />
  );

  if (!row) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.surface }}>
        {header}
        {query.isPending ? (
          <ActivityIndicator style={{ marginTop: 48 }} />
        ) : (
          <Text style={[styles.empty, { color: theme.muted, ...theme.type.caption }]}>Transaction not found</Text>
        )}
      </SafeAreaView>
    );
  }

  const category = row.category;
  const receiptUri = row.receipt_run_id ? `${API_URL}/receipts/${row.receipt_run_id}/image` : null;
  const receiptSource =
    receiptUri && token ? { uri: receiptUri, headers: { Authorization: `Bearer ${token}` } } : undefined;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.surface }}>
      {header}
      {menu ? (
        <View style={[styles.menu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit expense"
            onPress={() => {
              setMenu(false);
              setEditing(true);
            }}
            style={styles.menuItem}
          >
            <Text style={{ color: theme.text, ...theme.type.caption }}>Edit</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete expense"
            onPress={() => {
              setMenu(false);
              setConfirming(true);
            }}
            style={styles.menuItem}
          >
            <Text style={{ color: theme.danger, ...theme.type.caption }}>Delete</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {editing && draft ? (
          <View style={{ gap: 12 }}>
            <AddExpenseForm
              initial={draft}
              submitLabel="Save changes"
              serverErrors={serverErrors}
              onSubmit={async (input) => {
                await update.mutateAsync(input).catch(() => undefined);
              }}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} />
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <CategoryIcon category={category} tile={80} icon={60} radius={24} />
              <View style={{ height: 8 }} />
              <Text style={{ color: theme.text, ...theme.type.body2Bold }}>{row.merchant}</Text>
              <Text style={[styles.amount, { color: theme.text, ...theme.type.headline.hero }]}>
                {formatIdr(row.total_minor)}
              </Text>
              {fromReceipt ? (
                <View style={[styles.badge, { backgroundColor: theme.accentSubtle }]}>
                  <Mark />
                  <Text style={{ color: theme.accent, ...theme.type.captionSmallBold }}>From receipt</Text>
                </View>
              ) : null}
            </View>

            <View style={[styles.card, { backgroundColor: theme.bg }]}>
              {info(
                "Category",
                <View style={[styles.categoryChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.dot, { backgroundColor: theme.category[category] }]} />
                  <Text style={{ color: theme.text, ...theme.type.captionBold }}>{categoryLabels[category]}</Text>
                  <ChevronDown />
                </View>,
                () => setPicker("category"),
              )}
              {info(
                "Date",
                <Text style={{ color: theme.text, ...theme.type.captionBold }}>
                  {fullDate(row.date, row.created_at, today)}
                </Text>,
              )}
              {info(
                "Payment",
                <Text
                  style={{
                    color: row.payment_method ? theme.text : theme.accent,
                    ...theme.type.captionBold,
                  }}
                >
                  {row.payment_method ?? "Add payment"}
                </Text>,
                () => setPicker("payment"),
              )}
              {noteDraft !== null ? (
                <View style={styles.infoRow}>
                  <Text style={{ color: theme.muted, ...theme.type.caption }}>Note</Text>
                  <TextInput
                    accessibilityLabel="Note"
                    autoFocus
                    value={noteDraft}
                    onChangeText={setNoteDraft}
                    onBlur={() => saveNote(noteDraft)}
                    onSubmitEditing={() => saveNote(noteDraft)}
                    maxLength={500}
                    returnKeyType="done"
                    style={[styles.noteInput, { color: theme.text, ...theme.type.captionBold }]}
                  />
                </View>
              ) : (
                info(
                  "Note",
                  <Text
                    numberOfLines={1}
                    style={{ color: row.note ? theme.text : theme.accent, ...theme.type.captionBold, maxWidth: 220 }}
                  >
                    {row.note ?? "Add a note"}
                  </Text>,
                  () => setNoteDraft(row.note ?? ""),
                  true,
                )
              )}
            </View>

            {receiptSource || row.items.length > 0 ? (
              <View style={[styles.card, { backgroundColor: theme.bg }]}>
                {receiptSource ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View receipt"
                    onPress={() => setViewing(true)}
                    style={[
                      styles.listRow,
                      row.items.length > 0 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                    ]}
                  >
                    <View style={[styles.thumb, { borderColor: theme.border }]}>
                      {!thumbFailed ? (
                        <Image
                          source={receiptSource}
                          style={styles.thumbImage}
                          resizeMode="cover"
                          onError={() => setThumbFailed(true)}
                        />
                      ) : null}
                    </View>
                    <View style={styles.listMeta}>
                      <Text style={{ color: theme.text, ...theme.type.captionBold }}>View receipt</Text>
                      <Text style={{ color: theme.muted, ...theme.type.captionSmall }}>
                        Scanned {row.date === today ? "today" : `on ${row.date}`}, {timeOf(row.created_at)}
                      </Text>
                    </View>
                    <ChevronRight />
                  </Pressable>
                ) : null}
                {row.items.length > 0 ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={itemsOpen ? "Hide items" : "Show items"}
                      onPress={() => setItemsOpen((value) => !value)}
                      style={styles.listRow}
                    >
                      <View style={[styles.count, { backgroundColor: theme.surface }]}>
                        <Text style={{ color: theme.text, ...theme.type.body2Bold }}>{row.items.length}</Text>
                      </View>
                      <View style={styles.listMeta}>
                        <Text style={{ color: theme.text, ...theme.type.captionBold }}>
                          {row.items.length} {row.items.length === 1 ? "item" : "items"}
                        </Text>
                        <Text numberOfLines={1} style={{ color: theme.muted, ...theme.type.captionSmall }}>
                          {itemsSummary(row.items)}
                        </Text>
                      </View>
                      <View style={itemsOpen ? { transform: [{ rotate: "90deg" }] } : undefined}>
                        <ChevronRight />
                      </View>
                    </Pressable>
                    {itemsOpen
                      ? row.items.map((item) => (
                          <View key={item.id} style={styles.itemRow}>
                            <Text style={{ color: theme.text, ...theme.type.caption, flex: 1 }}>
                              {item.name}
                              {item.qty != null ? ` ×${Number(item.qty)}` : ""}
                            </Text>
                            <Text style={{ color: theme.text, ...theme.type.captionBold }}>
                              {formatIdr(item.line_total_minor)}
                            </Text>
                          </View>
                        ))
                      : null}
                  </>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <Text accessibilityRole="alert" style={{ color: theme.danger, ...theme.type.caption }}>
                {error}
              </Text>
            ) : null}
          </>
        )}
      </ScrollView>

      {!editing ? (
        <View style={[styles.bottom, { backgroundColor: theme.surface, paddingBottom: Math.max(insets.bottom, 0) + 24 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit"
            onPress={() => setEditing(true)}
            style={[styles.edit, { backgroundColor: theme.bg }]}
          >
            <Text style={{ color: theme.text, ...theme.type.button1 }}>Edit</Text>
          </Pressable>
          {confirming ? (
            <View style={styles.confirmRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Keep transaction"
                onPress={() => setConfirming(false)}
                style={styles.delete}
              >
                <Text style={{ color: theme.muted, ...theme.type.button2 }}>Keep</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm delete"
                disabled={remove.isPending}
                onPress={() => remove.mutate()}
                style={styles.delete}
              >
                {remove.isPending ? (
                  <ActivityIndicator color={theme.danger} />
                ) : (
                  <Text style={{ color: theme.danger, ...theme.type.button2 }}>Yes, delete</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete transaction"
              onPress={() => setConfirming(true)}
              style={styles.delete}
            >
              <Text style={{ color: theme.danger, ...theme.type.button2 }}>Delete transaction</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      <OptionSheet<Category>
        visible={picker === "category"}
        title="Category"
        options={categories.map((name) => ({ value: name, label: categoryLabels[name], color: theme.category[name] }))}
        selected={category}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setPicker(null);
          if (value !== category) update.mutate({ category: value });
        }}
      />
      <OptionSheet<PaymentMethod>
        visible={picker === "payment"}
        title="Payment"
        options={paymentMethods.map((name) => ({ value: name, label: name }))}
        selected={row.payment_method}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          setPicker(null);
          if (value !== row.payment_method) update.mutate({ payment_method: value });
        }}
      />

      <Modal visible={viewing} transparent animationType="fade" onRequestClose={() => setViewing(false)}>
        <View style={[styles.viewer, { backgroundColor: theme.scrim }]}>
          {receiptSource ? (
            <Image
              accessibilityLabel="Receipt"
              source={receiptSource}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close receipt"
            onPress={() => setViewing(false)}
            style={[styles.viewerClose, { top: Math.max(insets.top, 24) }]}
          >
            <Text style={{ color: theme.accentText, ...theme.type.button2 }}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: "absolute",
    right: 24,
    top: 110,
    zIndex: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: "#141717",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  menuItem: { paddingHorizontal: 16, paddingVertical: 12 },
  content: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24, gap: 12 },
  empty: { textAlign: "center", marginTop: 48 },
  hero: { alignItems: "center", gap: 4, paddingBottom: 8 },
  amount: { textAlign: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 2,
    borderRadius: 40,
  },
  card: { borderRadius: 24, paddingHorizontal: 16, paddingVertical: 4 },
  infoRow: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  infoValue: { flexShrink: 1, alignItems: "flex-end" },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 40,
    borderWidth: 1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  noteInput: { flex: 1, textAlign: "right", padding: 0, minHeight: 24 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  listMeta: { flex: 1, gap: 2, minWidth: 0 },
  thumb: { width: 40, height: 48, borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  count: { width: 40, height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  itemRow: { flexDirection: "row", gap: 12, paddingVertical: 8, paddingLeft: 52 },
  bottom: { paddingHorizontal: 24, paddingTop: 12, gap: 4 },
  edit: { paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 40 },
  delete: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center", minHeight: 36 },
  confirmRow: { flexDirection: "row" },
  viewer: { flex: 1, alignItems: "center", justifyContent: "center" },
  viewerImage: { width: "100%", height: "80%" },
  viewerClose: { position: "absolute", right: 24, paddingHorizontal: 16, paddingVertical: 8 },
});
