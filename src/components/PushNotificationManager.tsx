'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export function PushNotificationManager({ userPhone }: { userPhone: string }) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. If browser doesn't support, exit
    if (!('Notification' in window)) return;
    
    // 2. If they already granted or denied, exit
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    
    // 3. If they previously dismissed, exit
    if (localStorage.getItem('growpesa_notif_dismissed') === 'true') return;

    // Show prompt after 3 seconds
    const timer = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    // Save immediately so it never pops up again
    localStorage.setItem('growpesa_notif_dismissed', 'true'); 
    setShowPrompt(false);
    
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          // Fire a test notification immediately
          const registration = await navigator.serviceWorker.ready;
          registration.showNotification('GrowPesa Alerts Enabled 🚀', {
            body: 'You will now receive system notifications for deposits and loans.',
            icon: '/icon-192x192.png',
            vibrate: [200, 100, 200]
          });
        } catch (e) {
          console.error('Test notification failed', e);
        }
      } else {
        alert('Notifications were blocked. You will only see in-app banners.');
      }
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('growpesa_notif_dismissed', 'true'); 
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] max-w-md mx-auto animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-emerald-500/20 p-2.5 rounded-full">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Enable Notifications</h4>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">Get alerts even when the app is closed.</p>
          </div>
        </div>
        <div className="flex gap-2 relative z-10 items-center">
          <button onClick={handleDismiss} className="text-slate-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
          <button onClick={handleAllow} className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-md">
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}