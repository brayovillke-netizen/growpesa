'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { PushNotificationManager } from '@/components/PushNotificationManager';

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

// AUTOMATION: Extract the first 10 uppercase alphanumeric characters (M-Pesa Code)
const extractMpesaCode = (text: string) => {
  if (!text) return null;
  const match = text.match(/\b([A-Z0-9]{10})\b/);
  return match ? match[1] : null;
};

export default function AdminPage() {
  const [adminUser, setAdminUser] = useState<MemberUser | null>(null);
  const [mainPool, setMainPool] = useState<number>(0);
  const [queue, setQueue] = useState<LedgerItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('queue');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  
  // Privacy Toggle
  const [hideBalances, setHideBalances] = useState<boolean>(false);

  // Collapsible Queue State
  const [isQueueExpanded, setIsQueueExpanded] = useState<boolean>(false);

  const fetchQueue = useCallback(async () => {
    try {
      setSyncing(true);

      const { data: poolData, error: poolError } = await supabase
        .from('treasury_pool')
        .select('pool_balance')
        .eq('id', 1)
        .single();

      if (poolError) throw poolError;
      
      // ✅ DEEP COMPARE TO PREVENT FLICKER
      if (poolData) {
        const newPool = Math.round(Number(poolData.pool_balance));
        setMainPool(prev => prev === newPool ? prev : newPool);
      }

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

      // ✅ DEEP COMPARE TO PREVENT FLICKER
      setQueue(prev => JSON.stringify(prev) === JSON.stringify(mappedQueue) ? prev : mappedQueue);
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
      
      // ✅ DEEP COMPARE TO PREVENT FLICKER
      setMembers(prev => JSON.stringify(prev) === JSON.stringify(data || []) ? prev : (data || []));
    } catch (e: any) {
      console.error('Members fetch error:', e.message);
    }
  }, []);

  useEffect(() => {
    // ✅ FIXED CAPITALIZATION: growpesa_auth_user (lowercase 'g')
    const savedUser = localStorage.getItem('growpesa_auth_user');
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

      // PREVENT PARALLEL LOANS (Check if they already owe)
      if (item.type.includes('Loan Request') && item.phone) {
        const { data: memberHistory } = await supabase
          .from('ledger_items')
          .select('type, amount, status')
          .eq('phone', item.phone)
          .eq('status', 'COMPLETED');

        const borrowed = (memberHistory || []).filter(h => h.type.includes('Loan Request')).reduce((s, h) => s + Number(h.amount), 0);
        const repaid = (memberHistory || []).filter(h => h.type.includes('Loan Repayment')).reduce((s, h) => s + Number(h.amount), 0);

        if (borrowed > repaid) {
          throw new Error(`Member has an active loan of KES ${borrowed - repaid}. Must repay fully before borrowing again.`);
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
        // 5% flat fee + GWF goes to treasury. The rest leaves the pool.
        const loanFee = Math.round(amt * 0.05);
        const gwfFee = calculateGWF(amt);
        const netDisbursed = Math.max(0, amt - loanFee - gwfFee);
        
        if (mainPool - netDisbursed < mainPool * 0.15) {
          throw new Error(`Approval denied. This loan would drop the group's liquidity below the 15% floor.`);
        }
        
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
        const { error: savingsError } = await supabase
          .from('members')
          .update({ savings_balance: newMemberSavings })
          .eq('phone', item.phone);
        
        if (savingsError) throw new Error(`Failed to update savings balance: ${savingsError.message}`);

        try {
          await supabase
            .from('members')
            .update({ total_deposited: totalDeposited })
            .eq('phone', item.phone);
        } catch (depositErr) {
          console.warn("Could not update total_deposited tracker, but balance saved.");
        }
      }

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

      // TRIGGER PUSH NOTIFICATION TO MEMBER
      if (item.phone) {
        let pushTitle = '';
        let pushBody = '';
        
        if (item.type.includes('Deposit')) {
          pushTitle = 'Deposit Approved 🎉';
          pushBody = `KES ${amt.toLocaleString()} has been added to your savings.`;
        } else if (item.type.includes('Withdrawal')) {
          const gwf = calculateGWF(amt);
          const net = amt - gwf;
          pushTitle = 'Withdrawal Sent 💸';
          pushBody = `KES ${net.toLocaleString()} is on its way to your M-Pesa.`;
        } else if (item.type.includes('Loan Request')) {
          const fees = Math.round(amt * 0.05) + calculateGWF(amt);
          const net = amt - fees;
          pushTitle = 'Loan Approved 🏦';
          pushBody = `KES ${net.toLocaleString()} has been sent to your M-Pesa.`;
        }

        if (pushTitle) {
          try {
            await fetch('/api/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: item.phone, title: pushTitle, body: pushBody }),
            });
          } catch (err) {
            console.error('Failed to send push', err);
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

      // TRIGGER PUSH NOTIFICATION TO MEMBER
      if (item.phone) {
        try {
          await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              phone: item.phone, 
              title: 'Request Rejected ❌', 
              body: `Your ${item.type} request was not approved.` 
            }),
          });
        } catch (err) {
          console.error('Failed to send push', err);
        }
      }

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
    link.setAttribute('download', `GrowPesa_Ledger_${memberName.replace(/\s+/g, '_')}.csv`);
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
    link.setAttribute('download', `GrowPesa_System_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
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

  let totalDisbursed = 0;
  let totalRepaid = 0;

  queue.forEach(item => {
    if (item.status === 'COMPLETED') {
      if (item.type.includes('Loan Request')) {
        const amt = Math.round(Number(item.amount));
        const fees = Math.round(amt * 0.05) + calculateGWF(amt);
        totalDisbursed += (amt - fees);
      }
      if (item.type.includes('Loan Repayment')) {
        totalRepaid += Math.round(Number(item.amount));
      }
    }
  });

  const loanBookOutstanding = Math.max(0, totalDisbursed - totalRepaid);
  const availableCash = Math.max(0, mainPool - loanBookOutstanding);
  const totalSystem = mainPool + totalMemberSavings;

  const recentCompleted = queue.filter(q => q.status === 'COMPLETED').slice(0, 25);

  const formatMoney = (amount: number) => {
    return hideBalances ? 'KES ****' : `KES ${amount.toLocaleString()}`;
  };

  const getMemberDebt = (phone: string) => {
    let disbursed = 0;
    let repaid = 0;
    
    queue.forEach(item => {
      if (item.phone === phone && item.status === 'COMPLETED') {
        if (item.type.includes('Loan Request')) {
          const amt = Math.round(Number(item.amount));
          const fees = Math.round(amt * 0.05) + calculateGWF(amt);
          disbursed += (amt - fees);
        }
        if (item.type.includes('Loan Repayment')) {
          repaid += Math.round(Number(item.amount));
        }
      }
    });
    
    return Math.max(0, disbursed - repaid);
  };

  if (!adminUser) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4 font-sans pb-24">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 font-black text-slate-950 text-lg shadow-md shadow-amber-500/20">
            GR
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white">
                Grow<span className="text-amber-400">Pesa</span> Treasurer
              </h1>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400 border border-amber-500/20">
                Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">{adminUser.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideBalances(!hideBalances)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
            title={hideBalances ? "Reveal Balances" : "Hide Balances"}
          >
            {hideBalances ? '🙈' : '👁️'}
          </button>
          <button
            onClick={() => {
              // ✅ FIXED CAPITALIZATION: growpesa_auth_user (lowercase 'g')
              localStorage.removeItem('growpesa_auth_user');
              window.location.replace('/dashboard');
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[10px] transition cursor-pointer border border-slate-700"
          >
            Exit
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold leading-relaxed shadow-lg">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-600 p-3 rounded-2xl text-slate-950 shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Available Cash</p>
          <p className="text-sm font-black mt-1">{formatMoney(availableCash)}</p>
          <p className="text-[9px] opacity-70 mt-0.5">For Withdrawals</p>
        </div>
        <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Loan Book</p>
          <p className="text-sm font-black mt-1">{formatMoney(loanBookOutstanding)}</p>
          <p className="text-[9px] opacity-70 mt-0.5">Outstanding Loans</p>
        </div>
        <div className="bg-violet-600 p-3 rounded-2xl text-white shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Member Savings</p>
          <p className="text-sm font-black mt-1">{formatMoney(totalMemberSavings)}</p>
          <p className="text-[9px] opacity-70 mt-0.5">{members.length} members</p>
        </div>
        <div className="bg-slate-700 p-3 rounded-2xl text-white shadow-md">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total System</p>
          <p className="text-sm font-black mt-1">{formatMoney(totalSystem)}</p>
          <p className="text-[9px] opacity-70 mt-0.5">Assets + Liabilities</p>
        </div>
        <div className="bg-amber-600 p-3 rounded-2xl text-slate-950 shadow-md col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Total Treasury Pool (Cash + Loans)</p>
          <p className="text-sm font-black mt-1">{formatMoney(mainPool)}</p>
          <p className="text-[9px] opacity-70 mt-0.5">{pendingOnly.length} pending requests waiting</p>
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
          
          {/* HEADER WITH EXPAND/COLLAPSE TOGGLE */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsQueueExpanded(!isQueueExpanded)}>
              <h3 className="font-bold text-sm text-white">Review Queue {!isQueueExpanded && `(${pendingOnly.length})`}</h3>
              <span className="text-xs text-amber-400">
                {isQueueExpanded ? '▲' : '▼'}
              </span>
            </div>
            
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

          {/* IF COLLAPSED: Show summary button */}
          {!isQueueExpanded ? (
            <div className="py-6 flex flex-col items-center justify-center space-y-3 bg-slate-950/50 rounded-xl border border-slate-800">
              <span className="text-3xl">📋</span>
              <p className="text-[11px] font-medium text-slate-400 text-center px-4">
                You have <strong className="text-amber-400">{pendingOnly.length} pending requests</strong> waiting for review.
              </p>
              <button
                onClick={() => setIsQueueExpanded(true)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition mt-2"
              >
                Open Review Queue
              </button>
            </div>
          ) : (
            // IF EXPANDED: Show filters and items
            <>
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold text-center mt-2">
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

              <div className="space-y-4 pt-2 max-h-[520px] overflow-y-auto pr-1">
                {filteredQueue.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
                    No pending transactions for "{activeFilter}".
                  </div>
                ) : (
                  filteredQueue.map((item) => {
                    const awaitingPin = item.status === 'PENDING PIN';
                    const isDeposit = item.type.includes('Deposit');
                    const isWithdrawal = item.type.includes('Withdrawal');
                    const isLoan = item.type.includes('Loan Request');
                    
                    const amt = Math.round(Number(item.amount));
                    
                    const gwfFee = isWithdrawal ? calculateGWF(amt) : 0;
                    const netPayout = isWithdrawal ? amt - gwfFee : amt;
                    
                    const loanFees = Math.round(amt * 0.05) + calculateGWF(amt);
                    const netToSend = isLoan ? Math.max(0, amt - loanFees) : netPayout;

                    const smsText = item.smsMessage || item.sms_message || '';
                    const detectedCode = isDeposit ? extractMpesaCode(smsText) : null;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-3xl bg-slate-950 border p-4 space-y-3 shadow-xl relative overflow-hidden ${
                          isDeposit ? 'border-emerald-500/30' : 
                          isWithdrawal ? 'border-amber-500/30' : 
                          'border-blue-500/30'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isDeposit ? 'bg-emerald-500/20 text-emerald-300' : 
                              isWithdrawal ? 'bg-amber-500/20 text-amber-300' : 
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              {item.type}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">{item.date} • Ref: {item.code}</p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Phone Number</p>
                            <p className="text-sm font-black font-mono text-white tracking-widest bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              {item.phone || 'N/A'}
                            </p>
                          </div>
                        </div>

                        {isDeposit ? (
                          <div className="space-y-2 mt-2">
                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                              <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Pasted SMS</p>
                              <p className="text-xs text-slate-300 font-mono leading-relaxed break-words">
                                "{smsText || 'No message pasted'}"
                              </p>
                              {detectedCode && (
                                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center">
                                  <span className="text-[10px] text-emerald-400 font-bold">Auto-Extracted Code:</span>
                                  <span className="text-xs font-black text-white bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                                    {detectedCode}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between items-center bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                              <span className="text-[10px] text-emerald-400 font-bold uppercase">Amount to Credit</span>
                              <span className="text-xl font-black text-emerald-400">{formatMoney(amt)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mt-2">
                            <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                              <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">Requested Amount</p>
                                <p className="text-sm font-bold text-slate-400 line-through">{formatMoney(amt)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Amount to Send</p>
                                <p className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                  {formatMoney(netToSend)}
                                </p>
                              </div>
                            </div>
                            {isWithdrawal && (
                              <div className="text-[9px] text-slate-500 text-center bg-slate-900 py-1 rounded-lg">
                                Deduct <strong className="text-white">{formatMoney(amt)}</strong> from Member Savings. (GWF Fee: {formatMoney(gwfFee)})
                              </div>
                            )}
                            {isLoan && (
                              <div className="text-[9px] text-slate-500 text-center bg-slate-900 py-1 rounded-lg">
                                Send to M-Pesa. (Fees deducted: {formatMoney(loanFees)})
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={awaitingPin}
                            className={`py-2.5 font-black rounded-xl text-xs transition shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
                              isDeposit ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' :
                              isWithdrawal ? 'bg-amber-500 hover:bg-amber-400 text-slate-950' :
                              'bg-blue-500 hover:bg-blue-400 text-white'
                            }`}
                          >
                            {awaitingPin ? 'Awaiting PIN' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(item)}
                            className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs transition disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
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
              members.map((m) => {
                const debt = getMemberDebt(m.phone);
                return (
                  <div
                    key={m.phone}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{m.full_name || 'Unnamed'}</p>
                      <p className="text-[10px] text-slate-400">{m.phone}</p>
                      
                      {debt > 0 && (
                        <div className="mt-1">
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            Owes: {formatMoney(debt)}
                          </span>
                        </div>
                      )}

                      {m.account_status && m.account_status !== 'active' && (
                        <span className="block text-[9px] font-bold text-rose-400 uppercase mt-0.5">
                          {m.account_status}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-emerald-400">
                        {formatMoney(Math.round(Number(m.savings_balance) || 0))}
                      </p>
                      <button
                        onClick={() => downloadLedgerCSV(m.phone, m.full_name || m.phone)}
                        className="mt-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg text-[9px] transition cursor-pointer border border-slate-700"
                      >
                        📥 Ledger CSV
                      </button>
                    </div>
                  </div>
                );
              })
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
                      {isCredit ? '+' : '−'} {formatMoney(Number(item.amount))}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <PushNotificationManager userPhone={adminUser.phone} />
    </div>
  );
}