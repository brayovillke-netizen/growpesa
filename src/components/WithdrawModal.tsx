'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Or use your existing supabase client instance
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function WithdrawModal({ userId, userPhone, onClose, onSuccess }: { userId: string, userPhone: string, onClose: () => void, onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleWithdrawRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Please enter a valid withdrawal amount.');
      setLoading(false);
      return;
    }

    try {
      // Insert withdrawal request into a 'withdrawals' table in Supabase
      const { error: dbError } = await supabase.from('withdrawals').insert([
        {
          user_id: userId,
          phone: userPhone,
          amount: withdrawAmount,
          status: 'pending', // Admin will review and process manually
          created_at: new Date().toISOString(),
        }
      ]);

      if (dbError) throw dbError;

      alert('Withdrawal request submitted successfully! The admin has been notified.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Request Withdrawal</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>

        <p className="text-xs text-slate-400 mb-6">
          Submit your withdrawal request. Once verified, the admin will send funds to your registered M-Pesa number ({userPhone}).
        </p>

        {error && <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">{error}</div>}

        <form onSubmit={handleWithdrawRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Amount (KES)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 font-semibold text-slate-300 transition hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Withdraw'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}