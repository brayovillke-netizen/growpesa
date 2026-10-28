'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
      <div className="bg-slate-900 border border-emerald-500/30 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950 text-sm">
            TP
          </div>
          <div>
            <p className="text-xs font-bold text-white">Install TibaPay</p>
            <p className="text-[10px] text-slate-400">Add to home screen for quick access</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPrompt(false)}
            className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white"
          >
            Later
          </button>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-lg hover:bg-emerald-400 transition"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}