'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager({ userPhone }: { userPhone: string }) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    if (localStorage.getItem('growpesa_notif_dismissed') === 'true') return;
    
    const timer = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    localStorage.setItem('growpesa_notif_dismissed', 'true'); 
    setShowPrompt(false);
    
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
          });

          // Save subscription to Supabase
          await supabase.from('push_subscriptions').delete().eq('phone', userPhone);
          await supabase.from('push_subscriptions').insert({
            phone: userPhone,
            subscription: subscription
          });

          alert('Push Notifications Enabled! 🚀 You will now get alerts even when the app is closed.');
        } catch (e) {
          console.error('Subscription failed', e);
          alert('Failed to enable background notifications.');
        }
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
          <button onClick={handleDismiss} className="text-slate-500 hover:text-white p-1"><X className="w-4 h-4" /></button>
          <button onClick={handleAllow} className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md">Allow</button>
        </div>
      </div>
    </div>
  );
}