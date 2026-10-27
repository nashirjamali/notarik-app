import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AiBubble, ProposalCard, TypingBubble, UserBubble, type CardState } from "@/features/ChatParts";
import { ApiError } from "@/lib/api";
import { confirmChat, sendChat, type PendingAction } from "@/lib/chat";
import { getMe } from "@/lib/client";
import { useAuth } from "@/lib/auth";
import { TopBar, TopBarButton } from "@/components/TopBar";
import { useTheme } from "@/theme/Theme";
import ArrowUp from "../../assets/svg/chat-arrow-up.svg";
import Camera from "../../assets/svg/chat-camera.svg";
import Mark from "../../assets/svg/login-mark.svg";
import NewChat from "../../assets/svg/chat-new-chat.svg";

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  at: Date;
  pending?: PendingAction;
  state?: CardState;
  error?: string | null;
  link?: { label: string; href: string };
};

let nextId = 1;

export default function ChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const { session } = useAuth();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  const scroller = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const me = useQuery({
    queryKey: ["me", session?.userId],
    queryFn: getMe,
    enabled: Boolean(session),
  });
  const greeting = `Hi${me.data?.name ? ` ${me.data.name}` : ""}! Ask me about your spending, or just tell me what you bought.`;

  const add = useCallback((message: Omit<Message, "id" | "at">) => {
    setMessages((current) => [...current, { ...message, id: nextId++, at: new Date() }]);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;
      setDraft("");
      add({ role: "user", text });
      // A new request replaces whatever was waiting for a decision.
      setMessages((current) =>
        current.map((item) => (item.state === "open" ? { ...item, state: "expired" } : item)),
      );
      setBusy(true);
      try {
        const reply = await sendChat(text, threadId);
        if (reply.threadId) setThreadId(reply.threadId);
        add({
          role: "assistant",
          text: reply.text,
          pending: reply.pending ?? undefined,
          state: reply.pending ? "open" : undefined,
        });
      } catch (caught) {
        add({
          role: "assistant",
          text: caught instanceof ApiError ? caught.message : "I couldn't reach the server. Try again in a moment.",
        });
      } finally {
        setBusy(false);
      }
    },
    [add, busy, threadId],
  );

  // "Try asking Notarik" chips on Home open the chat with the question already sent.
  const sentPrompt = useRef(false);
  useEffect(() => {
    if (prompt && !sentPrompt.current) {
      sentPrompt.current = true;
      void send(prompt);
    }
  }, [prompt, send]);

  async function decide(
    id: number,
    decision: "approve" | "reject" | "edit",
    payload?: Record<string, unknown>,
  ) {
    const target = messages.find((item) => item.id === id);
    if (!target?.pending || !threadId) return;
    const patch = (change: Partial<Message>) =>
      setMessages((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));
    patch({ state: "saving", error: null });
    try {
      const result = await confirmChat(threadId, decision, payload);
      const approved = result.status === "approved";
      patch({ state: approved ? "approved" : "rejected" });
      if (approved) {
        void client.invalidateQueries({ queryKey: ["transactions"] });
        void client.invalidateQueries({ queryKey: ["budget"] });
      }
      const kind = target.pending.kind;
      add({
        role: "assistant",
        text: !approved
          ? "Nothing was saved."
          : kind === "delete_expense"
            ? "Deleted."
            : kind === "set_budget"
              ? "Budget updated."
              : "Saved. It's in your transactions.",
        link:
          approved && kind === "create_expense" && result.transaction_id
            ? { label: "View expense", href: `/transactions/${result.transaction_id}` }
            : undefined,
      });
    } catch (caught) {
      patch({
        state: "open",
        error: caught instanceof ApiError ? caught.message : "Could not reach the API",
      });
    }
  }

  function newChat() {
    setMessages([]);
    setThreadId(null);
    setDraft("");
  }

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  const canSend = draft.trim().length > 0 && !busy;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: theme.surface }}>
      <TopBar
        onBack={close}
        title={
          <View style={styles.title}>
            <Mark />
            <Text accessibilityRole="header" style={{ color: theme.text, ...theme.type.body1Bold }}>
              Ask Notarik
            </Text>
          </View>
        }
        right={
          <TopBarButton label="New chat" onPress={newChat}>
            <NewChat />
          </TopBarButton>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={(node) => {
            scroller.current = node;
          }}
          contentContainerStyle={styles.conversation}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}
        >
          <AiBubble text={greeting} />
          {messages.map((message) =>
            message.role === "user" ? (
              <UserBubble key={message.id} text={message.text} />
            ) : (
              <AiBubble key={message.id} text={message.text}>
                {message.pending ? (
                  <ProposalCard
                    pending={message.pending}
                    state={message.state ?? "open"}
                    at={message.at}
                    error={message.error}
                    onApprove={() => void decide(message.id, "approve")}
                    onReject={() => void decide(message.id, "reject")}
                    onEdit={(payload) => void decide(message.id, "edit", payload)}
                  />
                ) : null}
                {message.link ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => router.push(message.link!.href as never)}
                  >
                    <Text style={{ color: theme.accent, ...theme.type.captionBold }}>
                      {message.link.label}
                    </Text>
                  </Pressable>
                ) : null}
              </AiBubble>
            ),
          )}
          {busy ? <TypingBubble /> : null}
        </ScrollView>

        <View
          style={[
            styles.composer,
            { backgroundColor: theme.surface, borderColor: theme.border, marginBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan a receipt"
            onPress={() => router.push("/snap")}
            style={styles.camera}
          >
            <Camera />
          </Pressable>
          <TextInput
            accessibilityLabel="Message"
            placeholder="Ask or log an expense…"
            placeholderTextColor={theme.muted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => void send(draft)}
            returnKeyType="send"
            blurOnSubmit={false}
            // The assistant reads the exact words typed, so keep the keyboard from rewriting them.
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            maxLength={2000}
            style={[styles.input, { color: theme.text, ...theme.type.composer }, noOutline]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
            disabled={!canSend}
            onPress={() => void send(draft)}
            style={[styles.send, { backgroundColor: theme.accent, opacity: canSend ? 1 : 0.5 }]}
          >
            <ArrowUp />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Web only: the composer border is the focus cue, so drop the browser ring.
const noOutline = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

const styles = StyleSheet.create({
  title: { flexDirection: "row", alignItems: "center", gap: 7 },
  conversation: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16, gap: 14 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 24,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  camera: { height: 40, justifyContent: "center" },
  input: { flex: 1, minWidth: 0, padding: 0 },
  send: { padding: 8, borderRadius: 12 },
});
