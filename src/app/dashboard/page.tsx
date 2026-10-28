'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import InstallPrompt from '@/components/InstallPrompt';
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
  joined_at?: string;
  account_status?: string;
  loan_limit?: number;
  referrals_rewarded_count?: number;
  referral_code?: string;
}

interface PackageTier {
  id: number;
  name: string;
  entry: number;
  dailyLimit: number;
  lockDays: number;
  groupCut: number;
  netSweep: number;
  icon: string;
  sizeClass: string;
  totalPayout: number;
  roi: number;
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
  amountPaid: number;
  status: 'PENDING ADMIN APPROVAL' | 'DISBURSED' | 'APPROVED' | 'ACTIVE' | 'OVERDUE' | 'CLOSED' | 'REJECTED';
  dueDate: string;
  phone?: string;
}

const PACKAGE_TIERS: PackageTier[] = [
  { id: 1, name: 'Bronze', entry: 200, dailyLimit: 20, lockDays: 12, groupCut: 2, netSweep: 18, totalPayout: 240, roi: 40, icon: '🥉', sizeClass: 'text-3xl' },
  { id: 2, name: 'Silver', entry: 500, dailyLimit: 45, lockDays: 13, groupCut: 4.5, netSweep: 40.5, totalPayout: 585, roi: 85, icon: '🥈', sizeClass: 'text-4xl' },
  { id: 3, name: 'Gold', entry: 1000, dailyLimit: 70, lockDays: 16, groupCut: 7, netSweep: 63, totalPayout: 1120, roi: 120, icon: '🥇', sizeClass: 'text-5xl' },
  { id: 4, name: 'Platinum', entry: 2500, dailyLimit: 150, lockDays: 18, groupCut: 15, netSweep: 135, totalPayout: 2700, roi: 200, icon: '💠', sizeClass: 'text-6xl' },
  { id: 5, name: 'Diamond', entry: 5000, dailyLimit: 200, lockDays: 28, groupCut: 20, netSweep: 180, totalPayout: 5600, roi: 600, icon: '💎', sizeClass: 'text-7xl' },
  { id: 6, name: 'Black Diamond', entry: 10000, dailyLimit: 700, lockDays: 15, groupCut: 70, netSweep: 630, totalPayout: 10500, roi: 500, icon: '👑', sizeClass: 'text-8xl' },
];

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

function generateReferralCode(name: string) {
  const namePart = name.trim().split(' ')[0].slice(-3).toUpperCase().padEnd(3, 'X');
  const numPart = Math.floor(100 + Math.random() * 900);
  return `${numPart}-${namePart}`;
}

