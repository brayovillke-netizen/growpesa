'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';

export default function WithdrawPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount) }),
    });

    const data = await res.json();

    if (res.ok) {
      // This is the exact text you requested
      alert('Withdrawal Request Sent. Your Treasurer will review your request shortly.');
      router.push('/');
    } else {
      alert(data.error || 'Failed to request withdrawal');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Withdraw Funds</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Cancel</Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Withdraw (KSh)</label>
            <input 
              type="number" 
              required 
              value={amount}
              placeholder="e.g. 500"
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none text-lg font-semibold" 
              onChange={e => setAmount(e.target.value)} 
            />
            <p className="text-xs text-gray-500 mt-2">
              Note: You cannot withdraw money that is locked or currently out on a loan.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading || !amount} 
            className="w-full bg-green-deep text-white font-semibold p-3.5 rounded-xl mt-4 hover:bg-green-800 transition disabled:opacity-50"
          >
            {loading ? 'Submitting Request...' : 'Request Withdrawal'}
          </button>
        </form>

      </div>
      <BottomNav />
    </main>
  );
}