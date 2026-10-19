'use client';
import { useState, useEffect } from 'react';

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // If already installed, don't show banner
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Show the banner after 2 seconds regardless of browser prompt
    const timer = setTimeout(() => setShowBanner(true), 2000);

    // Capture the prompt if Chrome provides it
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('To install:\n1. Tap the Share button at the bottom of Safari.\n2. Scroll down and tap "Add to Home Screen".');
      return;
    }

    if (deferredPrompt) {
      // Show the native browser install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // Fallback if Chrome hasn't fired the prompt yet
      alert('To install:\n1. Tap the 3 dots in the top right of Chrome.\n2. Select "Install app" or "Add to Home screen".');
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto animate-bounce-short">
      <div className="bg-green-deep text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-green-800">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-1.5">
            <img src="/icon-192.png" alt="Icon" className="w-8 h-8 rounded-lg" />
          </div>
          <div>
            <p className="font-bold text-sm">Install GrowPesa</p>
            <p className="text-[11px] opacity-90">Add to home screen for quick access.</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setShowBanner(false)} className="text-xs opacity-70 hover:opacity-100 px-2">
            ✕
          </button>
          <button 
            onClick={handleInstallClick}
            className="bg-white text-green-deep font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}