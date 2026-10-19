'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', is18: false, referralCode: '', pin: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    const res = await fetch('/api/join', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to join');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-green-deep mb-6">Join GrowPesa</h1>
        
        <input required placeholder="Full Name" className="w-full border border-gray-300 p-3 rounded-xl outline-none" 
          onChange={e => setForm({ ...form, name: e.target.value })} />
        
        <input required type="tel" placeholder="Phone (e.g., 0712345678)" className="w-full border border-gray-300 p-3 rounded-xl outline-none" 
          onChange={e => setForm({ ...form, phone: e.target.value })} />

        <input required type="password" maxLength={4} placeholder="Create a 4-Digit PIN" className="w-full border border-gray-300 p-3 rounded-xl outline-none tracking-widest text-lg" 
          onChange={e => setForm({ ...form, pin: e.target.value })} />
        
        <input placeholder="Referral Code (Optional)" className="w-full border border-gray-300 p-3 rounded-xl outline-none" 
          onChange={e => setForm({ ...form, referralCode: e.target.value })} />

        <label className="flex items-center space-x-2 text-sm text-gray-700 pt-2">
          <input type="checkbox" required 
            onChange={e => setForm({ ...form, is18: e.target.checked })} />
          <span>I confirm I am 18 years or older</span>
        </label>

        <button type="submit" disabled={loading} className="w-full bg-amber-warm text-white font-semibold p-3.5 rounded-xl mt-4 hover:bg-amber-600 transition disabled:opacity-50">
          {loading ? 'Joining...' : 'Join Now'}
        </button>

        {/* THIS IS WHERE THE LINK BELONGS - INSIDE THE FORM */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <a href="/login" className="text-green-deep font-semibold hover:underline">Log In</a>
        </p>
      </form>
    </main>
  );
}