export default function DashboardPage() {
  const [user, setUser] = useState<MemberUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Auth Form States
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regReferral, setRegReferral] = useState('');
  const [regIsAdult, setRegIsAdult] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // PIN Visibility States
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [showRegPin, setShowRegPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  // Screen Lock States
  const [isLocked, setIsLocked] = useState(false);
  const [lockPin, setLockPin] = useState('');
  const lastActivityRef = useRef(Date.now());

  // App States
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'withdraw' | 'loans'>('overview');
  const [mainPool, setMainPool] = useState<number>(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [activeLoan, setActiveLoan] = useState<ActiveLoan | null>(null);
  
  const [loanAmountInput, setLoanAmountInput] = useState('1000');
  const [loanTermWeeks, setLoanTermWeeks] = useState(4);
  
  // Repayment States
  const [repayPhoneInput, setRepayPhoneInput] = useState('');
  const [repayAmountInput, setRepayAmountInput] = useState('');
  const [repayMode, setRepayMode] = useState<'stk' | 'sms'>('stk');
  const [repaySmsText, setRepaySmsText] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [depositAmountInput, setDepositAmountInput] = useState('1000');
  const [phoneInput, setPhoneInput] = useState('');
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('1000');
  
  const [activeSmsInputId, setActiveSmsInputId] = useState<string | null>(null);
  const [pastedSmsText, setPastedSmsText] = useState('');
  const [manualSmsText, setManualSmsText] = useState('');
  const [showManualDeposit, setShowManualDeposit] = useState(false);

  const [ledger, setLedger] = useState<LedgerItem[]>([]);

  const loanRef = useRef<ActiveLoan | null>(null);
  useEffect(() => {
    loanRef.current = activeLoan;
  }, [activeLoan]);

  // Check URL for referral code on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setRegReferral(ref);
      setAuthMode('signup');
    }
  }, []);

  // Inactivity Lock Timer
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (!isLocked && Date.now() - lastActivityRef.current > 5 * 60 * 1000) {
        setIsLocked(true);
      }
    }, 10000);

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('touchstart', resetActivity);
    window.addEventListener('keydown', resetActivity);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      window.removeEventListener('keydown', resetActivity);
    };
  }, [user, isLocked]);

  useEffect(() => {
    if (user) setRepayPhoneInput(user.phone);
  }, [user]);

  useEffect(() => {
    if (activeLoan && activeLoan.status === 'ACTIVE') {
      const remaining = Math.round(activeLoan.totalRepay - activeLoan.amountPaid);
      setRepayAmountInput(remaining.toString());
    }
  }, [activeLoan]);

  const loadLocal = (u: MemberUser) => {
    const savedLedger = localStorage.getItem(`tibapay_ledger_${u.phone}`);
    if (savedLedger) {
      try { setLedger(JSON.parse(savedLedger)); } catch {}
    }
    const savedSavings = localStorage.getItem(`tibapay_savings_${u.phone}`);
    if (savedSavings) setMainPool(Math.round(Number(savedSavings)) || 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const savedSubs = localStorage.getItem(`tibapay_subs_${u.phone}`);
    if (savedSubs) {
      try {
        const parsed: ActiveSubscription[] = JSON.parse(savedSubs);
        setActiveSubscriptions(parsed.filter((s) => todayStr < s.endDate));
      } catch {}
    }

    const savedLoan = localStorage.getItem(`tibapay_loan_${u.phone}`);
    if (savedLoan) {
      try {
        const parsed: ActiveLoan = JSON.parse(savedLoan);
        if (parsed.status !== 'CLOSED' && parsed.status !== 'REJECTED') {
          setActiveLoan(parsed);
        }
      } catch {}
    }
  };

  const submitToServerQueue = async (item: LedgerItem) => {
    try {
      const { error } = await supabase.from('ledger_items').upsert({
        id: String(item.id),
        phone: item.phone || '0700000000',
        type: item.type,
        amount: Math.round(Number(item.amount)),
        date: item.date,
        status: item.status,
        code: item.code,
        sms_message: item.smsMessage || item.sms_message || null,
      });
      if (error) throw error;
    } catch (e: any) {
      console.error('Sync error (submit):', e.message);
    }
  };

  const saveLedger = (newLedger: LedgerItem[], syncItem?: LedgerItem) => {
    if (!user) return;
    setLedger(newLedger);
    localStorage.setItem(`tibapay_ledger_${user.phone}`, JSON.stringify(newLedger));
    if (syncItem) submitToServerQueue(syncItem);
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const saveSubs = (subs: ActiveSubscription[]) => {
    if (!user) return;
    setActiveSubscriptions(subs);
    localStorage.setItem(`tibapay_subs_${user.phone}`, JSON.stringify(subs));
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const updateMainPool = async (newPoolAmount: number) => {
    if (!user) return;
    const rounded = Math.round(newPoolAmount);
    setMainPool(rounded);
    localStorage.setItem(`tibapay_savings_${user.phone}`, String(rounded));
    await supabase.from('members').update({ savings_balance: rounded }).eq('phone', user.phone);
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const saveLoanState = (loan: ActiveLoan | null) => {
    if (!user) return;
    setActiveLoan(loan);
    loanRef.current = loan;
    if (loan && loan.status !== 'CLOSED' && loan.status !== 'REJECTED') {
      localStorage.setItem(`tibapay_loan_${user.phone}`, JSON.stringify(loan));
    } else {
      localStorage.removeItem(`tibapay_loan_${user.phone}`);
    }
    window.dispatchEvent(new Event('tibapay_sync'));
  };

  const syncFromServer = useCallback(async (currentUser: MemberUser) => {
    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('savings_balance, account_status, loan_limit, referrals_rewarded_count, referral_code')
        .eq('phone', currentUser.phone)
        .single();
        
      if (memberData) {
        const savings = Math.round(Number(memberData.savings_balance)) || 0;
        setMainPool(savings);
        localStorage.setItem(`tibapay_savings_${currentUser.phone}`, String(savings));
        
        setUser(prev => prev ? { 
          ...prev, 
          account_status: memberData.account_status,
          loan_limit: Number(memberData.loan_limit),
          referrals_rewarded_count: Number(memberData.referrals_rewarded_count) || 0,
          referral_code: memberData.referral_code || prev.referral_code
        } : null);
      }

      const { data: queueData } = await supabase
        .from('ledger_items')
        .select('*')
        .eq('phone', currentUser.phone) 
        .order('created_at', { ascending: false });

      const serverQueue = queueData || [];
      
      const mappedQueue = serverQueue.map((row: any) => ({
        id: String(row.id),
        phone: row.phone,
        type: String(row.type || ''),
        amount: Math.round(Number(row.amount)) || 0,
        date: String(row.date || ''),
        status: String(row.status || '').replace(/_/g, ' '),
        code: String(row.code || ''),
        smsMessage: row.sms_message,
      }));

      setLedger(mappedQueue);
      localStorage.setItem(`tibapay_ledger_${currentUser.phone}`, JSON.stringify(mappedQueue));

      const currentLoan = loanRef.current;
      if (currentLoan) {
        if (currentLoan.status === 'ACTIVE') {
          const today = new Date().toISOString().split('T')[0];
          if (today > currentLoan.dueDate) {
            const overdueLoan: ActiveLoan = { ...currentLoan, status: 'OVERDUE' };
            setActiveLoan(overdueLoan);
            loanRef.current = overdueLoan;
            localStorage.setItem(`tibapay_loan_${currentUser.phone}`, JSON.stringify(overdueLoan));
          }
        }

        if (currentLoan.status === 'PENDING ADMIN APPROVAL') {
          const loanItem = serverQueue.find((i: any) => String(i.code) === currentLoan.id);
          if (loanItem?.status === 'COMPLETED') {
            const updated: ActiveLoan = { ...currentLoan, status: 'ACTIVE' };
            setActiveLoan(updated);
            loanRef.current = updated;
            localStorage.setItem(`tibapay_loan_${currentUser.phone}`, JSON.stringify(updated));
          } else if (loanItem?.status === 'REJECTED') {
            setActiveLoan(null);
            loanRef.current = null;
            localStorage.removeItem(`tibapay_loan_${currentUser.phone}`);
          }
        }
        
        if (currentLoan.status === 'ACTIVE' || currentLoan.status === 'OVERDUE' || currentLoan.status === 'CLOSED') {
          const approvedRepayments = serverQueue.filter(
            (i: any) => i.type.includes('Loan Repayment') && i.status === 'COMPLETED'
          );
          const totalRepaid = approvedRepayments.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
          
          if (currentLoan.amountPaid !== totalRepaid) {
            const updated: ActiveLoan = { ...currentLoan, amountPaid: totalRepaid };
            
            if (totalRepaid >= currentLoan.totalRepay) {
              updated.status = 'CLOSED';
              setMessage('Your loan has been fully repaid!');
            } else {
              updated.status = currentLoan.status === 'OVERDUE' ? 'OVERDUE' : 'ACTIVE';
            }
            
            setActiveLoan(updated);
            loanRef.current = updated;
            localStorage.setItem(`tibapay_loan_${currentUser.phone}`, JSON.stringify(updated));
          }
        }
      }
    } catch (err: any) {
      console.error('Sync error (poll):', err.message);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    loadLocal(user);
    syncFromServer(user);

    const handleStorage = () => loadLocal(user);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('tibapay_sync', handleStorage);

    const interval = setInterval(() => {
      syncFromServer(user);
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tibapay_sync', handleStorage);
    };
  }, [user, syncFromServer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanPhone = loginPhone.trim();
    const cleanPin = loginPin.trim();

    if (cleanPhone.length < 10) return setAuthError('Enter a valid 10-digit phone.');
    if (cleanPin.length < 4) return setAuthError('Enter your 4-digit PIN.');

    if ((cleanPhone === '0700413388' || cleanPhone === '254700413388') && cleanPin === '6200') {
      const adminUser: MemberUser = { phone: cleanPhone, name: 'Brian Kegode (Admin)', role: 'admin' };
      localStorage.setItem('tibapay_auth_user', JSON.stringify(adminUser));
      window.location.replace('/admin');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from('members').select('*').eq('phone', cleanPhone).single();
    setLoading(false);

    if (error || !data) return setAuthError('Member not found. Please sign up.');
    if (data.pin !== cleanPin) return setAuthError('Incorrect PIN.');

    let refCode = data.referral_code;
    if (!refCode) {
      refCode = generateReferralCode(data.full_name);
      await supabase.from('members').update({ referral_code: refCode }).eq('phone', data.phone);
    }

    const loggedInUser: MemberUser = {
      phone: data.phone,
      name: data.full_name,
      role: data.role,
      joined_at: data.created_at,
      account_status: data.account_status || 'active',
      loan_limit: Number(data.loan_limit) || 0,
      referrals_rewarded_count: Number(data.referrals_rewarded_count) || 0,
      referral_code: refCode,
    };

    localStorage.setItem('tibapay_auth_user', JSON.stringify(loggedInUser));
    
    setLedger([]);
    setActiveSubscriptions([]);
    setActiveLoan(null);
    setMainPool(0);
    
    setUser(loggedInUser);
    setPhoneInput(loggedInUser.phone);
    lastActivityRef.current = Date.now();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanPhone = regPhone.trim();
    const cleanReferral = regReferral.trim();

    if (!regName.trim()) return setAuthError('Enter your full name.');
    if (cleanPhone.length < 10) return setAuthError('Enter a valid 10-digit phone.');
    if (regPin.length !== 4) return setAuthError('PIN must be 4 digits.');
    if (regPin !== regConfirmPin) return setAuthError('PINs do not match.');
    if (!regIsAdult) return setAuthError('You must confirm you are above 18.');

    setLoading(true);
    const { data: existing } = await supabase.from('members').select('phone').eq('phone', cleanPhone).single();
    if (existing) {
      setLoading(false);
      return setAuthError('Phone number already registered. Please log in.');
    }

    let referredBy = null;
    if (cleanReferral) {
      const { data: refData } = await supabase.from('members').select('phone').eq('referral_code', cleanReferral).single();
      if (!refData) {
        setLoading(false);
        return setAuthError('Invalid referral code.');
      }
      referredBy = refData.phone;
    }

    const newRefCode = generateReferralCode(regName);

    const { error } = await supabase.from('members').insert({
      phone: cleanPhone,
      full_name: regName.trim(),
      pin: regPin,
      role: 'member',
      savings_balance: 0,
      loan_limit: 0,
      account_status: 'active',
      referred_by: referredBy,
      referrals_rewarded_count: 0,
      referral_code: newRefCode
    });

    setLoading(false);
    if (error) return setAuthError(error.message);

    setAuthMode('login');
    setLoginPhone(cleanPhone);
    setAuthError(null);
    alert('Registration successful! Please log in.');
  };

  const handleChangePin = async () => {
    if (!user) return;
    if (newPin.length !== 4) return alert('PIN must be 4 digits.');
    
    const { error } = await supabase.from('members').update({ pin: newPin }).eq('phone', user.phone);
    if (error) return alert('Failed to update PIN.');
    
    alert('PIN updated successfully!');
    setShowChangePin(false);
    setNewPin('');
  };

  const handleUnlock = async () => {
    if (!user) return;
    if (lockPin.length !== 4) return alert('PIN must be 4 digits.');
    
    const { data, error } = await supabase.from('members').select('pin').eq('phone', user.phone).single();
    if (error || !data) return alert('Failed to verify PIN.');
    
    if (data.pin !== lockPin) return alert('Incorrect PIN.');
    
    setIsLocked(false);
    setLockPin('');
    lastActivityRef.current = Date.now();
  };

  const handleLogout = () => {
    setUser(null);
    setLedger([]);
    setActiveSubscriptions([]);
    setActiveLoan(null);
    setMainPool(0);
    localStorage.removeItem('tibapay_auth_user');
  };

  const handleSimulateAccrual = (tierId: number) => {
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    saveSubs(
      activeSubscriptions.map((s) =>
        s.tierId === tierId ? { ...s, accumulatedBalance: s.accumulatedBalance + tier.dailyLimit } : s
      )
    );
    setMessage(`Daily accrual added: +KES ${tier.dailyLimit} to ${tier.name}.`);
  };

  const handleSweepSub = (tierId: number) => {
    const sub = activeSubscriptions.find((s) => s.tierId === tierId);
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!sub || !tier || sub.accumulatedBalance <= 0) {
      setMessage('No accumulated balance to sweep.');
      return;
    }
    const totalGroupCut = sub.accumulatedBalance * 0.1;
    const totalNetSweep = Math.round(sub.accumulatedBalance * 0.9);
    
    updateMainPool(mainPool + totalNetSweep);

    const todayStr = new Date().toISOString().split('T')[0];
    const isExpired = todayStr >= sub.endDate;
    saveSubs(
      isExpired
        ? activeSubscriptions.filter((s) => s.tierId !== tierId)
        : activeSubscriptions.map((s) => (s.tierId === tierId ? { ...s, accumulatedBalance: 0 } : s))
    );

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: `Tier Sweep (${tier.name})`,
      amount: totalNetSweep,
      date: todayStr,
      status: 'COMPLETED',
      code: 'SWP-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };
    saveLedger([item, ...ledger]);
    setMessage(`Swept KES ${totalNetSweep.toLocaleString()} to Personal Savings (10% group fee: KES ${Math.round(totalGroupCut)}).`);
  };

  const handleSubscribeTier = (tierId: number) => {
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    if (mainPool < tier.entry) {
      setMessage(`Insufficient funds: need KES ${tier.entry.toLocaleString()}. Savings: KES ${mainPool.toLocaleString()}.`);
      return;
    }
    updateMainPool(mainPool - tier.entry);
    
    const startDate = new Date().toISOString().split('T')[0];
    const end = new Date();
    end.setDate(end.getDate() + tier.lockDays);
    const endDate = end.toISOString().split('T')[0];
    saveSubs([...activeSubscriptions, { tierId: tier.id, accumulatedBalance: 0, startDate, endDate, isLocked: true }]);

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: `Package Entry (${tier.name})`,
      amount: tier.entry,
      date: startDate,
      status: 'COMPLETED',
      code: 'ENT-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };
    saveLedger([item, ...ledger]);
    setMessage(`Subscribed to ${tier.name}. Active until ${endDate}.`);
  };

  const handleDeposit = async () => {
    const amt = Math.round(parseFloat(depositAmountInput));
    if (isNaN(amt) || amt <= 0) return setMessage('Enter a valid deposit amount.');

    const targetPhone = phoneInput.trim() || user?.phone || '';
    if (targetPhone.length < 10) return setMessage('Enter a valid M-Pesa phone number.');

    setLoading(true);
    setMessage(`Sending STK push to ${targetPhone}...`);

    const txnId = Date.now().toString();
    const tempCode = 'STK-' + Math.floor(1000 + Math.random() * 9000);

    const newItem: LedgerItem = {
      id: txnId,
      type: 'Deposit (STK)',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING PIN',
      code: tempCode,
      phone: user?.phone,
    };
    saveLedger([newItem, ...ledger], newItem);

    try {
      const res = await fetch('/api/tuma/stkpush', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, phone: targetPhone }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'STK push failed');
      }

      setMessage(`STK push sent to ${targetPhone}. Enter your M-Pesa PIN. Admin will verify code ${tempCode}.`);

      setTimeout(() => {
        let timeoutItem: LedgerItem | null = null;
        setLedger((prev) => {
          const updated = prev.map((i) => {
            if (i.id === txnId && i.status === 'PENDING PIN') {
              timeoutItem = { ...i, status: 'TIMEOUT / PASTE SMS' };
              return timeoutItem;
            }
            return i;
          });
          if (user) localStorage.setItem(`tibapay_ledger_${user.phone}`, JSON.stringify(updated));
          if (timeoutItem) submitToServerQueue(timeoutItem);
          return updated;
        });
        setMessage('STK push pending. If M-Pesa deducted, paste your SMS below so the Treasurer can verify.');
      }, 20000);
    } catch (err: any) {
      setMessage(`STK Push error: ${err?.message || 'unknown'}. Paste your M-Pesa SMS below if you paid manually.`);
      setShowManualDeposit(true);
      let errItem: LedgerItem | null = null;
      setLedger((prev) => {
        const updated = prev.map((i) => {
          if (i.id === txnId) {
            errItem = {
              ...i,
              status: 'TIMEOUT / PASTE SMS',
              smsMessage: `STK API failed: ${err?.message || 'unknown'}`,
            };
            return errItem;
          }
          return i;
        });
        if (user) localStorage.setItem(`tibapay_ledger_${user.phone}`, JSON.stringify(updated));
        if (errItem) submitToServerQueue(errItem);
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSmsSubmit = async () => {
    const amt = Math.round(parseFloat(depositAmountInput));
    if (!manualSmsText || manualSmsText.length < 10) return setMessage('Paste a valid M-Pesa SMS.');

    const codeMatch = manualSmsText.match(/\b([A-Z0-9]{10})\b/);
    const extractedCode = codeMatch ? codeMatch[1] : 'MPESA-' + Math.floor(1000 + Math.random() * 9000);

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: 'Deposit (Manual)',
      amount: isNaN(amt) ? 1000 : amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: extractedCode,
      smsMessage: manualSmsText,
      phone: user?.phone,
    };
    saveLedger([item, ...ledger], item);
    setManualSmsText('');
    setShowManualDeposit(false);
    setMessage('Confirmation submitted to Treasurer queue.');
  };

  const handleSubmitSmsForApproval = async (txnId: string) => {
    if (!pastedSmsText || pastedSmsText.length < 10) return setMessage('Paste a valid M-Pesa confirmation.');

    const codeMatch = pastedSmsText.match(/\b([A-Z0-9]{10})\b/);
    const extractedCode = codeMatch ? codeMatch[1] : 'MPESA-' + Math.floor(1000 + Math.random() * 9000);

    let updatedItem: LedgerItem | null = null;
    const updated = ledger.map((item) => {
      if (item.id === txnId) {
        updatedItem = { ...item, status: 'PENDING ADMIN APPROVAL', code: extractedCode, smsMessage: pastedSmsText };
        return updatedItem;
      }
      return item;
    });
    saveLedger(updated, updatedItem || undefined);
    setPastedSmsText('');
    setActiveSmsInputId(null);
    setMessage('Submitted to Treasurer queue.');
  };

  const handleWithdraw = async () => {
    const grossAmt = Math.round(parseFloat(withdrawAmountInput));
    if (isNaN(grossAmt) || grossAmt < 50) return setMessage('Minimum withdrawal is KES 50.');
    if (grossAmt > mainPool) return setMessage(`Insufficient savings. Balance: KES ${mainPool.toLocaleString()}.`);

    const gwfFee = calculateGWF(grossAmt);
    const netPayout = Math.round(grossAmt - gwfFee);

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: `Withdrawal (Net: KES ${netPayout.toLocaleString()})`,
      amount: grossAmt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: 'WDR-' + Math.floor(1000 + Math.random() * 9000),
      phone: user?.phone,
    };
    saveLedger([item, ...ledger], item);
    setMessage(`Withdrawal of KES ${grossAmt.toLocaleString()} submitted (GWF: KES ${gwfFee}, Net: KES ${netPayout.toLocaleString()}).`);
  };

  // ==========================================
  // LOAN RISK MANAGEMENT & ELIGIBILITY CHECKS
  // ==========================================
  
  const daysActive = user?.joined_at ? Math.floor((Date.now() - new Date(user.joined_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const hasMinSavings = mainPool >= 1000;
  const depositCount = ledger.filter(i => i.type.includes('Deposit') && i.status === 'COMPLETED').length;
  const hasConsistentSavings = depositCount >= 4;
  const isAccountActive = user?.account_status === 'active';
  
  const meetsBaseEligibility = daysActive >= 28 && hasMinSavings && hasConsistentSavings && isAccountActive;
  
  const hasPastCompletedLoan = ledger.some(i => i.type.includes('Loan Repayment') && i.status === 'COMPLETED');
  const limitPercentage = hasPastCompletedLoan ? 0.40 : 0.20;
  
  const calculatedMaxLimit = Math.min(Math.floor(mainPool * limitPercentage), 50000);
  const assignedLimit = meetsBaseEligibility ? Math.max(calculatedMaxLimit, user?.loan_limit || 0) : 0;
  
  const isBlockedByOverdue = activeLoan?.status === 'OVERDUE';
  const isEligibleForNewLoan = meetsBaseEligibility && !isBlockedByOverdue;

  const parsedLoanAmt = Math.round(parseFloat(loanAmountInput) || 0);
  const loanFee = Math.round(parsedLoanAmt * 0.05);
  const amountSentToMpesa = parsedLoanAmt - loanFee;
  const loanInterestRate = loanTermWeeks === 1 ? 0.03 : loanTermWeeks === 2 ? 0.05 : 0.1;
  const loanInterestAmount = Math.round(parsedLoanAmt * loanInterestRate);
  const totalLoanRepay = parsedLoanAmt + loanInterestAmount;

  const handleApplyLoan = async () => {
    if (activeLoan && activeLoan.status !== 'CLOSED' && activeLoan.status !== 'REJECTED') {
      return setMessage(`Repay active loan completely before borrowing again.`);
    }
    
    if (isBlockedByOverdue) {
      return setMessage(`Your account has an overdue loan. Please clear it to restore borrowing privileges.`);
    }
    
    if (!isAccountActive) {
      return setMessage(`Your account is under review. Borrowing is temporarily suspended.`);
    }

    if (!meetsBaseEligibility) {
      return setMessage(`You do not meet the loan eligibility requirements yet.`);
    }
    
    if (parsedLoanAmt <= 0) return setMessage('Enter a valid loan amount.');
    if (parsedLoanAmt > assignedLimit) {
      return setMessage(`Exceeds your approved limit of KES ${assignedLimit.toLocaleString()}.`);
    }

    const due = new Date();
    due.setDate(due.getDate() + loanTermWeeks * 7);
    const dueDateStr = due.toISOString().split('T')[0];
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
      amountPaid: 0,
      status: 'PENDING ADMIN APPROVAL',
      dueDate: dueDateStr,
      phone: user?.phone,
    };
    saveLoanState(newLoan);

    await supabase.from('audit_logs').insert({
      phone: user?.phone,
      action: 'LOAN_REQUEST_SUBMITTED',
      previous_value: 'None',
      new_value: parsedLoanAmt.toString(),
      reason: 'Member requested loan',
    });

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: `Loan Request (${loanTermWeeks}W)`,
      amount: parsedLoanAmt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: loanTxnId,
      phone: user?.phone,
    };
    saveLedger([item, ...ledger], item);
    setMessage(`Loan of KES ${parsedLoanAmt.toLocaleString()} submitted. Awaiting Treasurer (24 hr).`);
  };

  const handleRepaySTK = async () => {
    if (!activeLoan) return;
    if (!repayPhoneInput || repayPhoneInput.length < 10) return setMessage('Enter a valid M-Pesa phone number.');
    
    const amt = Math.round(parseFloat(repayAmountInput));
    const remaining = activeLoan.totalRepay - activeLoan.amountPaid;
    if (isNaN(amt) || amt <= 0) return setMessage('Enter a valid amount.');
    if (amt > remaining) return setMessage(`Amount exceeds remaining balance of KES ${remaining}.`);

    setLoading(true);
    setMessage(`Sending STK push to ${repayPhoneInput} for KES ${amt}...`);

    const txnId = Date.now().toString();
    const reqCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);

    const newItem: LedgerItem = {
      id: txnId,
      type: 'Loan Repayment',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: reqCode,
      phone: user?.phone,
    };
    saveLedger([newItem, ...ledger], newItem);

    try {
      const res = await fetch('/api/tuma/stkpush', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, phone: repayPhoneInput }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'STK push failed');
      }

      setMessage(`STK push sent. Enter your M-Pesa PIN. Admin will verify your payment.`);
    } catch (err: any) {
      setMessage(`STK Push error: ${err?.message || 'unknown'}.`);
      
      let errItem: LedgerItem | null = null;
      setLedger((prev) => {
        const updated = prev.map((i) => {
          if (i.id === txnId) {
            errItem = {
              ...i,
              status: 'TIMEOUT / PASTE SMS',
              smsMessage: `STK API failed: ${err?.message || 'unknown'}`,
            };
            return errItem;
          }
          return i;
        });
        if (user) localStorage.setItem(`tibapay_ledger_${user.phone}`, JSON.stringify(updated));
        if (errItem) submitToServerQueue(errItem);
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRepaySMS = () => {
    if (!activeLoan) return;
    if (!repaySmsText || repaySmsText.length < 10) return setMessage('Paste a valid M-Pesa SMS.');
    
    const amt = Math.round(parseFloat(repayAmountInput));
    const remaining = activeLoan.totalRepay - activeLoan.amountPaid;
    if (isNaN(amt) || amt <= 0) return setMessage('Enter a valid amount.');
    if (amt > remaining) return setMessage(`Amount exceeds remaining balance of KES ${remaining}.`);

    const codeMatch = repaySmsText.match(/\b([A-Z0-9]{10})\b/);
    const extractedCode = codeMatch ? codeMatch[1] : 'MPESA-' + Math.floor(1000 + Math.random() * 9000);

    const newItem: LedgerItem = {
      id: Date.now().toString(),
      type: 'Loan Repayment',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: extractedCode,
      smsMessage: repaySmsText,
      phone: user?.phone,
    };
    saveLedger([newItem, ...ledger], newItem);
    setRepaySmsText('');
    setMessage(`Repayment of KES ${amt} submitted to Treasurer queue.`);
  };

  const parsedWithdrawAmt = Math.round(parseFloat(withdrawAmountInput) || 0);
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
            <p className="text-xs text-slate-400">
              {authMode === 'login' ? 'Welcome back. Please log in.' : 'Create your savings account.'}
            </p>
          </div>

          {authError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed">
              {authError}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
                <input
                  type="text"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="0712XXXXXX"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Security PIN (4 Digits)</label>
                <div className="relative">
                  <input
                    type={showLoginPin ? "text" : "password"}
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="****"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 tracking-widest text-center text-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPin(!showLoginPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showLoginPin ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:bg-emerald-400 transition cursor-pointer mt-2 disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Log In'}
              </button>
              
              <div className="text-center pt-2">
                <button type="button" onClick={() => { setAuthMode('signup'); setAuthError(null); }} className="text-xs text-emerald-400 font-bold hover:underline">
                  Don't have an account? Sign Up
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0712XXXXXX"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PIN (4 Digits)</label>
                  <div className="relative">
                    <input
                      type={showRegPin ? "text" : "password"}
                      maxLength={4}
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      placeholder="****"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 tracking-widest text-center text-lg"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPin(!showRegPin)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showRegPin ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confirm PIN</label>
                  <div className="relative">
                    <input
                      type={showConfirmPin ? "text" : "password"}
                      maxLength={4}
                      value={regConfirmPin}
                      onChange={(e) => setRegConfirmPin(e.target.value)}
                      placeholder="****"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 tracking-widest text-center text-lg"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPin(!showConfirmPin)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showConfirmPin ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Referral Code (Optional)</label>
                <input
                  type="text"
                  value={regReferral}
                  onChange={(e) => setRegReferral(e.target.value)}
                  placeholder="e.g. 123-ABC"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="adultCheck"
                  checked={regIsAdult}
                  onChange={(e) => setRegIsAdult(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="adultCheck" className="text-xs text-slate-300">I confirm I am 18 years or older</label>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:bg-emerald-400 transition cursor-pointer mt-2 disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
              
              <div className="text-center pt-2">
                <button type="button" onClick={() => { setAuthMode('login'); setAuthError(null); }} className="text-xs text-emerald-400 font-bold hover:underline">
                  Already have an account? Log In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const referralLink = `https://tibapay.vercel.app?ref=${user.referral_code}`;
  const shareMessage = `Join me on TibaPay and let's grow our wealth together! Use my code ${user.referral_code} to sign up and get started. ${referralLink}`;

  const handleShareReferral = async () => {
    const shareData = {
      title: 'Join TibaPay Vault',
      text: shareMessage,
      url: referralLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing', err);
      }
    } else {
      navigator.clipboard.writeText(referralLink);
      setMessage('Referral link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4 font-sans pb-24 relative">
      
      {/* SCREEN LOCK OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-center items-center p-6 space-y-6">
          <div className="text-center space-y-2 mb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl shadow-lg border border-slate-700">
              🔒
            </div>
            <h2 className="text-xl font-black text-white">Screen Locked</h2>
            <p className="text-xs text-slate-400">Enter your PIN to unlock</p>
          </div>
          
          <div className="w-full max-w-xs space-y-4">
            <div className="relative">
              <input
                type="password"
                maxLength={4}
                value={lockPin}
                onChange={(e) => setLockPin(e.target.value)}
                placeholder="****"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 tracking-widest text-center text-xl"
              />
            </div>
            <button
              onClick={handleUnlock}
              className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:bg-emerald-400 transition cursor-pointer"
            >
              Unlock
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-transparent text-rose-400 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Sign Out completely
            </button>
          </div>
        </div>
      )}

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
        <div className="flex flex-col gap-1 items-end">
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] transition cursor-pointer border border-slate-700"
          >
            Sign Out
          </button>
          <button onClick={() => setShowChangePin(true)} className="text-[9px] text-emerald-400 font-bold hover:underline">
            Change PIN
          </button>
        </div>
      </div>

      {showChangePin && (
        <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl space-y-3">
          <h3 className="text-xs font-bold text-white">Change Your PIN</h3>
          <div className="relative">
            <input
              type={showNewPin ? "text" : "password"}
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="Enter new 4-digit PIN"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white tracking-widest text-center"
            />
            <button
              type="button"
              onClick={() => setShowNewPin(!showNewPin)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showNewPin ? '👁️' : '🙈'}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleChangePin} className="flex-1 py-2 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs">
              Update PIN
            </button>
            <button onClick={() => setShowChangePin(false)} className="px-3 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold leading-relaxed">
          {message}
        </div>
      )}

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

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-600 p-3 rounded-2xl text-slate-950 shadow-md">
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">My Savings</p>
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
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
                  {loading ? 'Sending STK Push...' : 'Trigger M-Pesa STK Push'}
                </button>
              </>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-slate-400">
                  If you paid manually, paste your M-Pesa confirmation SMS below for Treasurer verification:
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
                  Submit Confirmation to Treasurer Queue
                </button>
              </div>
            )}
          </div>

          {/* REFERRAL CARD - SINGLE BUTTON & HIDDEN MAX LIMIT */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-900/50 to-slate-900 border border-indigo-500/30 p-4 space-y-3 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Refer & Earn</span>
                <h3 className="font-black text-sm text-white">Get KES 5 per friend</h3>
              </div>
              <div className="text-2xl">🎁</div>
            </div>
            <p className="text-[11px] text-slate-400">
              Invite a friend to start saving. You get KES 5 instantly when they sign up using your code!
            </p>
            
            <button 
              onClick={handleShareReferral}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>Share Invite Link</span>
            </button>
            
            <div className="text-[9px] text-center text-slate-500 mt-1 font-mono">
              Your Code: {user.referral_code || user.phone}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 space-y-3 shadow-md">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">My Cash In and Out Activity</span>
              <span className="text-slate-500">Live Ledger ({ledger.length})</span>
            </div>
            <div className="space-y-2 text-xs max-h-72 overflow-y-auto pr-1">
              {ledger.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">{item.type}</p>
                      <p className="text-[10px] text-slate-500">{item.date} - {item.code}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          item.type.includes('Deposit') || item.type.includes('Sweep') || item.type.includes('Disbursement') || item.type.includes('Bonus')
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {item.type.includes('Deposit') || item.type.includes('Sweep') || item.type.includes('Disbursement') || item.type.includes('Bonus') ? '+' : '-'}
                        KES {item.amount.toLocaleString()}
                      </p>
                      <p
                        className={`text-[10px] ${
                          item.status === 'COMPLETED' || item.status === 'DISBURSED' || item.status === 'APPROVED'
                            ? 'text-emerald-500 font-bold'
                            : item.status === 'PENDING ADMIN APPROVAL' || item.status === 'PENDING PIN'
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

                  {(item.status.includes('TIMEOUT') || item.status === 'PENDING PIN') && activeSmsInputId !== item.id && (
                    <button
                      onClick={() => setActiveSmsInputId(item.id)}
                      className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold transition cursor-pointer"
                    >
                      Paste M-Pesa SMS for Admin Approval
                    </button>
                  )}

                  {activeSmsInputId === item.id && (
                    <div className="space-y-2 pt-1">
                      <textarea
                        value={pastedSmsText}
                        onChange={(e) => setPastedSmsText(e.target.value)}
                        placeholder="Paste full M-Pesa text here"
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

      {activeTab === 'packages' && (
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider px-1">
              Active Subscriptions ({activeSubscriptions.length})
            </h3>
            {activeSubscriptions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-500">
                No active package subscriptions.
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
                      <div className="flex items-center gap-4">
                        <div className={`${tier.sizeClass} drop-shadow-lg`}>{tier.icon}</div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{tier.name}</span>
                          <h3 className="font-black text-sm text-white">Expires: {sub.endDate}</h3>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl ${isExpired ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                        {isExpired ? 'Period Over' : 'Active'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
                      <div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Daily Gross</p>
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
                        + Add Daily (+{tier.dailyLimit})
                      </button>
                      <button
                        onClick={() => handleSweepSub(sub.tierId)}
                        disabled={sub.accumulatedBalance <= 0}
                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-[10px] transition cursor-pointer disabled:opacity-50 shadow-md"
                      >
                        Sweep to Savings
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <h3 className="font-bold text-sm text-white">Maximum Attraction Tiers</h3>
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
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${tier.sizeClass} drop-shadow-md`}>{tier.icon}</div>
                      <div>
                        <p className="font-bold text-xs text-white">{tier.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Entry: <strong className={hasEnough ? 'text-emerald-400' : 'text-rose-400'}>KES {tier.entry.toLocaleString()}</strong> - Period: {tier.lockDays} Days
                        </p>
                        {/* TOTAL ROI HIDDEN */}
                        <p className="text-[10px] font-bold text-emerald-400 mt-1">
                          Gross Daily: +KES {tier.dailyLimit}
                        </p>
                      </div>
                    </div>
                    <div>
                      {isSubscribed ? (
                        <span className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] font-bold rounded-lg">
                          Subscribed
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

      {activeTab === 'withdraw' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-3 shadow-lg">
            <h3 className="font-bold text-sm text-white">Graduated Withdrawal (GWF v6)</h3>
            <p className="text-xs text-slate-400">
              Available Savings Balance: <strong className="text-emerald-400">KES {mainPool.toLocaleString()}</strong>
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

      {activeTab === 'loans' && (
        <div className="space-y-3">
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 space-y-4 shadow-lg">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">TibaPay Loan Engine</h3>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${
                isEligibleForNewLoan 
                  ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' 
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
              }`}>
                Max Limit: KES {isEligibleForNewLoan ? assignedLimit.toLocaleString() : 'Locked'}
              </span>
            </div>

            {activeLoan ? (
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Loan Reference</p>
                    <p className="font-black text-sm text-white">{activeLoan.id}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-xl ${
                    activeLoan.status === 'PENDING ADMIN APPROVAL' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 
                    activeLoan.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    activeLoan.status === 'CLOSED' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
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
                  <div>
                    <p className="text-[9px] text-slate-400">Amount Paid</p>
                    <p className="font-bold text-emerald-400">KES {activeLoan.amountPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">Remaining Balance</p>
                    <p className="font-black text-rose-400">KES {(activeLoan.totalRepay - activeLoan.amountPaid).toLocaleString()}</p>
                  </div>
                </div>
                
                {activeLoan.status === 'PENDING ADMIN APPROVAL' ? (
                  <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs text-sky-300 text-center font-medium">
                    Awaiting Treasurer approval and M-Pesa disbursement (24 hr).
                  </div>
                ) : activeLoan.status === 'OVERDUE' ? (
                  <div className="space-y-3 bg-slate-900 p-3.5 rounded-xl border border-rose-500/30">
                    <p className="text-xs font-bold text-rose-400">Your loan is overdue. Please clear the balance to restore borrowing privileges.</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount to Pay (KES)</label>
                      <input
                        type="number"
                        value={repayAmountInput}
                        onChange={(e) => setRepayAmountInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setRepayMode('stk')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${repayMode === 'stk' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                      >
                        Pay via STK Push
                      </button>
                      <button
                        onClick={() => setRepayMode('sms')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${repayMode === 'sms' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                      >
                        Paste SMS
                      </button>
                    </div>

                    {repayMode === 'stk' ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
                          <input
                            type="text"
                            value={repayPhoneInput}
                            onChange={(e) => setRepayPhoneInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                            placeholder="0712345678"
                          />
                        </div>
                        <button
                          onClick={handleRepaySTK}
                          disabled={loading}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                        >
                          {loading ? 'Sending STK Push...' : 'Trigger STK Push'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={repaySmsText}
                          onChange={(e) => setRepaySmsText(e.target.value)}
                          placeholder="Paste M-Pesa confirmation SMS here..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 h-20 resize-none"
                        />
                        <button
                          onClick={handleRepaySMS}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md"
                        >
                          Submit SMS to Treasurer
                        </button>
                      </div>
                    )}
                  </div>
                ) : activeLoan.status === 'ACTIVE' ? (
                  <div className="space-y-3 bg-slate-900 p-3.5 rounded-xl border border-slate-700">
                    <p className="text-xs font-bold text-amber-400">Make a Partial or Full Repayment:</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount to Pay (KES)</label>
                      <input
                        type="number"
                        value={repayAmountInput}
                        onChange={(e) => setRepayAmountInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setRepayMode('stk')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${repayMode === 'stk' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                      >
                        Pay via STK Push
                      </button>
                      <button
                        onClick={() => setRepayMode('sms')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition ${repayMode === 'sms' ? 'bg-slate-800 text-white' : 'text-slate-500'}`}
                      >
                        Paste SMS
                      </button>
                    </div>

                    {repayMode === 'stk' ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
                          <input
                            type="text"
                            value={repayPhoneInput}
                            onChange={(e) => setRepayPhoneInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                            placeholder="0712345678"
                          />
                        </div>
                        <button
                          onClick={handleRepaySTK}
                          disabled={loading}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                        >
                          {loading ? 'Sending STK Push...' : 'Trigger STK Push'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={repaySmsText}
                          onChange={(e) => setRepaySmsText(e.target.value)}
                          placeholder="Paste M-Pesa confirmation SMS here..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 h-20 resize-none"
                        />
                        <button
                          onClick={handleRepaySMS}
                          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md"
                        >
                          Submit SMS to Treasurer
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 text-center font-medium">
                    Loan fully cleared! You may apply for a new one.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                
                {!isEligibleForNewLoan ? (
                  <div className="bg-slate-950/80 border border-slate-800 p-6 rounded-2xl text-center space-y-2 shadow-inner">
                    <p className="text-sm font-bold text-slate-300">Loan Locked</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You are not yet eligible to borrow. Keep saving and building your account history to unlock this feature.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">
                      You qualify to borrow up to <strong className="text-white">KES {assignedLimit.toLocaleString()}</strong> ({hasPastCompletedLoan ? '40%' : '20%'} of savings). All loans require Treasurer approval and 24-hour disbursement.
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
                        <span className="text-slate-400">Interest ({loanTermWeeks}w @ {loanTermWeeks === 1 ? '3%' : loanTermWeeks === 2 ? '5%' : '10%'}):</span>
                        <span className="font-bold text-white">+KES {loanInterestAmount.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-slate-800 pt-2 flex justify-between items-center">
                        <span className="font-bold text-amber-400">Total Amount to Repay:</span>
                        <span className="text-sm font-black text-amber-400">KES {totalLoanRepay.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleApplyLoan}
                      disabled={parsedLoanAmt <= 0 || parsedLoanAmt > assignedLimit}
                      className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition cursor-pointer disabled:opacity-50 shadow-md mt-2"
                    >
                      Submit Loan Request for Admin Review (24 Hr)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <InstallPrompt />
    </div>
  );
}