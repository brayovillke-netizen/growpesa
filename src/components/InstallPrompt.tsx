'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
    
    // Check if app is already installed/standalone
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For Android/Chrome, show the prompt after a slight delay if not already installed
    if (!window.matchMedia('(display-mode: standalone)').matches && !/iPad|iPhone|iPod/.test(navigator.userAgent)) {
       setTimeout(() => setIsVisible(true), 3000); // Show after 3s on Android
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // If on iOS or browser doesn't support prompt, show manual instructions
      alert(isIOS ? 'Tap the Share icon at the bottom and select "Add to Home Screen".' : 'Please use your browser menu to install this app.');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
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