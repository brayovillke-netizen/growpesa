'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TreasurerBottomNav from '../components/TreasurerBottomNav';

export default function TreasurerPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('treasurer_unlocked') === 'true') {
      setIsUnlocked(true);
      loadData();
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/treasurer/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      sessionStorage.setItem('treasurer_unlocked', 'true');
      setIsUnlocked(true);
      loadData();
    } else {
      alert('Incorrect PIN');
      setLoading(false);
    }
  }

  function loadData() {
    setLoading(true);
    fetch('/api/treasurer/data')
      .then(async (res) => {
        if (!res.ok) {
          router.push('/login');
          return;
        }
        return res.json();
      })
      .then(d => {
        if (d) {
          setData(d);
          setLoading(false);
        }
      });
  }

  async function handleApproveLoan(loanId: number) {
    if (!confirm('Approve this loan request?')) return;
    const res = await fetch('/api/treasurer/approve', { method: 'POST', body: JSON.stringify({ loanId }) });
    if (res.ok) loadData();
  }

  async function handleMarkPaid(loanId: number) {
    if (!confirm('Have you sent the M-Pesa to the member?')) return;
    const res = await fetch('/api/treasurer/mark-paid', { method: 'POST', body: JSON.stringify({ loanId }) });
    if (res.ok) loadData();
  }

  async function handleApproveSaving(savingId: number) {
    if (!confirm('Verify M-Pesa code and approve savings?')) return;
    const res = await fetch('/api/treasurer/approve-savings', { method: 'POST', body: JSON.stringify({ savingId }) });
    if (res.ok) loadData();
  }

  // PIN SCREEN
  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Treasurer Access</h1>
          <p className="text-sm text-gray-500 mb-6">Enter your secret 4-digit PIN</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value)}
              className="w-full text-center text-3xl tracking-[0.5em] font-bold border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none mb-4"
              placeholder="••••" required
            />
            <button type="submit" disabled={loading} className="w-full bg-green-deep text-white font-semibold p-3 rounded-xl hover:bg-green-800 transition">
              {loading ? 'Verifying...' : 'Unlock Dashboard'}
            </button>
          </form>
          <Link href="/" className="block mt-4 text-sm text-gray-500 hover:text-gray-900">Back to Member View</Link>
        </div>
      </main>
    );
  }

  if (loading || !data) return <div className="p-6 text-center text-gray-500">Loading dashboard...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      
      <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Admin</h1>
          <p className="text-xs text-gray-500">Group Overview</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('treasurer_unlocked'); setIsUnlocked(false); }} className="text-sm font-semibold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">
          Lock
        </button>
      </header>

      <div className="max-w-md mx-auto p-5 space-y-6">
        
        {/* Top Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-deep rounded-3xl p-5 shadow-lg text-white">
            <p className="text-xs font-medium opacity-80 mb-1">Total Pool</p>
            <h2 className="text-2xl font-bold">KSh {data.pool?.toLocaleString() || '0'}</h2>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Cash Out</p>
            <h2 className="text-2xl font-bold text-gray-900">KSh {data.cashOut?.toLocaleString() || '0'}</h2>
          </div>
        </div>

        {/* Alerts / Pending Actions */}
        {(data.pendingSavings?.length > 0 || data.requests?.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm font-bold text-amber-800">Action Required</p>
              <p className="text-xs text-amber-700">You have pending approvals.</p>
            </div>
            <span className="bg-amber-warm text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              {(data.pendingSavings?.length || 0) + (data.requests?.length || 0)}
            </span>
          </div>
        )}

        {/* Pending Savings */}
        {data.pendingSavings?.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Savings to Verify</h3>
            <div className="space-y-3">
              {data.pendingSavings.map((s: any) => (
                <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">{s.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 mb-2">KSh {s.amount.toLocaleString()}</p>
                    <button onClick={() => handleApproveSaving(s.id)} className="bg-green-deep text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-800 transition">
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loan Requests */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Loan Requests</h3>
          {!data.requests || data.requests.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500">No pending requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.requests.map((req: any) => (
                <div key={req.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{req.name}</p>
                      <p className="text-xs text-gray-500">{req.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-deep text-lg">KSh {req.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{req.weeks} Week{req.weeks > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button onClick={() => handleApproveLoan(req.id)} className="w-full bg-amber-warm text-white font-semibold py-2.5 rounded-xl hover:bg-amber-600 transition text-sm mt-2">
                    Approve Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Awaiting Manual Send */}
        {data.awaitingPayout?.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Awaiting M-Pesa Send</h3>
            <div className="space-y-3">
              {data.awaitingPayout.map((loan: any) => (
                <div key={loan.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{loan.name}</p>
                      <p className="text-xs text-gray-500">{loan.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">Send: KSh {loan.payout.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">(Request was {loan.amount})</p>
                    </div>
                  </div>
                  <button onClick={() => handleMarkPaid(loan.id)} className="w-full bg-gray-900 text-white font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition text-sm">
                    Mark as Sent
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <TreasurerBottomNav />
    </main>
  );
}