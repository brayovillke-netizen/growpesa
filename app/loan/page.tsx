'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuote } from '@/lib/loan';

export default function LoanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [weeks, setWeeks] = useState<1 | 2 | 4>(1);
  const [reason, setReason] = useState('');

  const quote = amount ? getQuote(Number(amount), weeks) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;
    setLoading(true);

    const res = await fetch('/api/loan', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), weeks, reason }),
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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">Ask for a Loan</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Cancel</Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">How much do you need? (KSh)</label>
            <input 
              type="number" 
              required 
              value={amount}
              placeholder="e.g. 1000"
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none text-lg font-semibold" 
              onChange={e => setAmount(e.target.value)} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">When will you repay?</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeeks(w as 1|2|4)}
                  className={`py-3 rounded-xl border font-semibold transition ${
                    weeks === w ? 'bg-green-deep text-white border-green-deep' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {w} Week{w > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. School fees"
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
              onChange={e => setReason(e.target.value)} 
            />
          </div>

          {quote && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 space-y-2 mt-4">
              <div className="flex justify-between text-sm text-gray-700">
                <span>You receive (95%):</span>
                <span className="font-semibold">KSh {quote.payout.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>Interest ({quote.rate}%):</span>
                <span className="font-semibold">KSh {quote.interest.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-amber-200 pt-2 mt-2">
                <span className="font-bold text-gray-900">You repay:</span>
                <span className="font-bold text-green-deep text-lg">KSh {quote.repayTotal.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-500 text-right mt-1">Due on {quote.dueDate}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !amount} 
            className="w-full bg-green-deep text-white font-semibold p-3.5 rounded-xl mt-2 hover:bg-green-800 transition disabled:opacity-50"
          >
            {loading ? 'Requesting...' : 'Accept Terms & Ask'}
          </button>
        </form>

      </div>
    </main>
  );
}