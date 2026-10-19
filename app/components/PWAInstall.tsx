'use client';
import { useState, useEffect } from 'react';

export default function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Listen for Chrome's native install event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome from showing its own default mini-infobar
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null); // Hide the button if they installed it
    }
  };

  // If Chrome hasn't fired the event, don't show the button at all
  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-green-deep text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-green-800 animate-bounce-short">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-xl p-1.5">
            <img src="/icon-192.png" alt="Icon" className="w-8 h-8 rounded-lg" />
          </div>
          <div>
            <p className="font-bold text-sm">Install GrowPesa</p>
            <p className="text-[11px] opacity-90">Add to home screen for quick access.</p>
          </div>
        </div>
        <button 
          onClick={handleInstallClick}
          className="bg-white text-green-deep font-bold text-xs px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50 transition"
        >
          Install
        </button>
      </div>
    </div>
  );
}