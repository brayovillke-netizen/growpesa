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

interface Member {
  phone: string;
  full_name: string;
  savings_balance: number;
  account_status?: string;
}

type FilterTab = 'all' | 'deposits' | 'withdrawals' | 'loans';
type AdminTab = 'queue' | 'members' | 'activity';

function calculateGWF(amount: number): number {
  if (amount < 50) return 0;
  if (amount <= 100) return 3;
  if (amount <= 500) return 25;
  if (amount <= 1000) return 30;
  if (amount <= 1500) return 30;
  if (amount <= 3000) return 40;
  if (amount <= 5000) return 45;
  if (amount <= 10000) return 65;
  if (amount <= 20000) return 80;
  if (amount <= 50000) return 100;
  if (amount <= 100000) return 125;
  return Math.max(Math.ceil(amount * 0.0025), 125);
}

export default function AdminPage() {
  const [adminUser, setAdminUser] = useState<MemberUser | null>(null);
  const [mainPool, setMainPool] = useState<number>(6000);
  const [queue, setQueue] = useState<LedgerItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('queue');
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
      console.error('Sync error:', err.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('full_name');
      if (error) throw error;
      setMembers(data || []);
    } catch (e: any) {
      console.error('Members fetch error:', e.message);
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
        return;
      }
    } else {
      window.location.replace('/dashboard');
      return;
    }

    fetchQueue();
    fetchMembers();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchMembers]);

  // Members polling (only when tab active)
  useEffect(() => {
    if (!adminUser) return;
    if (activeAdminTab !== 'members') return;
    fetchMembers();
    const interval = setInterval(fetchMembers, 10000);
    return () => clearInterval(interval);
  }, [adminUser, activeAdminTab, fetchMembers]);

  const handleApprove = async (item: LedgerItem) => {
    try {
      let poolUpdate: number | undefined = undefined;
      const amt = Math.round(Number(item.amount));

      let currentSavings = 0;
      let referredBy = null;
      let referralPaid = false;
      let totalDeposited = 0;

      if (item.phone) {
        const { data: memberData } = await supabase
          .from('members')
          .select('savings_balance, referred_by, referral_paid, total_deposited')
          .eq('phone', item.phone)
          .single();

        if (memberData) {
          currentSavings = Number(memberData.savings_balance) || 0;
          referredBy = memberData.referred_by;
          referralPaid = memberData.referral_paid;
          totalDeposited = Number(memberData.total_deposited) || 0;
        }
      }

      let newMemberSavings = currentSavings;

      if (item.type.includes('Deposit')) {
        poolUpdate = Math.round(mainPool + amt);
        newMemberSavings = currentSavings + amt;
        totalDeposited += amt;
      } else if (item.type.includes('Withdrawal')) {
        const gwfFee = calculateGWF(amt);
        const netPayout = Math.max(0, amt - gwfFee);
        poolUpdate = Math.max(0, Math.round(mainPool - netPayout));
        newMemberSavings = Math.max(0, currentSavings - amt);
      } else if (item.type.includes('Loan Request')) {
        const loanFee = Math.round(amt * 0.05);
        const gwfFee = calculateGWF(amt);
        const netDisbursed = Math.max(0, amt - loanFee - gwfFee);
        poolUpdate = Math.max(0, Math.round(mainPool - netDisbursed));
      } else if (item.type.includes('Loan Repayment')) {
        poolUpdate = Math.round(mainPool + amt);
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

      if (item.phone && (item.type.includes('Deposit') || item.type.includes('Withdrawal'))) {
        
        // A. ALWAYS update the main savings balance first
        const { error: savingsError } = await supabase
          .from('members')
          .update({ savings_balance: newMemberSavings })
          .eq('phone', item.phone);
        
        if (savingsError) {
          throw new Error(`Failed to update savings balance: ${savingsError.message}`);
        }

        // B. Try to update total_deposited separately (so it doesn't block the balance)
        try {
          await supabase
            .from('members')
            .update({ total_deposited: totalDeposited })
            .eq('phone', item.phone);
        } catch (depositErr) {
          console.warn("Could not update total_deposited tracker, but balance saved.");
        }
      }

      // 6. Handle Referral Bonus (KES 5, Max 5 rewards)
      if (item.type.includes('Deposit') && referredBy && !referralPaid && totalDeposited >= 100) {
        await supabase.from('members').update({ referral_paid: true }).eq('phone', item.phone);

        const { data: refData } = await supabase
          .from('members')
          .select('savings_balance, referrals_rewarded_count')
          .eq('phone', referredBy)
          .single();

        if (refData) {
          const refCount = Number(refData.referrals_rewarded_count) || 0;

          if (refCount < 5) {
            const refCurrentSavings = Number(refData.savings_balance) || 0;
            await supabase.from('members').update({
              savings_balance: refCurrentSavings + 5,
              referrals_rewarded_count: refCount + 1
            }).eq('phone', referredBy);

            await supabase.from('ledger_items').insert({
              id: Date.now().toString(),
              phone: referredBy,
              type: 'Referral Bonus',
              amount: 5,
              date: new Date().toISOString().split('T')[0],
              status: 'COMPLETED',
              code: 'REF-' + Math.floor(1000 + Math.random() * 9000),
            });
          }
        }
      }

      await fetchQueue();
      if (activeAdminTab === 'members') await fetchMembers();
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

  const downloadLedgerCSV = (memberPhone: string, memberName: string) => {
    const memberLedger = queue.filter(i => i.phone === memberPhone);
    if (memberLedger.length === 0) {
      alert('No transactions found for this member.');
      return;
    }

    const headers = "ID,Type,Amount (KES),Date,Status,Code\n";
    const rows = memberLedger.map(i =>
      `"${i.id}","${i.type}",${i.amount},"${i.date}","${i.status}","${i.code}"`
    ).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `TibaPay_Ledger_${memberName.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSystemCSV = () => {
    if (queue.length === 0) { alert('No transactions to export.'); return; }
    const headers = "ID,Phone,Type,Amount (KES),Date,Status,Code\n";
    const body = queue.map(i =>
      `"${i.id}","${i.phone || ''}","${i.type}",${i.amount},"${i.date}","${i.status}","${i.code}"`
    ).join("\n");
    const blob = new Blob([headers + body], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `TibaPay_System_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const totalMemberSavings = members.reduce(
    (sum, m) => sum + (Math.round(Number(m.savings_balance)) || 0),
    0
  );
  const totalSystem = mainPool + totalMemberSavings;

  const recentCompleted = queue.filter(q => q.status === 'COMPLETED').slice(0, 25);

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
                Tiba<span className="text-amber-400">Pay</span> Treasurer
              </h1>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-500/20">
                Admin
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
          Exit
        </button>
      </div>

      {message && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold leading-relaxed">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-600 p-3 rounded-2xl text-slate-950 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Treasury Pool</p>
          <p className="text-sm font-black mt-1">KES {mainPool.toLocaleString()}</p>
          <p className="text-[9px] opacity-70 mt-0.5">Liquid assets</p>
        </div>
        <div className="bg-violet-600 p-3 rounded-2xl text-white shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Member Savings</p>
          <p className="text-sm font-black mt-1">KES {totalMemberSavings.toLocaleString()}</p>
          <p className="text-[9px] opacity-70 mt-0.5">{members.length} members</p>
        </div>
        <div className="bg-amber-600 p-3 rounded-2xl text-slate-950 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Pending Queue</p>
          <p className="text-sm font-black mt-1">{pendingOnly.length} Requests</p>
          <p className="text-[9px] opacity-70 mt-0.5">{syncing ? 'syncing…' : 'live'}</p>
        </div>
        <div className="bg-slate-700 p-3 rounded-2xl text-white shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total System</p>
          <p className="text-sm font-black mt-1">KES {totalSystem.toLocaleString()}</p>
          <p className="text-[9px] opacity-70 mt-0.5">Pool + Member</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
        {(['queue', 'members', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveAdminTab(tab)}
            className={`py-2 rounded-lg capitalize transition cursor-pointer ${
              activeAdminTab === tab
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeAdminTab === 'queue' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">Review Queue</h3>
            <div className="flex gap-3">
              <button
                onClick={downloadSystemCSV}
                className="text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                📥 System CSV
              </button>
              <button
                onClick={fetchQueue}
                className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer"
              >
                Refresh
              </button>
            </div>
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

          <div className="space-y-3 pt-1 max-h-[480px] overflow-y-auto pr-1">
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
                      <p className="text-[10px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800 italic uppercase font-mono">
                        "{(item.smsMessage || item.sms_message || '').slice(0, 10).toUpperCase()}"
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
      )}

      {activeAdminTab === 'members' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">Members ({members.length})</h3>
            <button
              onClick={fetchMembers}
              className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {members.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                No members found.
              </div>
            ) : (
              members.map((m) => (
                <div
                  key={m.phone}
                  className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{m.full_name || 'Unnamed'}</p>
                    <p className="text-[10px] text-slate-400">{m.phone}</p>
                    {m.account_status && m.account_status !== 'active' && (
                      <span className="text-[9px] font-bold text-rose-400 uppercase">
                        {m.account_status}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-emerald-400">
                      KES {Math.round(Number(m.savings_balance) || 0).toLocaleString()}
                    </p>
                    <button
                      onClick={() => downloadLedgerCSV(m.phone, m.full_name || m.phone)}
                      className="mt-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg text-[9px] transition cursor-pointer border border-slate-700"
                    >
                      📥 Ledger CSV
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeAdminTab === 'activity' && (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-white">Recent Activity</h3>
            <span className="text-[10px] text-slate-500">{recentCompleted.length} completed</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {recentCompleted.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                No completed transactions yet.
              </div>
            ) : (
              recentCompleted.map((item) => {
                const isCredit =
                  item.type.includes('Deposit') ||
                  item.type.includes('Repayment') ||
                  item.type.includes('Bonus') ||
                  item.type.includes('Sweep');
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex justify-between items-center text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{item.type}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.date} · {item.code} · {item.phone || '—'}
                      </p>
                    </div>
                    <p className={`font-black shrink-0 ${isCredit ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {isCredit ? '+' : '−'} KES {Number(item.amount).toLocaleString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}