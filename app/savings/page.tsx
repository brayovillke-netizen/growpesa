'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SavingsPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [code, setCode] = useState('');
  
  const [loadingSTK, setLoadingSTK] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [showManual, setShowManual] = useState(false);

  async function handleSTK(e: React.FormEvent) {
    e.preventDefault();
    setLoadingSTK(true);

    const res = await fetch('/api/savings/stk', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount) }),
    });

    if (res.ok) {
      alert('M-Pesa prompt sent! Check your phone and enter your PIN.');
      router.push('/');
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to trigger M-Pesa. Try manual entry.');
      setLoadingSTK(false);
    }
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    setLoadingManual(true);

    const res = await fetch('/api/savings', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), code }),
    });

    if (res.ok) {
      alert('Savings submitted! Waiting for Treasurer approval.');
      router.push('/');
    } else {
      const data = await res.json();
      alert(data.error);
      setLoadingManual(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Add Savings</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Cancel</Link>
        </div>

        {!showManual ? (
          /* AUTOMATED STK PUSH FLOW */
          <form onSubmit={handleSTK} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh)</label>
              <input 
                type="number" 
                required 
                value={amount}
                placeholder="e.g. 100"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none text-lg font-semibold" 
                onChange={e => setAmount(e.target.value)} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loadingSTK || !amount} 
              className="w-full bg-green-deep text-white font-semibold p-3.5 rounded-xl hover:bg-green-800 transition disabled:opacity-50"
            >
              {loadingSTK ? 'Connecting to M-Pesa...' : 'Pay via M-Pesa'}
            </button>

            <div className="text-center pt-2">
              <button type="button" onClick={() => setShowManual(true)} className="text-sm text-gray-500 hover:text-gray-900 underline">
                Safaricom down? Enter M-Pesa code manually
              </button>
            </div>
          </form>
        ) : (
          /* MANUAL FALLBACK FLOW */
          <form onSubmit={handleManual} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KSh)</label>
              <input 
                type="number" 
                required 
                value={amount}
                placeholder="e.g. 100"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
                onChange={e => setAmount(e.target.value)} 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Code</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. SFJ8H2K9L"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none uppercase" 
                onChange={e => setCode(e.target.value)} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loadingManual || !amount || !code} 
              className="w-full bg-gray-900 text-white font-semibold p-3.5 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loadingManual ? 'Submitting...' : 'Submit to Treasurer'}
            </button>

            <div className="text-center pt-2">
              <button type="button" onClick={() => setShowManual(false)} className="text-sm text-gray-500 hover:text-gray-900 underline">
                Back to automated M-Pesa
              </button>
            </div>
          </form>
        )}

      </div>
    </main>
  );
}