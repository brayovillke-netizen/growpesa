'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check device
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    
    // 2. Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(standalone);

    if (standalone) return;

    // 3. Catch the native prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 🔥 FORCE SHOW: Show the banner after 3 seconds regardless of browser permission
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    // If Chrome gave us the native prompt, trigger it
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsVisible(false);
      setDeferredPrompt(null);
      return;
    }

    // If Chrome blocked it, show manual instructions
    if (isIOS) {
      alert('To install: Tap the Share icon at the bottom and select "Add to Home Screen".');
    } else {
      alert('Please click the 3 dots (⋮) at the top right of your browser and select "Install app" or "Add to Home screen".');
    }
  };

  if (isStandalone || !isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 flex items-center justify-between shadow-lg mb-4 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-xl">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-white font-bold text-sm">Install GrowPesa</h4>
          <p className="text-blue-100 text-[10px]">Add to home screen for fast access.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setIsVisible(false)} className="text-white/60 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
        <button onClick={handleInstallClick} className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-sm">
          Install
        </button>
      </div>
    </div>
  );
}