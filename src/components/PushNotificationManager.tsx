'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export function PushNotificationManager({ userPhone }: { userPhone: string }) {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      registerServiceWorker();
    }

    // Check if previously dismissed
    if (localStorage.getItem('growpesa_notif_dismissed') === 'true') {
      setShowPrompt(false);
    } else {
      // Delay showing the prompt slightly so it doesn't pop up instantly
      const timer = setTimeout(() => setShowPrompt(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async function subscribeToPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('You need to allow notifications in your browser settings.');
        setShowPrompt(false);
        localStorage.setItem('growpesa_notif_dismissed', 'true');
        return;
      }

      // Note: You need a VAPID public key from your backend to fully implement this
      // For now, we just request permission and let the backend handle the rest if configured
      setShowPrompt(false);
      localStorage.setItem('growpesa_notif_dismissed', 'true');
      
      // You can optionally send the subscription object to your backend here
      // await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ phone: userPhone, sub }) });

    } catch (error) {
      console.error('Failed to subscribe to push:', error);
      alert('Failed to enable notifications. Please check your browser settings.');
    }
  }

  if (!isSupported || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-emerald-500/20 p-2.5 rounded-full">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Enable Notifications</h4>
            <p className="text-xs text-slate-400">Get instant alerts for deposits & loans.</p>
          </div>
        </div>
        <div className="flex gap-2 relative z-10 items-center">
          <button 
            onClick={() => {
              setShowPrompt(false);
              localStorage.setItem('growpesa_notif_dismissed', 'true');
            }} 
            className="text-slate-500 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <button 
            onClick={subscribeToPush} 
            className="bg-emerald-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg whitespace-nowrap shadow-md"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}