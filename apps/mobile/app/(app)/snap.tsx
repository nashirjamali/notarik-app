import { CameraView, useCameraPermissions } from "expo-camera";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { ApiError } from "@/lib/api";
import { uploadReceipt } from "@/lib/client";
import type { ReceiptFile } from "@/lib/types";
import { useTheme } from "@/theme/Theme";
import { light } from "@/theme/tokens";
import Close from "../../assets/svg/snap-close.svg";
import CornerBrackets from "../../assets/svg/snap-corner-brackets.svg";
import FileText from "../../assets/svg/snap-file-text.svg";
import Flash from "../../assets/svg/snap-flash.svg";
import Shutter from "../../assets/svg/snap-shutter.svg";

// The camera screen is always dark, whatever the app theme is.
const INK = light.text;
const WHITE = light.surface;
const FRAME = { width: 216, height: 384 };

function Scrim({ from, to, style }: { from: number; to: number; style: object }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={INK} stopOpacity={from} />
            <Stop offset="1" stopColor={INK} stopOpacity={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#scrim)" />
      </Svg>
    </View>
  );
}

export default function SnapReceiptScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [mode, setMode] = useState<"photo" | "upload">("photo");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [scan] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scan, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scan]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function send(file: ReceiptFile) {
    setBusy(true);
    setError(null);
    try {
      const run = await uploadReceipt(file);
      router.replace(`/receipt/${run.id}`);
    } catch (caught) {
      if (!(caught instanceof ApiError)) console.warn("Receipt upload failed", caught);
      setError(caught instanceof ApiError ? caught.message : "Could not reach the API");
      setBusy(false);
    }
  }

  async function takePhoto() {
    if (busy || !camera.current) return;
    setError(null);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7 });
      setLastPhoto(photo.uri);
      await send({ uri: photo.uri, name: "receipt.jpg", mimeType: "image/jpeg" });
    } catch {
      setError("Could not take the photo. Try Gallery instead.");
    }
  }

  async function pickFromGallery() {
    if (busy) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    setMode("photo");
    if (result.canceled) return;
    const asset = result.assets[0];
    setLastPhoto(asset.uri);
    await send({
      uri: asset.uri,
      name: asset.fileName ?? "receipt.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
    });
  }

  async function pickPdf() {
    if (busy) return;
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await send({ uri: asset.uri, name: asset.name, mimeType: "application/pdf" });
  }

  function chooseMode(next: "photo" | "upload") {
    setMode(next);
    if (next === "upload") void pickFromGallery();
  }

  const granted = permission?.granted ?? false;
  const roundButton = {
    backgroundColor: light.scrim,
    borderColor: light.glass,
  };
  const translateY = scan.interpolate({
    inputRange: [0, 1],
    outputRange: [16, FRAME.height - 18],
  });

  return (
    <View style={[styles.root, { backgroundColor: INK }]}>
      {granted ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
        />
      ) : null}
      <Scrim from={0.7} to={0} style={{ height: 160, bottom: undefined }} />
      <Scrim from={0} to={0.9} style={{ height: 260, top: undefined }} />

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 47) + 9 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          style={[styles.roundButton, roundButton]}
        >
          <Close />
        </Pressable>
        <Text style={{ color: WHITE, ...theme.type.body2Bold }}>Snap receipt</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torch ? "Turn flash off" : "Turn flash on"}
          accessibilityState={{ selected: torch }}
          onPress={() => setTorch((value) => !value)}
          style={[
            styles.roundButton,
            roundButton,
            torch && { backgroundColor: theme.accent, borderColor: theme.accent },
          ]}
        >
          <Flash />
        </Pressable>
      </View>

      <View style={styles.middle}>
        <View style={FRAME}>
          <CornerBrackets />
          {granted ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.scanLine,
                { backgroundColor: theme.accent, shadowColor: theme.accent },
                { transform: [{ translateY }] },
              ]}
            />
          ) : (
            <View style={styles.permission}>
              <Text style={[styles.permissionText, theme.type.caption]}>
                {permission == null
                  ? "Starting the camera…"
                  : "Allow camera access to scan receipts, or pick a photo or PDF below."}
              </Text>
              {permission != null ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void requestPermission()}
                  style={[styles.allow, { backgroundColor: theme.accent }]}
                >
                  <Text style={{ color: WHITE, ...theme.type.captionBold }}>Allow camera</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View
        style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 20) + 10 }]}
      >
        <View
          accessibilityRole={error ? "alert" : undefined}
          style={[styles.hint, { backgroundColor: light.scrim }]}
        >
          <Text style={{ color: error ? "#FFB4A1" : WHITE, ...theme.type.captionSmall }}>
            {error ?? "Fit the whole receipt in the frame"}
          </Text>
        </View>

        <View style={[styles.toggle, { backgroundColor: light.scrim }]}>
          {(["photo", "upload"] as const).map((key) => {
            const active = mode === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => chooseMode(key)}
                style={[styles.toggleItem, active && { backgroundColor: light.glass }]}
              >
                <Text
                  style={{
                    color: active ? WHITE : theme.muted,
                    ...theme.type.captionBold,
                  }}
                >
                  {key === "photo" ? "Photo" : "Upload"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gallery"
            onPress={() => void pickFromGallery()}
            style={styles.side}
          >
            <View style={[styles.thumb, { borderColor: WHITE, backgroundColor: light.glass }]}>
              {lastPhoto ? <Image source={{ uri: lastPhoto }} style={styles.thumbImage} /> : null}
            </View>
            <Text style={{ color: WHITE, ...theme.type.captionSmall }}>Gallery</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            disabled={busy || !granted}
            onPress={() => void takePhoto()}
            style={({ pressed }) => ({ opacity: !granted ? 0.5 : pressed ? 0.8 : 1 })}
          >
            <Shutter />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="PDF"
            onPress={() => void pickPdf()}
            style={styles.side}
          >
            <View style={[styles.pdf, { backgroundColor: light.glass }]}>
              <FileText />
            </View>
            <Text style={{ color: WHITE, ...theme.type.captionSmall }}>PDF</Text>
          </Pressable>
        </View>
      </View>

      {busy ? (
        <View style={[StyleSheet.absoluteFill, styles.busy, { backgroundColor: light.scrim }]}>
          <ActivityIndicator color={WHITE} size="large" />
          <Text accessibilityRole="alert" style={{ color: WHITE, ...theme.type.body2Bold }}>
            Reading receipt…
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: { flex: 1, alignItems: "center", justifyContent: "center" },
  scanLine: {
    position: "absolute",
    left: 16,
    width: 184,
    height: 2,
    borderRadius: 1,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  permission: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 28,
  },
  permissionText: { color: WHITE, textAlign: "center" },
  allow: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 40 },
  bottom: { alignItems: "center", gap: 12 },
  hint: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 40, maxWidth: 342 },
  toggle: { width: 200, flexDirection: "row", padding: 4, borderRadius: 12 },
  toggleItem: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginTop: 8,
  },
  side: { width: 56, alignItems: "center", gap: 6 },
  thumb: { width: 48, height: 48, borderRadius: 12, borderWidth: 2, overflow: "hidden" },
  thumbImage: { width: "100%", height: "100%" },
  pdf: {
    width: 48,
    height: 48,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  busy: { alignItems: "center", justifyContent: "center", gap: 16 },
});
