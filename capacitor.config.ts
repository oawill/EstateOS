import type { CapacitorConfig } from "@capacitor/cli";

// The native app is a thin shell around the live site: it loads the deployed
// NidraQ web app, so every web release reaches phones immediately and there is
// one codebase. `webDir` only holds a small fallback page for when the phone is
// offline at launch. Override CAP_SERVER_URL to point a build at staging.
const serverUrl = process.env.CAP_SERVER_URL ?? "https://nidraq.com/login";

const config: CapacitorConfig = {
  appId: "com.nidraq.app",
  appName: "NidraQ",
  webDir: "capacitor-shell",
  server: {
    url: serverUrl,
    cleartext: false,
    // Stay inside the app for our own site and the Paystack checkout; any other
    // link opens in the phone browser.
    allowNavigation: ["nidraq.com", "*.nidraq.com", "checkout.paystack.com"],
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
