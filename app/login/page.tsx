'use client';
import { useState, useEffect } from 'react';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    // Check if the URL has ?expired=true
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === 'true') {
      setExpired(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.role === 'treasurer') {
          sessionStorage.setItem('treasurer_unlocked', 'true'); 
          window.location.href = '/treasurer';
        } else {
          window.location.href = '/';
        }
      } else {
        alert(data.error || 'Login failed');
        setLoading(false);
      }
    } catch (err) {
      alert('Network error.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="GrowPesa" width={64} height={64} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-deep">Welcome Back</h1>
          <p className="text-gray-500 text-sm mt-1">Log in to your GrowPesa account</p>
        </div>

        {expired && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3 rounded-xl mb-4 text-center">
            You were logged out due to inactivity.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="tel" required placeholder="Phone (e.g., 0712345678)"
            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
            onChange={e => setPhone(e.target.value)} 
          />
          <input 
            type="password" required maxLength={4} placeholder="4-Digit PIN"
            className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none tracking-widest text-lg" 
            onChange={e => setPin(e.target.value)} 
          />

          <button type="submit" disabled={loading} className="w-full bg-green-deep text-white font-semibold p-3.5 rounded-xl mt-2 hover:bg-green-800 transition disabled:opacity-50">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? <a href="/join" className="text-green-deep font-semibold">Join here</a>
        </p>
      </div>
    </main>
  );
}