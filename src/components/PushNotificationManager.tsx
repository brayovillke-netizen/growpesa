'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export function PushNotificationManager({ userPhone }: { userPhone: string }) {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // If browser doesn't support or user already decided, exit
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    if (localStorage.getItem('growpesa_notif_dismissed') === 'true') return;

    // Show prompt after 3 seconds
    const timer = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted' || permission === 'denied') {
        localStorage.setItem('growpesa_notif_dismissed', 'true');
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error requesting permission', error);
    }
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
            className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-md"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}