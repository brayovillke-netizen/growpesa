'use client';

import { useState, useEffect } from 'react';
import InstallPrompt from '@/components/InstallPrompt';

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

interface PackageTier {
  id: number;
  name: string;
  entry: number;
  dailyLimit: number;
  lockDays: number;
  groupCut: number;
  netSweep: number;
}

interface ActiveSubscription {
  tierId: number;
  accumulatedBalance: number;
  startDate: string;
  endDate: string;
  isLocked: boolean;
}

interface ActiveLoan {
  id: string;
  requestedAmount: number;
  fee: number;
  amountSent: number;
  termWeeks: number;
  interestRate: number;
  interestAmount: number;
  totalRepay: number;
  status: 'PENDING ADMIN APPROVAL' | 'DISBURSED' | 'APPROVED' | 'ACTIVE' | 'CLOSED';
  dueDate: string;
}

const PACKAGE_TIERS: PackageTier[] = [
  { id: 1, name: 'Tier 1 (Starter)', entry: 200, dailyLimit: 20, lockDays: 7, groupCut: 2, netSweep: 18 },
  { id: 2, name: 'Tier 2 (Bronze)', entry: 500, dailyLimit: 50, lockDays: 14, groupCut: 5, netSweep: 45 },
  { id: 3, name: 'Tier 3 (Silver)', entry: 1000, dailyLimit: 100, lockDays: 30, groupCut: 10, netSweep: 90 },
  { id: 4, name: 'Tier 4 (Gold)', entry: 2500, dailyLimit: 250, lockDays: 30, groupCut: 25, netSweep: 225 },
  { id: 5, name: 'Tier 5 (Platinum)', entry: 5000, dailyLimit: 500, lockDays: 30, groupCut: 50, netSweep: 450 },
  { id: 6, name: 'Tier 6 (Diamond)', entry: 10000, dailyLimit: 1000, lockDays: 60, groupCut: 100, netSweep: 900 },
  { id: 7, name: 'Tier 7 (VIP Vault)', entry: 20000, dailyLimit: 2000, lockDays: 90, groupCut: 200, netSweep: 1800 },
];

function calculateGWF(amount: number): number {
  if (amount < 50) return 0;
  if (amount <= 100) return 10;
  if (amount <= 500) return 25;
  if (amount <= 1000) return 30;
  if (amount <= 1500) return 30;
  if (amount <= 3000) return 40;
  if (amount <= 5000) return 45;
  if (amount <= 10000) return 65;
  if (amount <= 20000) return 80;
  if (amount <= 50000) return 100;
  if (amount <= 100000) return 125;
  const percentageFee = Math.ceil(amount * 0.0025);
  return Math.max(percentageFee, 125);
}

