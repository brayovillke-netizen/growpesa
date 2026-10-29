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
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.pushManager.getSubscription().then(setSubscription);
      });
    }
  }, []);

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
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

    } catch (error) {
      console.error('Failed to subscribe:', error);
      alert('Failed to enable notifications. (Note: iPhones must Add to Home Screen first).');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) return null; // Don't show on unsupported browsers

  return (
    <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
      <h3 className="font-black text-base text-white flex items-center gap-2 mb-2">
        <span className="text-emerald-400">🔔</span> Phone Alerts
      </h3>
      <p className="text-[11px] text-slate-400 font-medium mb-3">
        Get notified instantly when deposits or loans are approved.
      </p>

      {subscription ? (
        <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold text-center">
          ✅ Notifications Enabled
        </div>
      ) : (
        <button 
          onClick={subscribeToPush}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Enabling...' : 'Enable Push Notifications'}
        </button>
      )}
    </div>
  );
}