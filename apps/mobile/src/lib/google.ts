import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { iosRedirectUri, nonceFromBytes } from "@/lib/googleConfig";

// On web the sign-in opens in a popup that hands the result back to this page.
WebBrowser.maybeCompleteAuthSession();

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
};

export type GoogleSignIn = { idToken: string; nonce: string };

export class GoogleSignInError extends Error {}

/**
 * Opens Google's sign-in and returns the ID token for the API to verify, or null when the user
 * closes the window. iOS uses the iOS client with PKCE (no secret in the app); web uses the web
 * client and asks for the ID token directly.
 */
export async function signInWithGoogle(): Promise<GoogleSignIn | null> {
  const nonce = nonceFromBytes(await Crypto.getRandomBytesAsync(16));
  const scopes = ["openid", "email", "profile"];
  const extraParams = { nonce };

  if (Platform.OS === "web") {
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!clientId) throw new GoogleSignInError("Google sign-in is not set up");
    const request = new AuthSession.AuthRequest({
      clientId,
      redirectUri: AuthSession.makeRedirectUri(),
      scopes,
      responseType: AuthSession.ResponseType.IdToken,
      usePKCE: false,
      extraParams,
    });
    const result = await request.promptAsync(DISCOVERY);
    if (result.type === "cancel" || result.type === "dismiss") return null;
    const idToken = result.type === "success" ? result.params.id_token : undefined;
    if (!idToken) throw new GoogleSignInError("Google sign-in failed");
    return { idToken, nonce };
  }

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS !== "ios" || !clientId) {
    throw new GoogleSignInError("Google sign-in is not available on this device yet");
  }
  const redirectUri = iosRedirectUri(clientId);
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams,
  });
  const result = await request.promptAsync(DISCOVERY);
  if (result.type === "cancel" || result.type === "dismiss") return null;
  if (result.type !== "success" || !request.codeVerifier) {
    throw new GoogleSignInError("Google sign-in failed");
  }
  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    },
    DISCOVERY,
  );
  if (!tokens.idToken) throw new GoogleSignInError("Google sign-in failed");
  return { idToken: tokens.idToken, nonce };
}