export default function DashboardPage() {
  const [user, setUser] = useState<MemberUser | null>(null);
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'withdraw' | 'loans'>('overview');
  const [mainPool, setMainPool] = useState<number>(6000);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [activeLoan, setActiveLoan] = useState<ActiveLoan | null>(null);
  
  const [loanAmountInput, setLoanAmountInput] = useState<string>('2000');
  const [loanTermWeeks, setLoanTermWeeks] = useState<number>(4);

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [depositAmountInput, setDepositAmountInput] = useState<string>('1000');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [withdrawAmountInput, setWithdrawAmountInput] = useState<string>('1000');
  
  const [activeSmsInputId, setActiveSmsInputId] = useState<string | null>(null);
  const [pastedSmsText, setPastedSmsText] = useState<string>('');
  const [manualSmsText, setManualSmsText] = useState<string>('');
  const [showManualDeposit, setShowManualDeposit] = useState(false);

  const [ledger, setLedger] = useState<LedgerItem[]>([
    {
      id: '1',
      type: 'Deposit',
      amount: 1000,
      date: '2026-10-27',
      status: 'COMPLETED',
      code: 'QHK89234X',
      phone: '0712345678',
    },
  ]);

  const loadSharedData = () => {
    const savedLedger = localStorage.getItem('tibapay_ledger');
    if (savedLedger) {
      try { setLedger(JSON.parse(savedLedger)); } catch (e) {}
    }
    const savedPool = localStorage.getItem('tibapay_pool');
    if (savedPool) {
      setMainPool(Number(savedPool));
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const savedSubs = localStorage.getItem('tibapay_active_subs');
    if (savedSubs) {
      try {
        const parsedSubs: ActiveSubscription[] = JSON.parse(savedSubs);
        const activeOnly = parsedSubs.filter((sub) => todayStr < sub.endDate);
        setActiveSubscriptions(activeOnly);
        localStorage.setItem('tibapay_active_subs', JSON.stringify(activeOnly));
      } catch (e) {}
    } else {
      const defaultSub: ActiveSubscription = {
        tierId: 3,
        accumulatedBalance: 300,
        startDate: '2026-10-28',
        endDate: '2026-11-27',
        isLocked: true,
      };
      setActiveSubscriptions([defaultSub]);
    }

    const savedLoan = localStorage.getItem('tibapay_active_loan');
    if (savedLoan) {
      try {
        const parsedLoan: ActiveLoan = JSON.parse(savedLoan);
        if (parsedLoan.status !== 'CLOSED') {
          setActiveLoan(parsedLoan);
        } else {
          setActiveLoan(null);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('tibapay_auth_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.role === 'admin') {
          window.location.href = '/admin';
          return;
        }
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('tibapay_auth_user');
      }
    }

    loadSharedData();

    const handleStorageChange = () => loadSharedData();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('tibapay_sync', handleStorageChange);

    const interval = setInterval(loadSharedData, 2000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('tibapay_sync', handleStorageChange);
    };
  }, []);

  const saveSubs = (subs: ActiveSubscription[]) => {
    setActiveSubscriptions(subs);
    localStorage.setItem('tibapay_active_subs', JSON.stringify(subs));
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const updateMainPool = (newPoolAmount: number) => {
    setMainPool(newPoolAmount);
    localStorage.setItem('tibapay_pool', String(newPoolAmount));
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const saveLoanState = (loan: ActiveLoan | null) => {
    setActiveLoan(loan);
    if (loan && loan.status !== 'CLOSED') {
      localStorage.setItem('tibapay_active_loan', JSON.stringify(loan));
    } else {
      localStorage.removeItem('tibapay_active_loan');
    }
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const saveLedger = (newLedger: LedgerItem[]) => {
    setLedger(newLedger);
    localStorage.setItem('tibapay_ledger', JSON.stringify(newLedger));
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanPhone = loginPhone.trim();
    const cleanPin = loginPin.trim();

    if (cleanPhone.length < 10) {
      setAuthError('Please enter a valid 10-digit M-Pesa phone number.');
      return;
    }

    if (cleanPin.length < 4) {
      setAuthError('Please enter your 4-digit security PIN.');
      return;
    }

    const isTreasurer = (cleanPhone === '0700413388' || cleanPhone === '254700413388') && cleanPin === '6200';

    if ((cleanPhone === '0700413388' || cleanPhone === '254700413388') && cleanPin !== '6200') {
      setAuthError('Incorrect PIN for Treasurer account.');
      return;
    }

    const loggedInUser: MemberUser = {
      phone: cleanPhone,
      name: isTreasurer ? 'Treasurer (0700413388)' : `Member (${cleanPhone.slice(-4)})`,
      role: isTreasurer ? 'admin' : 'member',
    };

    localStorage.setItem('tibapay_auth_user', JSON.stringify(loggedInUser));

    if (isTreasurer) {
      window.location.href = '/admin';
      return;
    }

    setUser(loggedInUser);
    setPhoneInput(cleanPhone);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('tibapay_auth_user');
  };

  const handleSimulateAccrual = (tierId: number) => {
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;

    const updated = activeSubscriptions.map((sub) => {
      if (sub.tierId === tierId) {
        return { ...sub, accumulatedBalance: sub.accumulatedBalance + tier.dailyLimit };
      }
      return sub;
    });

    saveSubs(updated);
    setMessage(`📈 Daily accrual added! +KES ${tier.dailyLimit} gross daily added to ${tier.name}.`);
  };

  const handleSweepSub = (tierId: number) => {
    const sub = activeSubscriptions.find((s) => s.tierId === tierId);
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!sub || !tier) return;

    if (sub.accumulatedBalance <= 0) {
      setMessage('⚠️ No accumulated balance to sweep.');
      return;
    }

    const totalGroupCut = sub.accumulatedBalance * 0.1;
    const totalNetSweep = sub.accumulatedBalance * 0.9;

    const newPool = mainPool + totalNetSweep;
    updateMainPool(newPool);

    const todayStr = new Date().toISOString().split('T')[0];
    const isExpired = todayStr >= sub.endDate;

    let updatedSubs;
    if (isExpired) {
      updatedSubs = activeSubscriptions.filter((s) => s.tierId !== tierId);
    } else {
      updatedSubs = activeSubscriptions.map((s) => (s.tierId === tierId ? { ...s, accumulatedBalance: 0 } : s));
    }
    saveSubs(updatedSubs);

    const sweepItem: LedgerItem = {
      id: Date.now().toString(),
      type: `Tier Sweep (${tier.name})`,
      amount: totalNetSweep,
      date: todayStr,
      status: 'COMPLETED',
      code: 'SWP-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };

    saveLedger([sweepItem, ...ledger]);
    setMessage(`✅ Successfully swept KES ${totalNetSweep.toLocaleString()} to Main Pool (10% group fee of KES ${totalGroupCut} deducted).${isExpired ? ' Package period expired and returned to available tiers.' : ''}`);
  };

  const handleSubscribeTier = (tierId: number) => {
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;

    if (mainPool < tier.entry) {
      setMessage(`❌ Insufficient funds! You need KES ${tier.entry.toLocaleString()} in your Main Pool to join ${tier.name}. Current pool: KES ${mainPool.toLocaleString()}`);
      return;
    }

    const newPool = mainPool - tier.entry;
    updateMainPool(newPool);

    const startDate = new Date().toISOString().split('T')[0];
    const endDateObj = new Date();
    endDateObj.setDate(endDateObj.getDate() + tier.lockDays);
    const endDate = endDateObj.toISOString().split('T')[0];

    const newSub: ActiveSubscription = {
      tierId: tier.id,
      accumulatedBalance: 0,
      startDate,
      endDate,
      isLocked: true,
    };

    saveSubs([...activeSubscriptions, newSub]);

    const entryItem: LedgerItem = {
      id: Date.now().toString(),
      type: `Package Entry (${tier.name})`,
      amount: tier.entry,
      date: startDate,
      status: 'COMPLETED',
      code: 'ENT-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };

    saveLedger([entryItem, ...ledger]);
    setMessage(`✅ Successfully subscribed to ${tier.name}! Active until ${endDate}. KES ${tier.entry.toLocaleString()} deducted.`);
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setMessage('⚠️ Please enter a valid deposit amount.');
      return;
    }

    const targetPhone = phoneInput.trim() || user?.phone || '0712345678';
    if (targetPhone.length < 10) {
      setMessage('⚠️ Please enter a valid M-Pesa phone number.');
      return;
    }

    setLoading(true);
    setMessage(`📱 STK Push sent to ${targetPhone}. Enter your M-Pesa PIN...`);

    const txnId = Date.now().toString();
    const tempCode = 'STK-' + Math.floor(1000 + Math.random() * 9000);

    const newLedgerItem: LedgerItem = {
      id: txnId,
      type: 'Deposit (STK)',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: tempCode,
      phone: targetPhone,
    };

    const newLedger = [newLedgerItem, ...ledger];
    saveLedger(newLedger);
    setLoading(false);
  };

  const handleDirectSmsSubmit = async () => {
    const amt = parseFloat(depositAmountInput);
    if (!manualSmsText || manualSmsText.length < 10) {
      setMessage('⚠️ Please paste a valid M-Pesa SMS confirmation.');
      return;
    }

    const codeMatch = manualSmsText.match(/\b([A-Z0-9]{10})\b/);
    const extractedCode = codeMatch ? codeMatch[1] : 'MPESA-' + Math.floor(1000 + Math.random() * 9000);

    const txnId = Date.now().toString();
    const manualItem: LedgerItem = {
      id: txnId,
      type: 'Deposit (Manual)',
      amount: isNaN(amt) ? 1000 : amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: extractedCode,
      smsMessage: manualSmsText,
      phone: phoneInput || user?.phone,
    };

    const newLedger = [manualItem, ...ledger];
    saveLedger(newLedger);

    setManualSmsText('');
    setShowManualDeposit(false);
    setMessage(`✅ Confirmation SMS submitted! Sent to Treasurer for review.`);
  };

  const handleSubmitSmsForApproval = async (txnId: string) => {
    if (!pastedSmsText || pastedSmsText.length < 10) {
      setMessage('⚠️ Please paste a valid M-Pesa confirmation message.');
      return;
    }

    const codeMatch = pastedSmsText.match(/\b([A-Z0-9]{10})\b/);
    const extractedCode = codeMatch ? codeMatch[1] : 'MPESA-' + Math.floor(1000 + Math.random() * 9000);

    const updated = ledger.map((item) => {
      if (item.id === txnId) {
        return {
          ...item,
          status: 'PENDING ADMIN APPROVAL',
          code: extractedCode,
          smsMessage: pastedSmsText,
        };
      }
      return item;
    });

    saveLedger(updated);
    setPastedSmsText('');
    setActiveSmsInputId(null);
    setMessage(`✅ M-Pesa message submitted! Sent to Treasurer queue for review.`);
  };

  const handleWithdraw = async () => {
    const grossAmt = parseFloat(withdrawAmountInput);
    if (isNaN(grossAmt) || grossAmt < 50) {
      setMessage('⚠️ Minimum withdrawal amount is KES 50.');
      return;
    }

    if (grossAmt > mainPool) {
      setMessage(`⚠️ Insufficient funds! You only have KES ${mainPool.toLocaleString()} in your Main Pool.`);
      return;
    }

    const gwfFee = calculateGWF(grossAmt);
    const netPayout = grossAmt - gwfFee;

    const txnId = Date.now().toString();
    const reqCode = 'WDR-' + Math.floor(1000 + Math.random() * 9000);

    const withdrawalItem: LedgerItem = {
      id: txnId,
      type: `Withdrawal (Net: KES ${netPayout.toLocaleString()})`,
      amount: grossAmt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: reqCode,
      phone: user?.phone,
    };

    const updated: LedgerItem[] = [withdrawalItem, ...ledger];
    saveLedger(updated);

    setMessage(`🕒 Withdrawal of KES ${grossAmt.toLocaleString()} requested (GWF Fee: KES ${gwfFee}, Net M-Pesa: KES ${netPayout.toLocaleString()}). Submitted to Treasurer.`);
  };

  // Loan Calculation Engine
  const maxBorrowingLimit = Math.floor(mainPool * 0.4);
  const parsedLoanAmt = parseFloat(loanAmountInput) || 0;
  const loanFee = parsedLoanAmt * 0.05;
  const amountSentToMpesa = parsedLoanAmt - loanFee;
  const loanInterestRate = loanTermWeeks === 1 ? 0.03 : loanTermWeeks === 2 ? 0.05 : 0.10;
  const loanInterestAmount = parsedLoanAmt * loanInterestRate;
  const totalLoanRepay = parsedLoanAmt + loanInterestAmount;

  const handleApplyLoan = () => {
    if (activeLoan && activeLoan.status !== 'CLOSED') {
      setMessage(`❌ Loan Denied: You must fully repay your active loan (${activeLoan.id}) before you can borrow again.`);
      return;
    }

    if (parsedLoanAmt <= 0) {
      setMessage('⚠️ Please enter a valid loan amount.');
      return;
    }

    if (parsedLoanAmt > maxBorrowingLimit) {
      setMessage(`⚠️ Requested amount exceeds your dynamic borrowing limit of KES ${maxBorrowingLimit.toLocaleString()} (40% of savings).`);
      return;
    }

    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + loanTermWeeks * 7);
    const dueDateStr = dueDateObj.toISOString().split('T')[0];

    const loanTxnId = 'LOAN-' + Math.floor(1000 + Math.random() * 9000);

    const newLoan: ActiveLoan = {
      id: loanTxnId,
      requestedAmount: parsedLoanAmt,
      fee: loanFee,
      amountSent: amountSentToMpesa,
      termWeeks: loanTermWeeks,
      interestRate: loanInterestRate,
      interestAmount: loanInterestAmount,
      totalRepay: totalLoanRepay,
      status: 'PENDING ADMIN APPROVAL',
      dueDate: dueDateStr,
    };

    saveLoanState(newLoan);

    const loanItem: LedgerItem = {
      id: Date.now().toString(),
      type: `Loan Request (${loanTermWeeks}W)`,
      amount: parsedLoanAmt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: loanTxnId,
      phone: user?.phone,
    };

    saveLedger([loanItem, ...ledger]);
    setMessage(`🕒 Loan request of KES ${parsedLoanAmt.toLocaleString()} submitted to Treasurer queue for review & disbursement (24 hr review).`);
  };

  const handleRepayLoan = () => {
    if (!activeLoan) return;

    if (mainPool < activeLoan.totalRepay) {
      setMessage(`⚠️ Insufficient funds in Main Pool to repay loan. You need KES ${activeLoan.totalRepay.toLocaleString()}. Please deposit first.`);
      return;
    }

    const newPool = mainPool - activeLoan.totalRepay;
    updateMainPool(newPool);

    const repayItem: LedgerItem = {
      id: Date.now().toString(),
      type: `Loan Repayment`,
      amount: activeLoan.totalRepay,
      date: new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      code: 'REP-' + Math.floor(1000 + Math.random() * 9000),
      phone: user?.phone,
    };

    saveLedger([repayItem, ...ledger]);
    
    const closedLoan: ActiveLoan = { ...activeLoan, status: 'CLOSED' };
    saveLoanState(closedLoan);
    setActiveLoan(null);

    setMessage(`🎉 Loan fully repaid! KES ${activeLoan.totalRepay.toLocaleString()} deducted from Main Pool. You are now eligible to borrow again.`);
  };

  const parsedWithdrawAmt = parseFloat(withdrawAmountInput) || 0;
  const currentGWFFee = calculateGWF(parsedWithdrawAmt);
  const currentNetPayout = Math.max(0, parsedWithdrawAmt - currentGWFFee);

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center p-6 max-w-md mx-auto font-sans">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 font-black text-slate-950 text-2xl shadow-lg shadow-emerald-500/20">
              TP
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Tiba<span className="text-emerald-400">Pay</span> Vault
            </h1>
            <p className="text-xs text-slate-400">Secure Community Treasury & Savings Portal</p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
              <input
                type="text"
                value={loginPhone}
                onChange={(e) => setLoginPhone(e.target.value)}
                placeholder="0712XXXXXX"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security PIN (4 Digits)</label>
              <input
                type="password"
                maxLength={4}
                value={loginPin}
                onChange={(e) => setLoginPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 tracking-widest text-center text-lg"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:bg-emerald-400 transition cursor-pointer mt-2"
            >
              🔒 Authenticate & Unlock Portal
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-500">
            Protected by end-to-end Treasury encryption and M-Pesa token gate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4 font-sans pb-24">
      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950 text-lg shadow-md shadow-emerald-500/20">
            TP
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-bold tracking-tight text-white">
                Tiba<span className="text-emerald-400">Pay</span>
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
                Member
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[150px]">{user.name}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[10px] transition cursor-pointer border border-slate-700"
        >
          Sign Out
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold animate-fadeIn leading-relaxed">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold">
        {(['overview', 'packages', 'withdraw', 'loans'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setMessage(null); }}
            className={`py-2.5 rounded-xl capitalize transition cursor-pointer ${
              activeTab === tab
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-600 p-3 rounded-2xl text-slate-950 shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Main Pool</p>
              <p className="text-sm font-black mt-1">KES {mainPool.toLocaleString()}</p>
            </div>
            <div className="bg-sky-600 p-3 rounded-2xl text-white shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Active Subs</p>
              <p className="text-sm font-black mt-1">{activeSubscriptions.length} Tiers</p>
            </div>
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Loan Status</p>
              <p className="text-sm font-black mt-1">{activeLoan ? activeLoan.status : 'No Loan'}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">Weekly Contribution (Deposit)</h3>
              <button
                onClick={() => setShowManualDeposit(!showManualDeposit)}
                className="text-[10px] text-emerald-400 font-bold underline cursor-pointer"
              >
                {showManualDeposit ? 'Use STK Push' : 'Paste SMS Directly'}
              </button>
            </div>

            {!showManualDeposit ? (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                    placeholder="0712345678"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount (KES)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">KES</span>
                    <input
                      type="number"
                      value={depositAmountInput}
                      onChange={(e) => setDepositAmountInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <button
                  onClick={handleDeposit}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-md hover:bg-emerald-400 transition cursor-pointer disabled:opacity-50 mt-2"
                >
                  {loading ? 'Awaiting M-Pesa confirmation...' : '📱 Trigger M-Pesa STK Push'}
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-slate-400">
                  Paid manually? Paste your M-Pesa confirmation SMS directly below for Treasurer verification:
                </p>
                <textarea
                  value={manualSmsText}
                  onChange={(e) => setManualSmsText(e.target.value)}
                  placeholder="Paste full M-Pesa SMS here (e.g. QHK89234X Confirmed. Ksh1,000 sent to...)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 h-20 resize-none"
                />
                <button
                  onClick={handleDirectSmsSubmit}
                  className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs shadow-md hover:bg-emerald-400 transition cursor-pointer"
                >
                  📋 Submit Confirmation to Treasurer Queue
                </button>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3 shadow-md">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">My Cash In / Out Activity</span>
              <span className="text-slate-500">Live Ledger ({ledger.length})</span>
            </div>

            <div className="space-y-2 text-xs max-h-72 overflow-y-auto pr-1">
              {ledger.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{item.type}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.date} • {item.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          item.type.includes('Deposit') || item.type.includes('Sweep') || item.type.includes('Disbursement')
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {item.type.includes('Deposit') || item.type.includes('Sweep') || item.type.includes('Disbursement') ? '+' : '-'}KES {item.amount.toLocaleString()}
                      </p>
                      <p
                        className={`text-[10px] ${
                          item.status === 'COMPLETED' || item.status === 'DISBURSED' || item.status === 'APPROVED'
                            ? 'text-emerald-500 font-bold'
                            : item.status === 'PENDING ADMIN APPROVAL'
                            ? 'text-sky-400 font-semibold'
                            : item.status === 'REJECTED' || item.status === 'FAILED'
                            ? 'text-rose-400 font-bold'
                            : 'text-amber-400 animate-pulse'
                        }`}
                      >
                        {item.status}
                      </p>
                    </div>
                  </div>

                  {item.status.includes('TIMEOUT') && activeSmsInputId !== item.id && (
                    <button
                      onClick={() => setActiveSmsInputId(item.id)}
                      className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      📋 Paste M-Pesa SMS for Admin Approval
                    </button>
                  )}

                  {activeSmsInputId === item.id && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={pastedSmsText}
                        onChange={(e) => setPastedSmsText(e.target.value)}
                        placeholder="Paste full M-Pesa text here (e.g. QHK89234X Confirmed. Ksh1,000 received...)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500 h-16 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSubmitSmsForApproval(item.id)}
                          className="flex-1 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Submit to Treasurer
                        </button>
                        <button
                          onClick={() => setActiveSmsInputId(null)}
                          className="px-3 py-1.5 bg-slate-800 text-slate-400 font-bold rounded-lg text-[10px] transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PACKAGES TAB */}
      {activeTab === 'packages' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider px-1">
              Active Subscriptions ({activeSubscriptions.length})
            </h3>

            {activeSubscriptions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
                No active package subscriptions. Select a tier below to start saving.
              </div>
            ) : (
              activeSubscriptions.map((sub) => {
                const tier = PACKAGE_TIERS.find((t) => t.id === sub.tierId);
                if (!tier) return null;
                const todayStr = new Date().toISOString().split('T')[0];
                const isExpired = todayStr >= sub.endDate;

                return (
                  <div key={sub.tierId} className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 p-4 space-y-3 shadow-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{tier.name}</span>
                        <h3 className="font-black text-sm text-white">Expires: {sub.endDate}</h3>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl ${isExpired ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                        {isExpired ? 'Period Over ⚠️' : 'Active ⚡'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Gross Daily Addition</p>
                        <p className="text-xs font-black text-emerald-400 mt-0.5">+KES {tier.dailyLimit} Daily</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Accumulated Balance</p>
                        <p className="text-xs font-black text-white mt-0.5">KES {sub.accumulatedBalance.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSimulateAccrual(sub.tierId)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-[10px] transition cursor-pointer border border-slate-700"
                      >
                        + Simulate Daily Add (+{tier.dailyLimit})
                      </button>

                      <button
                        onClick={() => handleSweepSub(sub.tierId)}
                        disabled={sub.accumulatedBalance <= 0}
                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[10px] transition cursor-pointer disabled:opacity-50 shadow-md"
                      >
                        ⚡ Sweep to Main Pool
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <h3 className="font-bold text-sm text-white">Subscribe to Additional Tiers</h3>
            <p className="text-[11px] text-slate-400">Join multiple tiers. Accumulated funds pile up and can be swept to your Main Pool anytime.</p>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {PACKAGE_TIERS.map((tier) => {
                const isSubscribed = activeSubscriptions.some((s) => s.tierId === tier.id);
                const hasEnough = mainPool >= tier.entry;
                return (
                  <div
                    key={tier.id}
                    className={`p-3.5 rounded-2xl border transition flex justify-between items-center ${
                      isSubscribed
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs text-white">{tier.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Entry: <strong className={hasEnough ? 'text-emerald-400' : 'text-rose-400'}>KES {tier.entry.toLocaleString()}</strong> • Period: {tier.lockDays} Days
                      </p>
                      <p className="text-[10px] font-bold text-emerald-400 mt-1">
                        Gross Daily Addition: +KES {tier.dailyLimit}
                      </p>
                    </div>

                    <div>
                      {isSubscribed ? (
                        <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg">
                          Subscribed ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSubscribeTier(tier.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-[10px] transition cursor-pointer shadow"
                        >
                          Join Tier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW TAB */}
      {activeTab === 'withdraw' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
            <h3 className="font-bold text-sm text-white">Graduated Withdrawal (GWF v6)</h3>
            <p className="text-xs text-slate-400">
              Available Pool Balance: <strong className="text-emerald-400">KES {mainPool.toLocaleString()}</strong>
            </p>

            <div className="space-y-1.5 pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Withdrawal Amount (Min KSh 50)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">KES</span>
                <input
                  type="number"
                  value={withdrawAmountInput}
                  onChange={(e) => setWithdrawAmountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  placeholder="Enter amount"
                />
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Gross Withdrawal:</span>
                <span className="font-bold text-white">KES {parsedWithdrawAmt.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400">GWF Fee Deduction:</span>
                <span className="font-bold text-rose-400">-KES {currentGWFFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                <span className="font-bold text-emerald-400">Net to M-Pesa:</span>
                <span className="text-sm font-black text-emerald-400">KES {currentNetPayout.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={mainPool <= 0 || parsedWithdrawAmt < 50}
              className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition cursor-pointer disabled:opacity-50 shadow-md mt-2"
            >
              Request M-Pesa Payout (24 Hr Review)
            </button>
          </div>
        </div>
      )}

      {/* LOANS TAB */}
      {activeTab === 'loans' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">TibaPay Loan Engine</h3>
              <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-xl border border-sky-500/20">
                Max Limit: KES {maxBorrowingLimit.toLocaleString()}
              </span>
            </div>

            {activeLoan ? (
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Loan Reference</p>
                    <p className="font-black text-sm text-white">{activeLoan.id}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl ${activeLoan.status === 'PENDING ADMIN APPROVAL' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                    {activeLoan.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800 text-xs">
                  <div>
                    <p className="text-[9px] text-slate-400">Principal Requested</p>
                    <p className="font-bold text-white">KES {activeLoan.requestedAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Total Due / Repay</p>
                    <p className="font-black text-amber-400">KES {activeLoan.totalRepay.toLocaleString()}</p>
                  </div>
                </div>

                {activeLoan.status === 'PENDING ADMIN APPROVAL' ? (
                  <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300 text-center font-medium">
                    ⏳ Your loan request is awaiting Treasurer approval and M-Pesa disbursement (24 hr review).
                  </div>
                ) : (
                  <button
                    onClick={handleRepayLoan}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md"
                  >
                    ⚡ Repay Full Loan Now (KES {activeLoan.totalRepay.toLocaleString()})
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  You are eligible to borrow up to 40% of your Main Pool savings (<strong className="text-white">KES {mainPool.toLocaleString()}</strong>). All loans require Treasurer approval and 24-hour M-Pesa disbursement.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loan Amount (KES)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700">KES</span>
                    <input
                      type="number"
                      value={loanAmountInput}
                      onChange={(e) => setLoanAmountInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repayment Term</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { weeks: 1, rate: '3%' },
                      { weeks: 2, rate: '5%' },
                      { weeks: 4, rate: '10%' },
                    ].map((term) => (
                      <button
                        key={term.weeks}
                        onClick={() => setLoanTermWeeks(term.weeks)}
                        className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          loanTermWeeks === term.weeks
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {term.weeks} Week{term.weeks > 1 ? 's' : ''} ({term.rate})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Requested Loan:</span>
                    <span className="font-bold text-white">KES {parsedLoanAmt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-400">Loan Fee (5% upfront):</span>
                    <span className="font-bold text-rose-400">-KES {loanFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-400">Amount Sent to M-Pesa:</span>
                    <span className="font-bold text-emerald-400">KES {amountSentToMpesa.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interest ({loanTermWeeks} week @ {loanTermWeeks === 1 ? '3%' : loanTermWeeks === 2 ? '5%': '10%'}):</span>
                    <span className="font-bold text-white">+KES {loanInterestAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                    <span className="font-bold text-amber-400">Total Amount to Repay:</span>
                    <span className="text-sm font-black text-amber-400">KES {totalLoanRepay.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={handleApplyLoan}
                  disabled={parsedLoanAmt <= 0 || parsedLoanAmt > maxBorrowingLimit}
                  className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition cursor-pointer disabled:opacity-50 shadow-md mt-2"
                >
                  Submit Loan Request for Admin Review (24 Hr)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <InstallPrompt />
    </div>
  );
}