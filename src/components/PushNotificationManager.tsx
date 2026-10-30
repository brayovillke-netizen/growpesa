'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager({ userPhone }: { userPhone: string }) {
  const [isSupported, setIsSupported] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed the prompt
    const dismissed = localStorage.getItem('tibapay_push_dismissed');
    if (dismissed === 'true') setIsDismissed(true);

    // Check if browser supports push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setSubscription(sub);
      });
    });
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('tibapay_push_dismissed', 'true');
  };

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Force a new subscription if the old one is dead
      if (subscription) {
        await subscription.unsubscribe();
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      
      setSubscription(sub);

      await supabase.from('push_subscriptions').upsert({
        phone: userPhone,
        subscription: sub.toJSON(),
      }, { onConflict: 'phone' });

      alert('Notifications enabled successfully!');
      localStorage.removeItem('tibapay_push_dismissed'); // Reset dismissal just in case

    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to enable notifications. (Note: iPhones MUST tap "Share" -> "Add to Home Screen" and open from the icon first).');
    } finally {
      setLoading(false);
    }
  };

  // If iOS Safari (not added to home screen), show a warning
  if (!isSupported) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-amber-900/90 border border-amber-500/50 p-4 rounded-2xl shadow-2xl flex flex-col gap-2">
         <h3 className="font-bold text-xs text-amber-300">📱 iPhone Users</h3>
         <p className="text-[10px] text-amber-100">To get alerts, tap the <strong>Share</strong> button in Safari and select <strong>"Add to Home Screen"</strong>. Then open the app from your home screen.</p>
         <button onClick={handleDismiss} className="text-[10px] text-amber-400 underline mt-1 text-left">Dismiss</button>
      </div>
    );
  }

  // If already subscribed or dismissed, don't show the banner
  if (subscription || isDismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400 text-xl">🔔</div>
          <div>
            <h3 className="font-bold text-sm text-white">Enable Notifications</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Get instant alerts for deposits & loans.</p>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-500 hover:text-white font-bold text-lg leading-none">
          ✕
        </button>
      </div>
      <button 
        onClick={subscribeToPush}
        disabled={loading}
        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs shadow-lg hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? 'Enabling...' : 'Allow Notifications'}
      </button>
    </div>
  );
}