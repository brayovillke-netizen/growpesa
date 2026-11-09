'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export function PushNotificationManager({ userPhone }: { userPhone: string }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIOSDevice);

    // Developer override to force show for testing
    const forceShow = window.location.search.includes('test_notif=true');
    if (forceShow) {
      setShowPrompt(true);
      return;
    }

    // If the browser doesn't support notifications, exit
    if (!('Notification' in window)) {
      console.log('Notifications not supported in this browser.');
      return;
    }

    // If they already granted or denied, exit
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      return;
    }

    // Check if they previously dismissed the custom prompt
    if (localStorage.getItem('growpesa_notif_dismissed') === 'true') {
      return;
    }

    // Show prompt after 3 seconds
    const timer = setTimeout(() => setShowPrompt(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const subscribeToPush = async () => {
    if (!('Notification' in window)) return;
    
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        localStorage.setItem('growpesa_notif_dismissed', 'true');
        setShowPrompt(false);
        // You can add your backend fetch here to save the subscription later
      } else {
        localStorage.setItem('growpesa_notif_dismissed', 'true');
        setShowPrompt(false);
      }
    } catch (error) {
      console.error('Error requesting notification permission', error);
      alert("This browser does not allow notifications. Please open in Chrome or install the app.");
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] max-w-md mx-auto animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-emerald-500/20 p-2.5 rounded-full">
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              {isIos ? 'Add to Home Screen' : 'Enable Notifications'}
            </h4>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              {isIos 
                ? 'Tap the Share icon below and select "Add to Home Screen" to enable alerts.' 
                : 'Get instant alerts for deposits & loans.'}
            </p>
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
          
          {!isIos && (
            <button 
              onClick={subscribeToPush} 
              className="bg-emerald-500 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-md"
            >
              Allow
            </button>
          )}
        </div>
      </div>
    </div>
  );
}