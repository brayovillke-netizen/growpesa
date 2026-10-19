'use client';
import { useEffect, useRef } from 'react';

export default function IdleTimer({ timeoutMinutes = 5 }: { timeoutMinutes?: number }) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    // 1. Clear Treasurer unlock session if it exists
    sessionStorage.removeItem('treasurer_unlocked');
    
    // 2. Call API to clear the secure cookie
    await fetch('/api/logout', { method: 'POST' });
    
    // 3. Redirect to login with a message
    window.location.href = '/login?expired=true';
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleLogout, timeoutMinutes * 60 * 1000);
  };

  useEffect(() => {
    // Start the timer immediately on mount
    resetTimer();

    // Monitor these events to reset the timer
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, []);

  return null; // This component doesn't render anything visually
}