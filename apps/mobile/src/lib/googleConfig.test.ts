import { iosRedirectUri, nonceFromBytes, reversedClientId } from "./googleConfig";

test("reverses an iOS client ID into its URL scheme", () => {
  expect(reversedClientId("123-abc.apps.googleusercontent.com")).toBe(
    "com.googleusercontent.apps.123-abc",
  );
  expect(iosRedirectUri("123-abc.apps.googleusercontent.com")).toBe(
    "com.googleusercontent.apps.123-abc:/oauthredirect",
  );
});

test("turns random bytes into a hex nonce", () => {
  expect(nonceFromBytes(new Uint8Array([0, 15, 255]))).toBe("000fff");
  expect(nonceFromBytes(new Uint8Array(16))).toHaveLength(32);
});
