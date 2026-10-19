'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TreasurerBottomNav from '../../components/TreasurerBottomNav';

export default function TreasurerWithdrawalsPage() {
  const router = useRouter();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('treasurer_unlocked') !== 'true') {
      router.push('/treasurer');
      return;
    }
    loadData();
  }, [router]);

  function loadData() {
    fetch('/api/treasurer/withdrawals')
      .then(res => {
        if (!res.ok) throw new Error('Denied');
        return res.json();
      })
      .then(d => {
        setWithdrawals(d.withdrawals);
        setLoading(false);
      })
      .catch(() => router.push('/treasurer'));
  }

  async function handleAction(withdrawalId: number, action: 'approve' | 'complete') {
    if (action === 'approve') {
      if (!confirm('Approve this withdrawal? Member will be notified it takes 24 hours.')) return;
    } else {
      if (!confirm('Have you sent the M-Pesa? This will deduct the funds from their account.')) return;
    }

    const res = await fetch('/api/treasurer/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ withdrawalId, action }),
    });

    if (res.ok) loadData();
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading withdrawals...</div>;

  const pending = withdrawals.filter(w => w.status === 'pending');
  const approved = withdrawals.filter(w => w.status === 'approved');

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Withdrawals</h1>
            <p className="text-xs text-gray-500">Manage payout requests</p>
          </div>
        </header>

        {/* Pending Approvals */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Pending Requests</h3>
          {pending.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm text-sm text-gray-500">
              No pending requests.
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(w => (
                <div key={w.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-500">{w.phone}</p>
                    <p className="text-xs font-semibold text-gray-700 mt-1">Req: KSh {w.amount.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleAction(w.id, 'approve')}
                    className="bg-green-deep text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-green-800 transition"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Awaiting Payout (Approved) */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Awaiting M-Pesa Send</h3>
          {approved.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm text-sm text-gray-500">
              No approved requests waiting.
            </div>
          ) : (
            <div className="space-y-3">
              {approved.map(w => (
                <div key={w.id} className="bg-amber-50 rounded-2xl p-4 shadow-sm border border-amber-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900">{w.name}</p>
                    <p className="text-xs text-gray-500">{w.phone}</p>
                    <p className="text-xs font-semibold text-gray-700 mt-1">Send: KSh {w.amount.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={() => handleAction(w.id, 'complete')}
                    className="bg-gray-900 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-gray-800 transition"
                  >
                    Mark Sent
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <TreasurerBottomNav />
    </main>
  );
}