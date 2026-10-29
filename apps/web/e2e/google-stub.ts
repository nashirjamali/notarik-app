import type { BrowserContext } from "@playwright/test";

/**
 * Replaces Google Identity Services with a stand-in so tests never reach Google.
 * The fake button hands the callback a made-up credential when clicked.
 */
export async function stubGoogle(context: BrowserContext) {
  await context.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
        let callback;
        window.google = { accounts: { id: {
          initialize(options) { callback = options.callback; window.__googleNonce = options.nonce; },
          renderButton(element, options) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = options.text === "continue_with" ? "Continue with Google" : options.text;
            button.onclick = () => callback({ credential: "fake.id.token" });
            element.append(button);
          },
        } } };
      `,
    }),
  );
}
