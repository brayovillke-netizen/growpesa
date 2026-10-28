'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

interface LedgerItem {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  code: string;
  smsMessage?: string;
  sms_message?: string;
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
  const [syncing, setSyncing] = useState<boolean>(false);

  const fetchQueue = useCallback(async () => {
    try {
      setSyncing(true);
      
      const { data: poolData, error: poolError } = await supabase
        .from('treasury_pool')
        .select('pool_balance')
        .eq('id', 1)
        .single();
        
      if (poolError) throw poolError;
      if (poolData) setMainPool(Math.round(Number(poolData.pool_balance)));

      const { data: queueData, error: queueError } = await supabase
        .from('ledger_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (queueError) throw queueError;
      
      const mappedQueue = (queueData || []).map((row: any) => ({
        id: String(row.id),
        phone: row.phone,
        type: String(row.type || ''),
        amount: Math.round(Number(row.amount)) || 0,
        date: String(row.date || ''),
        status: String(row.status || '').replace(/_/g, ' '),
        code: String(row.code || ''),
        smsMessage: row.sms_message,
      }));

      setQueue(mappedQueue);
    } catch (err: any) {
      // Silently log sync errors so they don't clutter the screen
      console.error('Sync error:', err.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('tibapay_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role !== 'admin') {
          window.location.replace('/dashboard');
          return;
        }
        setAdminUser(parsed);
      } catch {
        window.location.replace('/dashboard');
      }
    } else {
      window.location.replace('/dashboard');
      return;
    }

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // 5 seconds to reduce rate limiting
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleApprove = async (item: LedgerItem) => {
    try {
      let poolUpdate: number | undefined = undefined;
      const amt = Math.round(Number(item.amount));
      
      if (item.type.includes('Deposit') || item.type.includes('Loan Repayment')) {
        poolUpdate = Math.round(mainPool + amt);
      } else if (item.type.includes('Withdrawal') || item.type.includes('Loan Request')) {
        poolUpdate = Math.max(0, Math.round(mainPool - amt));
      }

      const { error: itemError } = await supabase
        .from('ledger_items')
        .update({ status: 'COMPLETED' })
        .eq('id', String(item.id));

      if (itemError) throw itemError;

      if (poolUpdate !== undefined) {
        const { error: poolError } = await supabase
          .from('treasury_pool')
          .update({ pool_balance: poolUpdate, updated_at: new Date().toISOString() })
          .eq('id', 1);
        
        if (poolError) throw poolError;
        setMainPool(poolUpdate);
      }

      await fetchQueue();
      setMessage(`Approved ${item.code}`);
    } catch (e: any) {
      setMessage(`Approval error: ${e.message}`);
    }
  };

  const handleReject = async (item: LedgerItem) => {
    try {
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'REJECTED' })
        .eq('id', String(item.id));

      if (error) throw error;

      await fetchQueue();
      setMessage(`Rejected ${item.code}`);
    } catch (e: any) {
      setMessage(`Reject error: ${e.message}`);
    }
  };

  const pendingOnly = queue.filter(
    (q) => q.status !== 'COMPLETED' && q.status !== 'REJECTED'
  );

  const filteredQueue = pendingOnly.filter((item) => {
    if (activeFilter === 'deposits') return item.type.includes('Deposit');
    if (activeFilter === 'withdrawals') return item.type.includes('Withdrawal');
    if (activeFilter === 'loans') return item.type.includes('Loan');
    return true;
  });

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4 font-sans pb-24">
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
            window.location.replace('/dashboard');
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

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-600 p-3 rounded-2xl text-slate-950 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Main Pool</p>
          <p className="text-sm font-black mt-1">KES {mainPool.toLocaleString()}</p>
        </div>
        <div className="bg-amber-600 p-3 rounded-2xl text-slate-950 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pending Queue</p>
          <p className="text-sm font-black mt-1">{pendingOnly.length} Requests</p>
          <p className="text-[9px] opacity-70 mt-0.5">{syncing ? 'syncing...' : 'live'}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-white">Review Queue</h3>
          <button
            onClick={fetchQueue}
            className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer"
          >
            Refresh
          </button>
        </div>

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

        <div className="space-y-3 pt-1 max-h-[420px] overflow-y-auto pr-1">
          {filteredQueue.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
              No pending transactions for "{activeFilter}".
            </div>
          ) : (
            filteredQueue.map((item) => {
              const awaitingPin = item.status === 'PENDING PIN';
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{item.type}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.date} | Code:{' '}
                        <strong className="text-amber-400">{item.code}</strong> | Phone:{' '}
                        {item.phone || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-400">
                        KES {Number(item.amount).toLocaleString()}
                      </p>
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {(item.smsMessage || item.sms_message) && (
                    <p className="text-[10px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800 italic">
                      "{item.smsMessage || item.sms_message}"
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(item)}
                      disabled={awaitingPin}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer shadow disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {awaitingPin ? 'Awaiting PIN' : `Approve (KES ${Number(item.amount).toLocaleString()})`}
                    </button>
                    <button
                      onClick={() => handleReject(item)}
                      className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold rounded-lg text-[10px] transition cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}