'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(true); // Default hidden until verified

  useEffect(() => {
    // 1. Check if app is running in standalone PWA mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('tibapay_pwa_installed') === 'true';

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    setIsInstalled(false);

    // 2. Capture Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 3. Immediately hide when installation completes
    const handleAppInstalled = () => {
      localStorage.setItem('tibapay_pwa_installed', 'true');
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (isInstalled || !deferredPrompt) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('tibapay_pwa_installed', 'true');
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900/95 border-t border-slate-800 backdrop-blur-md flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-bold text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
          TP
        </div>
        <div>
          <p className="text-sm font-bold text-white">Install TibaPay App</p>
          <p className="text-xs text-slate-400">Access offline with instant push alerts</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstallClick}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          Install
        </button>
        <button
          onClick={() => setIsInstalled(true)}
          className="p-2 text-slate-400 hover:text-white"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}