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

  const syncSubscriptionToDB = async (sub: PushSubscription) => {
    try {
      const { error } = await supabase.from('push_subscriptions').upsert({
        phone: userPhone,
        subscription: sub.toJSON(),
      }, { onConflict: 'phone' });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to sync to DB:", err);
    }
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false);
      return;
    }

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setSubscription(sub);
          syncSubscriptionToDB(sub); 
        }
      });
    });
  }, [userPhone]);

  const subscribeToPush = async () => {
    setLoading(true);
    try {
      // 1. Check browser permission first
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        throw new Error("Browser blocked notifications. Please tap the 'Lock' icon in the URL bar and allow notifications.");
      }

      const reg = await navigator.serviceWorker.ready;
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        throw new Error("VAPID Public Key is missing.");
      }

      // 2. Request subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
      
      setSubscription(sub);
      await syncSubscriptionToDB(sub);

      alert('Notifications enabled successfully!');

    } catch (error: any) {
      console.error('Failed to subscribe:', error);
      alert(`Failed: ${error.message}\n\nIf on iPhone, you MUST tap "Share" -> "Add to Home Screen".`);
    } finally {
      setLoading(false);
    }
  };

  // Hide if not supported, or if successfully subscribed
  if (!isSupported || subscription) return null;

  // The banner will now show on every refresh until they successfully subscribe
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
        {/* We keep the X to hide it for the current page view, but it will reappear on refresh */}
        <button onClick={() => setSubscription({} as PushSubscription)} className="text-slate-500 hover:text-white font-bold text-lg leading-none">
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