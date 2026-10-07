"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Registers the offline service worker and offers "Install app". Android and
// desktop Chrome expose a real install prompt; iOS Safari has none, so there we
// show the Share > Add to Home Screen steps instead. Hidden once installed or
// dismissed (the dismissal is remembered on this device only).

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "nidraq-install-dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeNothing() {
  return () => {};
}

function readDevice(): "installed" | "dismissed" | "ios" | "other" {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  if (readDismissed()) return "dismissed";
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "other";
}

export function InstallApp() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [closed, setClosed] = useState(false);
  // Device facts are read from the browser, never on the server, so the first render matches.
  const device = useSyncExternalStore(subscribeNothing, readDevice, () => "unknown");
  const dismissed = closed || device === "unknown" || device === "installed" || device === "dismissed";
  const showIosHint = device === "ios";

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setClosed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (dismissed || (!installEvent && !showIosHint)) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setClosed(true);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setClosed(true);
    setInstallEvent(null);
  }

  return (
    <div className="mx-auto mt-3 flex max-w-5xl items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm">
      {installEvent ? (
        <>
          <span>Install this app on your phone for quick access.</span>
          <span className="flex shrink-0 gap-2">
            <button type="button" onClick={dismiss} className="text-foreground-muted">
              Not now
            </button>
            <button type="button" onClick={install} className="rounded-md bg-primary px-3 py-1 font-medium text-white">
              Install
            </button>
          </span>
        </>
      ) : (
        <>
          <span>To install: tap the Share button, then &ldquo;Add to Home Screen&rdquo;.</span>
          <button type="button" onClick={dismiss} className="shrink-0 text-foreground-muted">
            Got it
          </button>
        </>
      )}
    </div>
  );
}
