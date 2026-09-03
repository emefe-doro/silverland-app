"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare } from "lucide-react";

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed / standalone
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes("android-app://");
    setIsStandalone(!!standalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Android / Chrome beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  if (isStandalone || dismissed) return null;

  return (
    <div className="mb-4 rounded-2xl bg-gradient-to-r from-brand-600 to-blue-700 p-3.5 text-white shadow-md relative animate-in fade-in slide-in-from-top-2">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-white/70 hover:bg-white/10"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-6">
        <div className="flex items-center gap-2 font-bold text-xs">
          <Download className="h-4 w-4" /> Install App on Your Phone
        </div>
        <p className="mt-1 text-[11px] text-brand-100 leading-snug">
          Install for fast 1-tap gate access without opening your browser.
        </p>

        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="mt-2.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-brand-800 active:scale-95 transition-all shadow-xs"
          >
            Install App Now
          </button>
        ) : isIOS ? (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-white/90 bg-white/10 rounded-lg px-2.5 py-1.5">
            <span>Tap Safari&apos;s</span>
            <span className="inline-flex items-center gap-0.5 font-bold underline">
              <Share className="h-3 w-3 inline" /> Share
            </span>
            <span>then select</span>
            <span className="inline-flex items-center gap-0.5 font-bold underline">
              <PlusSquare className="h-3 w-3 inline" /> Add to Home Screen
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
