'use client';
import { useState, useEffect } from 'react';

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check for iOS (which doesn't support the native prompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Catch the Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If it's iOS, show the banner after 3 seconds
    if (isIosDevice) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      alert('To install: Tap the Share button at the bottom of Safari, then scroll down and tap "Add to Home Screen".');
      setShowPrompt(false);
      return;
    }

    if (!deferredPrompt) return;

    // Show the native browser install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-green-deep text-white rounded-2xl p-4 shadow-xl flex items-center justify-between border border-green-800">
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
          <button onClick={() => setShowPrompt(false)} className="text-xs opacity-70 hover:opacity-100 px-2">
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