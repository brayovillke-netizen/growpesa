'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TreasurerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  function loadData() {
    fetch('/api/treasurer/data')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }

  useEffect(() => { loadData(); }, []);

  async function handleApproveLoan(loanId: number) {
    if (!confirm('Approve this loan request?')) return;
    const res = await fetch('/api/treasurer/approve', {
      method: 'POST',
      body: JSON.stringify({ loanId }),
    });
    if (res.ok) loadData();
  }

  async function handleMarkPaid(loanId: number) {
    if (!confirm('Have you sent the M-Pesa to the member? This will activate the loan.')) return;
    const res = await fetch('/api/treasurer/mark-paid', {
      method: 'POST',
      body: JSON.stringify({ loanId }),
    });
    if (res.ok) loadData();
  }

  async function handleApproveSaving(savingId: number) {
    if (!confirm('Verify M-Pesa code and approve savings?')) return;
    const res = await fetch('/api/treasurer/approve-savings', {
      method: 'POST',
      body: JSON.stringify({ savingId }),
    });
    if (res.ok) loadData();
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Treasurer</h1>
            <p className="text-xs text-gray-500">Group Overview</p>
          </div>
          <div className="flex gap-4">
            <Link href="/treasurer/settings" className="text-sm text-gray-500 font-semibold hover:underline">
              Settings
            </Link>
            <Link href="/" className="text-sm text-green-deep font-semibold hover:underline">
              Member View &rarr;
            </Link>
          </div>
        </header>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-deep rounded-2xl p-5 shadow-sm text-white">
            <p className="text-xs font-medium opacity-80 mb-1">Total Pool</p>
            <h2 className="text-2xl font-bold">KSh {data.pool.toLocaleString()}</h2>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-1">Cash Out (Loans)</p>
            <h2 className="text-2xl font-bold text-gray-900">KSh {data.cashOut.toLocaleString()}</h2>
          </div>
        </div>

        {/* Share-out Link */}
        <Link href="/treasurer/shareout" className="block w-full bg-white border border-gray-200 rounded-2xl p-4 shadow-sm text-center font-bold text-gray-900 hover:bg-gray-50 transition">
          🎉 Run Share-out Calculation
        </Link>

        {/* Pending Savings */}
        {data.pendingSavings.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Savings to Verify
              <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                {data.pendingSavings.length}
              </span>
            </h3>
            <div className="space-y-3">
              {data.pendingSavings.map((s: any) => (
                <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex justify-between items-center">
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

        {/* Pending Loan Requests */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            Loan Requests 
            {data.requests.length > 0 && (
              <span className="bg-amber-warm text-white text-xs px-2 py-0.5 rounded-full">{data.requests.length}</span>
            )}
          </h3>
          {data.requests.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500">No pending requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.requests.map((req: any) => (
                <div key={req.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
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
                  {req.reason && <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg mb-4 mt-2">"{req.reason}"</p>}
                  <button onClick={() => handleApproveLoan(req.id)} className="w-full bg-amber-warm text-white font-semibold py-2.5 rounded-xl hover:bg-amber-600 transition">
                    Approve Request
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Loans Waiting for M-Pesa Send */}
        {data.awaitingPayout && data.awaitingPayout.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Awaiting Manual M-Pesa Send
            </h3>
            <div className="space-y-3">
              {data.awaitingPayout.map((loan: any) => (
                <div key={loan.id} className="bg-amber-50 rounded-2xl p-5 shadow-sm border border-amber-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{loan.name}</p>
                      <p className="text-xs text-gray-500">{loan.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">Send: KSh {loan.payout.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">(Loan is {loan.amount})</p>
                    </div>
                  </div>
                  <button onClick={() => handleMarkPaid(loan.id)} className="w-full bg-gray-900 text-white font-semibold py-2.5 rounded-xl hover:bg-gray-800 transition">
                    Mark as Sent
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}