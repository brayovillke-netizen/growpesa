'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check if device is iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);
    
    // 2. Check if app is already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(standalone);

    if (standalone) return;

    // 3. Capture the native prompt event (Android)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true); // ONLY show the banner when the event is successfully caught
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 4. iOS Fallback (Show the banner after 3 seconds, as iOS doesn't have the event)
    if (ios && !standalone) {
      setTimeout(() => setIsVisible(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    // If Android and event is captured
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
      return;
    }

    // If iOS, show instructions
    if (isIOS) {
      alert('To install: Tap the Share icon at the bottom of Safari and select "Add to Home Screen".');
    } else {
      // If Android but event hasn't fired yet, tell them to wait or use menu
      alert('Please use your browser menu (three dots) and select "Install App" or "Add to Home Screen".');
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
          {isIOS ? 'How to Install' : 'Install'}
        </button>
      </div>
    </div>
  );
}