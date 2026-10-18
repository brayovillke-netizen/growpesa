'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoanStatusPage() {
  const router = useRouter();
  const [loan, setLoan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [repayAmount, setRepayAmount] = useState('');
  const [code, setCode] = useState('');
  const [paying, setPaying] = useState(false);

  // Fetch loan details
  useEffect(() => {
    fetch('/api/loan/active')
      .then(res => res.json())
      .then(data => {
        setLoan(data.loan);
        setLoading(false);
      });
  }, []);

  async function handleRepay(e: React.FormEvent) {
    e.preventDefault();
    setPaying(true);

    const res = await fetch('/api/repay', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(repayAmount), code }),
    });

    if (res.ok) {
      router.refresh();
      window.location.reload(); 
    } else {
      const data = await res.json();
      alert(data.error);
      setPaying(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  if (!loan) {
    return (
      <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">You have no active loans.</p>
        <Link href="/" className="bg-green-deep text-white px-6 py-3 rounded-xl font-semibold">Back to Home</Link>
      </main>
    );
  }

  const owed = loan.repay_total - loan.paid;
  const progress = Math.min(100, (loan.paid / loan.repay_total) * 100);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto space-y-4">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">Loan Status</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Back</Link>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Amount Owed</p>
          <h2 className="text-3xl font-bold text-gray-900">KSh {owed.toLocaleString()}</h2>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
            <div className="bg-green-deep h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>Paid: KSh {loan.paid.toLocaleString()}</span>
            <span>Total: KSh {loan.repay_total.toLocaleString()}</span>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-1">Due Date</p>
              <p className="font-semibold">{loan.due_date}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Status</p>
              <p className="font-semibold text-amber-warm capitalize">{loan.status.replace('_', ' ')}</p>
            </div>
          </div>
        </div>

        {owed > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Make a Repayment</h3>
            <form onSubmit={handleRepay} className="space-y-3">
              <input 
                type="number" 
                required 
                placeholder="Amount (KSh)"
                max={owed}
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
                onChange={e => setRepayAmount(e.target.value)} 
              />
              <input 
                type="text" 
                required 
                placeholder="M-Pesa Code"
                className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none uppercase" 
                onChange={e => setCode(e.target.value)} 
              />
              <button 
                type="submit" 
                disabled={paying} 
                className="w-full bg-amber-warm text-white font-semibold p-3 rounded-xl mt-2 hover:bg-amber-600 transition disabled:opacity-50"
              >
                {paying ? 'Processing...' : 'Pay Now'}
              </button>
            </form>
          </div>
        )}

      </div>
    </main>
  );
}