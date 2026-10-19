'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    setLoading(true);
    
    await fetch('/api/logout', { method: 'POST' });
    
    // Redirect to home (which will show the "Join" and "Log In" buttons)
    router.push('/');
    router.refresh();
  }

  return (
    <button 
      onClick={handleLogout} 
      disabled={loading}
      className="text-sm font-semibold text-red-500 hover:text-red-700 transition"
    >
      {loading ? 'Logging out...' : 'Log Out'}
    </button>
  );
}