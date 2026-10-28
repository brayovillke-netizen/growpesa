'use client';

import { useState, useEffect } from 'react';

interface LedgerItem {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  code: string;
  smsMessage?: string;
  phone?: string;
}

interface MemberUser {
  phone: string;
  name: string;
  role: 'member' | 'admin';
}

type FilterTab = 'all' | 'deposits' | 'withdrawals' | 'loans';

export default function AdminPage() {
  const [adminUser, setAdminUser] = useState<MemberUser | null>(null);
  const [mainPool, setMainPool] = useState<number>(6000);
  const [queue, setQueue] = useState<LedgerItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [message, setMessage] = useState<string | null>(null);

  const loadAdminData = () => {
    const savedPool = localStorage.getItem('tibapay_pool');
    if (savedPool) setMainPool(Number(savedPool));

    const savedLedger = localStorage.getItem('tibapay_ledger');
    if (savedLedger) {
      try {
        const parsed: LedgerItem[] = JSON.parse(savedLedger);
        const pendingItems = parsed.filter(
          (item) =>
            item.status === 'PENDING ADMIN APPROVAL' ||
            item.status === 'TIMEOUT / PASTE SMS' ||
            item.type.includes('Loan Request') ||
            item.type.includes('Withdrawal')
        );
        setQueue(pendingItems);
      } catch (e) {}
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('tibapay_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role !== 'admin') {
          window.location.href = '/dashboard';
          return;
        }
        setAdminUser(parsed);
      } catch (e) {
        window.location.href = '/dashboard';
      }
    } else {
      window.location.href = '/dashboard';
      return;
    }

    loadAdminData();

    const handleSync = () => loadAdminData();
    window.addEventListener('tibapay_sync', handleSync);
    window.addEventListener('storage', handleSync);

    const interval = setInterval(loadAdminData, 2000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('tibapay_sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const handleApprove = (item: LedgerItem) => {
    const savedLedger = localStorage.getItem('tibapay_ledger');
    if (!savedLedger) return;

    try {
      let ledger: LedgerItem[] = JSON.parse(savedLedger);
      ledger = ledger.map((l) => {
        if (l.id === item.id) {
          return { ...l, status: 'COMPLETED' };
        }
        return l;
      });

      localStorage.setItem('tibapay_ledger', JSON.stringify(ledger));

      if (item.type.includes('Deposit')) {
        const newPool = mainPool + item.amount;
        setMainPool(newPool);
        localStorage.setItem('tibapay_pool', String(newPool));
      }

      if (item.type.includes('Loan Request')) {
        const savedLoan = localStorage.getItem('tibapay_active_loan');
        if (savedLoan) {
          let loan = JSON.parse(savedLoan);
          loan.status = 'ACTIVE';
          localStorage.setItem('tibapay_active_loan', JSON.stringify(loan));
        }
      }

      if (item.type.includes('Withdrawal')) {
        const newPool = Math.max(0, mainPool - item.amount);
        setMainPool(newPool);
        localStorage.setItem('tibapay_pool', String(newPool));
      }

      window.dispatchEvent(new Event('tibapay_sync'));
      loadAdminData();
      setMessage(`✅ Successfully approved transaction ${item.code}`);
    } catch (e) {
      setMessage('⚠️ Error processing approval.');
    }
  };

  const handleReject = (itemId: string) => {
    const savedLedger = localStorage.getItem('tibapay_ledger');
    if (!savedLedger) return;

    try {
      let ledger: LedgerItem[] = JSON.parse(savedLedger);
      ledger = ledger.map((l) => {
        if (l.id === itemId) {
          return { ...l, status: 'REJECTED' };
        }
        return l;
      });

      localStorage.setItem('tibapay_ledger', JSON.stringify(ledger));
      window.dispatchEvent(new Event('tibapay_sync'));
      loadAdminData();
      setMessage(`❌ Transaction rejected.`);
    } catch (e) {}
  };

  const uncompletedQueue = queue.filter(
    (q) => q.status !== 'COMPLETED' && q.status !== 'REJECTED'
  );

  const filteredQueue = uncompletedQueue.filter((item) => {
    if (activeFilter === 'deposits') return item.type.includes('Deposit');
    if (activeFilter === 'withdrawals') return item.type.includes('Withdrawal');
    if (activeFilter === 'loans') return item.type.includes('Loan Request');
    return true; // 'all'
  });

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4 font-sans pb-24">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950 text-lg shadow-md shadow-amber-500/20">
            TR
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white">
                Tiba<span className="text-amber-400">Pay</span> Admin
              </h1>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-500/20">
                Treasurer
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{adminUser.phone}</p>
          </div>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('tibapay_auth_user');
            window.location.href = '/dashboard';
          }}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[10px] transition cursor-pointer border border-slate-700"
        >
          Exit Admin
        </button>
      </div>

      {message && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold leading-relaxed">
          {message}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-600 p-3 rounded-2xl text-slate-950 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Main Pool</p>
          <p className="text-sm font-black mt-1">KES {mainPool.toLocaleString()}</p>
        </div>
        <div className="bg-amber-600 p-3 rounded-2xl text-slate-950 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pending Queue</p>
          <p className="text-sm font-black mt-1">{uncompletedQueue.length} Requests</p>
        </div>
      </div>

      {/* Approval Queue */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-white">Review Queue</h3>
          <span className="text-[10px] text-slate-400 font-semibold">{filteredQueue.length} items</span>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold text-center">
          {[
            { key: 'all', label: 'All' },
            { key: 'deposits', label: 'Deposits' },
            { key: 'withdrawals', label: 'Withdraw' },
            { key: 'loans', label: 'Loans' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as FilterTab)}
              className={`py-1.5 rounded-lg transition cursor-pointer ${
                activeFilter === tab.key
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-1 max-h-[380px] overflow-y-auto pr-1">
          {filteredQueue.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
              No pending transactions found for "{activeFilter}".
            </div>
          ) : (
            filteredQueue.map((item) => (
              <div key={item.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{item.type}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.date} • Code: <strong className="text-amber-400">{item.code}</strong> • Phone: {item.phone || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400">KES {item.amount.toLocaleString()}</p>
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {item.status}
                    </span>
                  </div>
                </div>

                {item.smsMessage && (
                  <p className="text-[10px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800 italic">
                    "{item.smsMessage}"
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleApprove(item)}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer shadow"
                  >
                    Approve & Disburse ✓
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold rounded-lg text-[10px] transition cursor-pointer"
                  >
                    Reject ✗
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}