'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', is18: false, referralCode: '' });

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
      alert(data.error);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold text-green-deep mb-6">Join GrowPesa</h1>
        
        <input required placeholder="Full Name" className="w-full border p-3 rounded" 
          onChange={e => setForm({ ...form, name: e.target.value })} />
        
        <input required placeholder="Phone (e.g., 0712345678)" className="w-full border p-3 rounded" 
          onChange={e => setForm({ ...form, phone: e.target.value })} />
        
        <input placeholder="Referral Code (Optional)" className="w-full border p-3 rounded" 
          onChange={e => setForm({ ...form, referralCode: e.target.value })} />

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input type="checkbox" required 
            onChange={e => setForm({ ...form, is18: e.target.checked })} />
          <span>I confirm I am 18 years or older</span>
        </label>

        <button type="submit" disabled={loading} className="w-full bg-amber-warm text-white font-semibold p-3 rounded mt-4">
          {loading ? 'Joining...' : 'Join Now'}
        </button>
      </form>
    </main>
  );
}