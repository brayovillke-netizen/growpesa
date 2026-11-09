'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import InstallPrompt from '@/components/InstallPrompt';
import { PushNotificationManager } from '@/components/PushNotificationManager';
import { useBiometrics } from '@/components/BiometricLock';
import { supabase } from '@/lib/supabase/client';

interface LedgerItem {
  id: string;
  type: string;
  amount: number;
  date: string;
  created_at?: string;
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
  total_deposited?: number;
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
  lastAccrualDate?: string;
}

interface ActiveLoan {
  id: string;
  requestedAmount: number;
  fee: number;
  gwfFee?: number;
  amountSent: number;
  termWeeks: number;
  interestRate: number;
  interestAmount: number;
  totalRepay: number;
  baseRepay?: number; 
  penaltyAmount?: number; 
  amountPaid: number;
  status: 'PENDING ADMIN APPROVAL' | 'DISBURSED' | 'APPROVED' | 'ACTIVE' | 'OVERDUE' | 'CLOSED' | 'REJECTED';
  dueDate: string;
  requestedDate?: string; 
  phone?: string;
}

const ADMIN_PHONE = '0700413388';

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
  const isReviewMode = process.env.NEXT_PUBLIC_TUMA_REVIEW_MODE === 'true';

  const [user, setUser] = useState<MemberUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regReferral, setRegReferral] = useState('');
  const [regIsAdult, setRegIsAdult] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showLoginPin, setShowLoginPin] = useState(false);
  const [showRegPin, setShowRegPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [newPin, setNewPin] = useState('');

  const [hideBalances, setHideBalances] = useState(false);
  const lastActivityRef = useRef(0);
  const [todayStr, setTodayStr] = useState('');
  const [daysActive, setDaysActive] = useState(0);

  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'withdraw' | 'loans' | 'lock'>('overview');
  const [mainPool, setMainPool] = useState<number>(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [activeLoan, setActiveLoan] = useState<ActiveLoan | null>(null);

  const [lockAmountInput, setLockAmountInput] = useState('');
  const [lockDateInput, setLockDateInput] = useState('');

  const [loanAmountInput, setLoanAmountInput] = useState('1000');
  const [loanTermWeeks, setLoanTermWeeks] = useState(4);

  const [repayPhoneInput, setRepayPhoneInput] = useState('');
  const [repayAmountInput, setRepayAmountInput] = useState('');
  const [repayMode, setRepayMode] = useState<'stk' | 'sms'>('stk');
  const [repaySmsText, setRepaySmsText] = useState('');

  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false); 

  const [depositAmountInput, setDepositAmountInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('1000');

  const [isDepositOpen, setIsDepositOpen] = useState(false);

  const [activeSmsInputId, setActiveSmsInputId] = useState<string | null>(null);
  const [pastedSmsText, setPastedSmsText] = useState('');
  const [manualSmsText, setManualSmsText] = useState('');
  const [showManualDeposit, setShowManualDeposit] = useState(false);

  const [ledger, setLedger] = useState<LedgerItem[]>([]);

  const { isEnabled: bioEnabled, isSupported: bioSupported, enableBiometrics, disableBiometrics, loginWithBiometrics } = useBiometrics();
  const [hasSavedBio, setHasSavedBio] = useState(false);

  const loanRef = useRef<ActiveLoan | null>(null);
  useEffect(() => {
    loanRef.current = activeLoan;
  }, [activeLoan]);

  useEffect(() => {
    const bioId = localStorage.getItem('growpesa_biometric_id');
    const bioPhone = localStorage.getItem('growpesa_bio_phone');
    
    if (bioId || bioPhone || bioEnabled) {
      setHasSavedBio(true);
    }
  }, [bioEnabled]);

  const notifyAdmin = async (title: string, body: string) => {
    try {
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: ADMIN_PHONE, title, body }),
      });
    } catch (err) {
      console.error('Failed to notify admin:', err);
    }
  };

  // 🔥 Helper to trigger both in-app and system notifications
  const triggerNotification = async (title: string, body: string) => {
    // 1. Always show in-app banner instantly
    setMessage(body);

    // 2. Send request to backend to trigger phone OS notification
    if (user?.phone) {
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: user.phone, title, body })
        });
      } catch (err) {
        console.error('System notification failed', err);
      }
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setRegReferral(ref);
      setAuthMode('signup');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('growpesa_auth_user');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as MemberUser;
      if (parsed.role === 'admin') {
        window.location.replace('/admin');
        return;
      }
      setUser(parsed);
      setPhoneInput(parsed.phone);
      lastActivityRef.current = Date.now();
    } catch {}
  }, []);

  useEffect(() => {
    const update = () => setTodayStr(new Date().toISOString().split('T')[0]);
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user?.joined_at) {
      setDaysActive(0);
      return;
    }
    const joinedMs = new Date(user.joined_at).getTime();
    if (isNaN(joinedMs)) {
      setDaysActive(0);
      return;
    }
    setDaysActive(Math.max(0, Math.floor((Date.now() - joinedMs) / 86400000)));
  }, [user?.joined_at]);

  useEffect(() => {
    if (!user) return;

    lastActivityRef.current = Date.now();

    const interval = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 300000) {
        setUser(null);
        setLedger([]);
        setActiveSubscriptions([]);
        setActiveLoan(null);
        setMainPool(0);
        localStorage.removeItem('growpesa_auth_user');
        setMessage('You have been logged out due to 5 minutes of inactivity.');
        setAuthMode('login');
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
  }, [user?.phone]);

  useEffect(() => {
    if (user) setRepayPhoneInput(user.phone);
  }, [user?.phone]);

  const loadLocal = (u: MemberUser) => {
    const savedLedger = localStorage.getItem(`growpesa_ledger_${u.phone}`);
    if (savedLedger) {
      try { setLedger(JSON.parse(savedLedger)); } catch {}
    }
    const savedSavings = localStorage.getItem(`growpesa_savings_${u.phone}`);
    if (savedSavings) setMainPool(Math.round(Number(savedSavings)) || 0);

    const savedSubs = localStorage.getItem(`growpesa_subs_${u.phone}`);
    if (savedSubs) {
      try {
        const parsed: ActiveSubscription[] = JSON.parse(savedSubs);
        setActiveSubscriptions(parsed);
      } catch {}
    }

    const savedLoan = localStorage.getItem(`growpesa_loan_${u.phone}`);
    if (savedLoan) {
      try {
        const parsed: ActiveLoan = JSON.parse(savedLoan);
        if (parsed.status !== 'CLOSED' && parsed.status !== 'REJECTED') {
          if (parsed.amountPaid >= parsed.totalRepay) {
            localStorage.removeItem(`growpesa_loan_${u.phone}`);
          } else {
            if (!parsed.requestedDate && parsed.dueDate) {
              const due = new Date(parsed.dueDate);
              due.setDate(due.getDate() - parsed.termWeeks * 7);
              parsed.requestedDate = due.toISOString();
            }
            setActiveLoan(prev => {
              if (prev && prev.id === parsed.id && prev.amountPaid === parsed.amountPaid && prev.status === parsed.status) {
                return prev;
              }
              return parsed;
            });
          }
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

  const saveLedger = async (newLedger: LedgerItem[], syncItem?: LedgerItem) => {
    if (!user) return;
    setLedger(newLedger);
    localStorage.setItem(`growpesa_ledger_${user.phone}`, JSON.stringify(newLedger));
    if (syncItem) {
      await submitToServerQueue(syncItem);
    }
    window.dispatchEvent(new Event('growpesa_sync'));
  };

  const updateMainPool = async (newPoolAmount: number): Promise<boolean> => {
    if (!user) return false;
    const rounded = Math.round(newPoolAmount);
    const delta = rounded - mainPool;
    if (delta === 0) return true;

    setMainPool(rounded);
    localStorage.setItem(`growpesa_savings_${user.phone}`, String(rounded));

    try {
      const { data, error } = await supabase.rpc('increment_member_savings', {
        p_phone: user.phone,
        p_delta: delta,
      });

      if (error) {
        console.warn('RPC failed, trying direct update:', error.message);
        const { error: updErr } = await supabase
          .from('members')
          .update({ savings_balance: rounded })
          .eq('phone', user.phone);

        if (updErr) {
          console.error('Both RPC and direct update failed:', updErr);
          setMainPool(rounded - delta);
          localStorage.setItem(`growpesa_savings_${user.phone}`, String(rounded - delta));
          setMessage(`Could not save balance: ${updErr.message}`);
          return false;
        }
      } else if (typeof data === 'number') {
        const dbBal = Math.round(data);
        setMainPool(dbBal);
        localStorage.setItem(`growpesa_savings_${user.phone}`, String(dbBal));
      }
    } catch (e: any) {
      console.error('Exception updating savings:', e);
      setMainPool(rounded - delta);
      localStorage.setItem(`growpesa_savings_${user.phone}`, String(rounded - delta));
      setMessage(`Error saving balance: ${e?.message || 'unknown'}`);
      return false;
    }

    window.dispatchEvent(new Event('growpesa_sync'));
    return true;
  };

  const saveLoanState = (loan: ActiveLoan | null) => {
    if (!user) return;
    setActiveLoan(loan);
    loanRef.current = loan;
    if (loan && loan.status !== 'CLOSED' && loan.status !== 'REJECTED') {
      localStorage.setItem(`growpesa_loan_${user.phone}`, JSON.stringify(loan));
    } else {
      localStorage.removeItem(`growpesa_loan_${user.phone}`);
    }
    window.dispatchEvent(new Event('growpesa_sync'));
  };

  const syncFromServer = useCallback(async (currentUser: MemberUser) => {
    try {
      const { data: memberData } = await supabase
        .from('members')
        .select('savings_balance, total_deposited, account_status, loan_limit, referrals_rewarded_count, referral_code')
        .eq('phone', currentUser.phone)
        .single();

      if (memberData) {
        const savings = Math.round(Number(memberData.savings_balance)) || 0;
        setMainPool(prev => prev === savings ? prev : savings);

        setUser(prev => {
          if (!prev) return null;
          const updated = {
            ...prev,
            account_status: memberData.account_status,
            loan_limit: Number(memberData.loan_limit) || 0,
            total_deposited: Number(memberData.total_deposited) || 0,
            referrals_rewarded_count: Number(memberData.referrals_rewarded_count) || 0,
            referral_code: memberData.referral_code || prev.referral_code
          };
          return JSON.stringify(prev) === JSON.stringify(updated) ? prev : updated;
        });
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
        created_at: String(row.created_at || row.date || ''),
        status: String(row.status || '').replace(/_/g, ' '),
        code: String(row.code || ''),
        smsMessage: row.sms_message,
      }));

      setLedger(prev => {
        if (JSON.stringify(prev) === JSON.stringify(mappedQueue)) return prev;
        localStorage.setItem(`growpesa_ledger_${currentUser.phone}`, JSON.stringify(mappedQueue));
        return mappedQueue;
      });

      const rebuiltSubs: ActiveSubscription[] = [];
      const today = new Date().toISOString().split('T')[0];

      PACKAGE_TIERS.forEach(tier => {
        const latestEntry = mappedQueue.find((i: any) => i.type.includes(`Package Entry (${tier.name})`) && i.status === 'COMPLETED');
        
        if (latestEntry) {
          const entryDate = latestEntry.date;
          const latestSweep = mappedQueue.find((i: any) => i.type.includes(`Tier Sweep (${tier.name})`) && i.status === 'COMPLETED' && i.date >= entryDate);
          
          const end = new Date(entryDate);
          end.setDate(end.getDate() + tier.lockDays);
          const endDate = end.toISOString().split('T')[0];
          const isExpired = today >= endDate;

          if (!isExpired || (isExpired && !latestSweep)) {
            const calcStartDate = latestSweep ? latestSweep.date : entryDate;
            const startMs = new Date(calcStartDate).getTime();
            const todayMs = new Date(today).getTime();
            
            const effectiveEndMs = Math.min(todayMs, end.getTime());
            const daysElapsed = Math.max(0, Math.floor((effectiveEndMs - startMs) / 86400000));
            
            const balance = Math.min(daysElapsed * tier.dailyLimit, tier.totalPayout);

            rebuiltSubs.push({
              tierId: tier.id,
              accumulatedBalance: balance,
              startDate: entryDate,
              endDate: endDate,
              isLocked: true,
              lastAccrualDate: today
            });
          }
        }
      });

      setActiveSubscriptions(prev => {
        if (JSON.stringify(prev) === JSON.stringify(rebuiltSubs)) return prev;
        localStorage.setItem(`growpesa_subs_${currentUser.phone}`, JSON.stringify(rebuiltSubs));
        return rebuiltSubs;
      });

      const currentLoan = loanRef.current;

      if (!currentLoan) {
        const totalBorrowed = serverQueue.filter((i: any) => i.type.includes('Loan Request') && i.status === 'COMPLETED').reduce((sum: number, item: any) => sum + Number(item.amount), 0);
        const totalRepaid = serverQueue.filter((i: any) => i.type.includes('Loan Repayment') && i.status === 'COMPLETED').reduce((sum: number, item: any) => sum + Number(item.amount), 0);

        if (totalBorrowed > totalRepaid) {
          const latestLoan = serverQueue.find((i: any) => i.type.includes('Loan Request') && i.status === 'COMPLETED');
          if (latestLoan) {
            const reqAmt = Number(latestLoan.amount);
            const fee = Math.round(reqAmt * 0.05);
            const gwf = calculateGWF(reqAmt);
            const baseRepay = reqAmt + Math.round(reqAmt * 0.10); 
            const due = new Date(latestLoan.date);
            due.setDate(due.getDate() + 28);

            const rebuilt: ActiveLoan = {
              id: latestLoan.code,
              requestedAmount: reqAmt,
              fee: fee + gwf,
              gwfFee: gwf,
              amountSent: reqAmt - fee - gwf,
              termWeeks: 4,
              interestRate: 0.10,
              interestAmount: Math.round(reqAmt * 0.10),
              totalRepay: baseRepay,
              baseRepay: baseRepay,
              penaltyAmount: 0,
              amountPaid: totalRepaid,
              status: 'ACTIVE',
              dueDate: due.toISOString().split('T')[0],
              requestedDate: latestLoan.created_at || latestLoan.date,
              phone: currentUser.phone
            };
            setActiveLoan(rebuilt);
            loanRef.current = rebuilt;
            localStorage.setItem(`growpesa_loan_${currentUser.phone}`, JSON.stringify(rebuilt));
          }
        }
      } else {
        
        if (currentLoan.status === 'ACTIVE' || currentLoan.status === 'OVERDUE') {
          const todayDateObj = new Date(new Date().toISOString().split('T')[0]);
          const dueDateObj = new Date(currentLoan.dueDate);
          
          let newPenalty = 0;
          if (todayDateObj > dueDateObj) {
            const daysLate = Math.floor((todayDateObj.getTime() - dueDateObj.getTime()) / (1000 * 60 * 60 * 24));
            newPenalty = Math.round(currentLoan.requestedAmount * 0.005 * daysLate); 
          }
          
          const baseAmount = currentLoan.baseRepay || (currentLoan.totalRepay - (currentLoan.penaltyAmount || 0));
          const newTotalRepay = baseAmount + newPenalty;
          
          if (newTotalRepay !== currentLoan.totalRepay || (newPenalty > 0 && currentLoan.status !== 'OVERDUE')) {
             const updated: ActiveLoan = {
               ...currentLoan,
               baseRepay: baseAmount,
               penaltyAmount: newPenalty,
               totalRepay: newTotalRepay,
               status: newPenalty > 0 ? 'OVERDUE' : 'ACTIVE'
             };
             setActiveLoan(updated);
             loanRef.current = updated;
             localStorage.setItem(`growpesa_loan_${currentUser.phone}`, JSON.stringify(updated));
          }
        }

        if (currentLoan.status === 'PENDING ADMIN APPROVAL') {
          const loanItem = serverQueue.find((i: any) => String(i.code) === currentLoan.id);
          if (loanItem?.status === 'COMPLETED') {
            const updated: ActiveLoan = { ...currentLoan, status: 'ACTIVE' };
            setActiveLoan(updated);
            loanRef.current = updated;
            localStorage.setItem(`growpesa_loan_${currentUser.phone}`, JSON.stringify(updated));
          } else if (loanItem?.status === 'REJECTED') {
            setActiveLoan(null);
            loanRef.current = null;
            localStorage.removeItem(`growpesa_loan_${currentUser.phone}`);
          }
        }

        if (currentLoan.status === 'ACTIVE' || currentLoan.status === 'OVERDUE') {
          const loanRequestedAt = currentLoan.requestedDate || new Date().toISOString();

          const approvedRepayments = serverQueue.filter((i: any) => {
            if (!i.type.includes('Loan Repayment') || i.status !== 'COMPLETED') return false;
            const repaymentTime = i.created_at || i.date;
            return repaymentTime >= loanRequestedAt;
          });
          
          const totalRepaidForThisLoan = approvedRepayments.reduce((sum: number, item: any) => sum + Number(item.amount), 0);

          if (totalRepaidForThisLoan >= currentLoan.totalRepay) {
            setActiveLoan(null);
            loanRef.current = null;
            localStorage.removeItem(`growpesa_loan_${currentUser.phone}`);
            setMessage('Congratulations! Your loan is fully repaid.');
          } else if (currentLoan.amountPaid !== totalRepaidForThisLoan) {
            const updated: ActiveLoan = { ...currentLoan, amountPaid: totalRepaidForThisLoan };
            setActiveLoan(updated);
            loanRef.current = updated;
            localStorage.setItem(`growpesa_loan_${currentUser.phone}`, JSON.stringify(updated));
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
    window.addEventListener('growpesa_sync', handleStorage);

    const interval = setInterval(() => {
      syncFromServer(user);
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('growpesa_sync', handleStorage);
    };
  }, [user?.phone, syncFromServer]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const cleanPhone = loginPhone.trim();
    const cleanPin = loginPin.trim();

    if (cleanPhone.length < 10) return setAuthError('Enter a valid 10-digit phone.');
    if (cleanPin.length < 4) return setAuthError('Enter your 4-digit PIN.');

    if ((cleanPhone === '0700413388' || cleanPhone === '254700413388') && cleanPin === '6200') {
      const adminUser: MemberUser = { phone: cleanPhone, name: 'Brian Kegode (Admin)', role: 'admin' };
      localStorage.setItem('growpesa_auth_user', JSON.stringify(adminUser));
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
      total_deposited: Number(data.total_deposited) || 0,
      referrals_rewarded_count: Number(data.referrals_rewarded_count) || 0,
      referral_code: refCode,
    };

    localStorage.setItem('growpesa_auth_user', JSON.stringify(loggedInUser));

    setLedger([]);
    setActiveSubscriptions([]);
    setActiveLoan(null);
    setMainPool(0);

    setUser(loggedInUser);
    setPhoneInput(loggedInUser.phone);
    lastActivityRef.current = Date.now();
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setAuthError(null);
    const savedPhone = await loginWithBiometrics();
    
    if (!savedPhone) {
      setLoading(false);
      return setAuthError('Biometric authentication failed. Please use your PIN.');
    }

    const { data, error } = await supabase.from('members').select('*').eq('phone', savedPhone).single();
    setLoading(false);

    if (error || !data) return setAuthError('Member not found. Please log in with PIN.');

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
      total_deposited: Number(data.total_deposited) || 0,
      referrals_rewarded_count: Number(data.referrals_rewarded_count) || 0,
      referral_code: refCode,
    };

    localStorage.setItem('growpesa_auth_user', JSON.stringify(loggedInUser));

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
      total_deposited: 0,
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

  const handleLogout = () => {
    setUser(null);
    setLedger([]);
    setActiveSubscriptions([]);
    setActiveLoan(null);
    setMainPool(0);
    localStorage.removeItem('growpesa_auth_user');
    
    if (localStorage.getItem('growpesa_bio_phone') || localStorage.getItem('growpesa_biometric_id') || bioEnabled) {
      setHasSavedBio(true);
    }
  };

  const handleSweepSub = async (tierId: number) => {
    const sub = activeSubscriptions.find((s) => s.tierId === tierId);
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!sub || !tier || sub.accumulatedBalance <= 0) {
      setMessage('No accumulated balance to sweep.');
      return;
    }

    const totalGroupCut = Math.round(sub.accumulatedBalance * 0.1);
    const totalNetSweep = Math.round(sub.accumulatedBalance * 0.9);

    const saved = await updateMainPool(mainPool + totalNetSweep);
    if (!saved) {
      setMessage('Sweep cancelled — could not credit Main Savings. Please try again.');
      return;
    }

    if (totalGroupCut > 0) {
      try {
        const { data: poolData } = await supabase
          .from('treasury_pool')
          .select('pool_balance')
          .eq('id', 1)
          .single();
        if (poolData) {
          const newPoolBal = Math.round(Number(poolData.pool_balance) + totalGroupCut);
          await supabase
            .from('treasury_pool')
            .update({ pool_balance: newPoolBal, updated_at: new Date().toISOString() })
            .eq('id', 1);
        }
      } catch (e) {
        console.error('Treasury credit failed (non-fatal):', e);
      }
    }

    const todayStrLocal = new Date().toISOString().split('T')[0];
    const isExpired = todayStrLocal >= sub.endDate;

    let nextSubs;
    if (isExpired) {
      nextSubs = activeSubscriptions.filter(s => s.tierId !== tierId);
    } else {
      nextSubs = activeSubscriptions.map(s => 
        s.tierId === tierId ? { ...s, accumulatedBalance: 0, lastAccrualDate: todayStrLocal } : s
      );
    }
    
    setActiveSubscriptions(nextSubs);
    localStorage.setItem(`growpesa_subs_${user!.phone}`, JSON.stringify(nextSubs));

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: `Tier Sweep (${tier.name})`,
      amount: totalNetSweep,
      date: todayStrLocal,
      status: 'COMPLETED',
      code: 'SWP-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };
    await saveLedger([item, ...ledger], item);
    
    setMessage(`Swept KES ${totalNetSweep.toLocaleString()} to Main Savings!`);
  };

  const handleSubscribeTier = async (tierId: number) => {
    const tier = PACKAGE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    if (mainPool < tier.entry) {
      setMessage(`Insufficient funds: need KES ${tier.entry.toLocaleString()}. Savings: KES ${mainPool.toLocaleString()}.`);
      return;
    }

    const deducted = await updateMainPool(mainPool - tier.entry);
    if (!deducted) {
      setMessage('Subscription failed — could not deduct entry fee. Please try again.');
      return;
    }

    const startDate = new Date().toISOString().split('T')[0];
    const end = new Date();
    end.setDate(end.getDate() + tier.lockDays);
    const endDate = end.toISOString().split('T')[0];
    
    const newSub: ActiveSubscription = {
      tierId: tier.id,
      accumulatedBalance: 0,
      startDate,
      endDate,
      isLocked: true,
      lastAccrualDate: startDate,
    };

    const nextSubs = [...activeSubscriptions, newSub];
    setActiveSubscriptions(nextSubs);
    localStorage.setItem(`growpesa_subs_${user!.phone}`, JSON.stringify(nextSubs));

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: `Package Entry (${tier.name})`,
      amount: tier.entry,
      date: startDate,
      status: 'COMPLETED',
      code: 'ENT-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };
    
    await saveLedger([item, ...ledger], item);
    setMessage(`Subscribed to ${tier.name}. Active for ${tier.lockDays} days.`);
  };

  const handleCreateLock = async () => {
    const amt = Math.round(parseFloat(lockAmountInput));
    if (isNaN(amt) || amt <= 0) return setMessage('Enter a valid amount to lock.');
    if (amt > mainPool) return setMessage(`Insufficient funds. Balance: KES ${mainPool.toLocaleString()}.`);
    if (!lockDateInput) return setMessage('Select an unlock date.');

    const unlockDateObj = new Date(lockDateInput);
    const today = new Date();
    const diffTime = Math.abs(unlockDateObj.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays < 30) return setMessage('Minimum lock period is 30 days.');

    const deducted = await updateMainPool(mainPool - amt);
    if (!deducted) return setMessage('Could not lock funds. Please try again.');

    const item: LedgerItem = {
      id: Date.now().toString(),
      type: 'Lock Savings',
      amount: amt,
      date: today.toISOString().split('T')[0],
      status: 'COMPLETED',
      code: 'LCK-' + Math.floor(10000 + Math.random() * 90000),
      smsMessage: JSON.stringify({ unlockDate: lockDateInput }), 
      phone: user?.phone,
    };

    await saveLedger([item, ...ledger], item);
    setLockAmountInput('');
    setLockDateInput('');
    setMessage(`Successfully locked KES ${amt.toLocaleString()} until ${lockDateInput}.`);
  };

  const handleEmergencyUnlock = async (lockItem: LedgerItem) => {
    const principal = lockItem.amount;
    const penalty = Math.ceil(principal * 0.02); 
    const amountReturned = principal - penalty;

    const confirm = window.confirm(
      `Are you sure you want to break this lock?\n\n` +
      `A 2% penalty of KES ${penalty.toLocaleString()} will be applied.\n` +
      `You will receive KES ${amountReturned.toLocaleString()} back into your Main Wallet.`
    );
    if (!confirm) return;

    const saved = await updateMainPool(mainPool + amountReturned);
    if (!saved) return setMessage('Failed to process unlock.');

    if (penalty > 0) {
       try {
        const { data: poolData } = await supabase.from('treasury_pool').select('pool_balance').eq('id', 1).single();
        if (poolData) {
          const newPoolBal = Math.round(Number(poolData.pool_balance) + penalty);
          await supabase.from('treasury_pool').update({ pool_balance: newPoolBal, updated_at: new Date().toISOString() }).eq('id', 1);
        }
      } catch (e) { console.error('Treasury credit failed:', e); }
    }

    let updatedItem: LedgerItem | null = null;
    const updated = ledger.map((l) => {
      if (l.id === lockItem.id) {
        updatedItem = { ...l, status: 'UNLOCKED' }; 
        return updatedItem;
      }
      return l;
    });

    const recordItem: LedgerItem = {
      id: Date.now().toString(),
      type: 'Lock Emergency Withdraw',
      amount: amountReturned,
      date: new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      code: 'EMG-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };

    if (updatedItem) {
      await submitToServerQueue(updatedItem);
    }

    await saveLedger([recordItem, ...updated], recordItem);
    
    setMessage(`Emergency unlock successful. KES ${amountReturned.toLocaleString()} returned to your wallet.`);
  };

  const handleClaimMaturedLock = async (lockItem: LedgerItem) => {
    const principal = lockItem.amount;
    const start = new Date(lockItem.date);
    
    let meta: any = {};
    try { meta = JSON.parse(lockItem.smsMessage || lockItem.sms_message || '{}'); } catch(e){}
    const unlockDate = new Date(meta.unlockDate || lockItem.date);
    
    const daysLocked = Math.max(30, Math.floor((unlockDate.getTime() - start.getTime()) / (1000 * 3600 * 24)));
    const interest = Math.round(principal * 0.05 * (daysLocked / 365)); 
    const total = principal + interest;

    const saved = await updateMainPool(mainPool + total);
    if (!saved) return setMessage('Failed to claim matured lock.');

    let updatedItem: LedgerItem | null = null;
    const updated = ledger.map((l) => {
      if (l.id === lockItem.id) {
        updatedItem = { ...l, status: 'UNLOCKED' }; 
        return updatedItem;
      }
      return l;
    });

    const recordItem: LedgerItem = {
      id: Date.now().toString(),
      type: 'Lock Matured Claim',
      amount: total,
      date: new Date().toISOString().split('T')[0],
      status: 'COMPLETED',
      code: 'MAT-' + Math.floor(10000 + Math.random() * 90000),
      phone: user?.phone,
    };

    if (updatedItem) {
      await submitToServerQueue(updatedItem);
    }

    await saveLedger([recordItem, ...updated], recordItem);
    setMessage(`Matured lock claimed! Received KES ${total.toLocaleString()} (incl. KES ${interest} interest).`);
  };

  const handleDeposit = async () => {
    const amt = Math.round(parseFloat(depositAmountInput));
    if (isNaN(amt) || amt <= 0) return setMessage('Enter a valid deposit amount.');

    const targetPhone = phoneInput.trim() || user?.phone || '';
    if (targetPhone.length < 10) return setMessage('Enter a valid M-Pesa phone number.');

    setIsPushing(true);
    setMessage(`Sending STK push to ${targetPhone}...`);

    const txnId = Date.now().toString();
    const tempReference = `STK-${Math.floor(1000 + Math.random() * 9000)}`;

    const newItem: LedgerItem = {
      id: txnId,
      type: 'Deposit (STK)',
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING PIN',
      code: tempReference,
      phone: user?.phone,
    };
    await saveLedger([newItem, ...ledger], newItem);

    try {
      const res = await fetch('/api/paybridge/stkpush', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, phone: targetPhone, reference: tempReference }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(JSON.stringify(data));
      }

      const activeReference = data.finalReference || tempReference;

      setMessage(`STK push sent to ${targetPhone}. Please enter your M-Pesa PIN.`);

      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const { data: checkItem } = await supabase
          .from('ledger_items')
          .select('status')
          .eq('code', activeReference)
          .single();

        if (checkItem?.status === 'COMPLETED') {
          clearInterval(pollInterval);
          setIsPushing(false);
          triggerNotification('Deposit Successful 🎉', 'Your balance has been updated.');
          syncFromServer(user!);
        } else if (checkItem?.status === 'FAILED') {
          clearInterval(pollInterval);
          setIsPushing(false);
          triggerNotification('Deposit Failed ❌', 'The transaction was cancelled or failed.');
        } else if (attempts > 20) {
          clearInterval(pollInterval);
          setIsPushing(false);
          
          const timeoutItem: LedgerItem = { ...newItem, code: activeReference, status: 'TIMEOUT / PASTE SMS' };
          await submitToServerQueue(timeoutItem);
          
          triggerNotification('STK Timeout ⏳', 'STK push timed out. If money was deducted, paste SMS below.');
          setShowManualDeposit(true);
        }
      }, 3000);

    } catch (err: any) {
      triggerNotification('STK Push Error ❌', `${err?.message || 'unknown'}.`);
      setIsPushing(false);
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
        if (user) localStorage.setItem(`growpesa_ledger_${user.phone}`, JSON.stringify(updated));
        if (errItem) submitToServerQueue(errItem);
        return updated;
      });
    }
  };

  const handleDirectSmsSubmit = async () => {
    const amt = Math.round(parseFloat(depositAmountInput));
    if (!manualSmsText || manualSmsText.length < 10) return setMessage('Paste a valid M-Pesa SMS.');

    const codeMatch = manualSmsText.match(/\b([A-Z0-9]{10})\b/);
    if (!codeMatch) {
      return setMessage('Invalid message: Could not detect the 10-character M-Pesa code. Please paste the full SMS.');
    }
    const extractedCode = codeMatch[1];

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
    await saveLedger([item, ...ledger], item);
    setManualSmsText('');
    setShowManualDeposit(false);
    setMessage(isReviewMode ? 'Transaction logged successfully.' : 'Confirmation submitted to Treasurer queue.');
    
    await notifyAdmin('New Deposit 📥', `Manual deposit from ${user?.phone} for KES ${item.amount}`);
  };

  const handleSubmitSmsForApproval = async (txnId: string) => {
    if (!pastedSmsText || pastedSmsText.length < 10) return setMessage('Paste a valid M-Pesa confirmation.');

    const codeMatch = pastedSmsText.match(/\b([A-Z0-9]{10})\b/);
    if (!codeMatch) {
      return setMessage('Invalid message: Could not detect the 10-character M-Pesa code. Please paste the full SMS.');
    }
    const extractedCode = codeMatch[1];

    let updatedItem: LedgerItem | null = null;
    const updated = ledger.map((item) => {
      if (item.id === txnId) {
        updatedItem = { ...item, status: 'PENDING ADMIN APPROVAL', code: extractedCode, smsMessage: pastedSmsText };
        return updatedItem;
      }
      return item;
    });
    await saveLedger(updated, updatedItem || undefined);
    setPastedSmsText('');
    setActiveSmsInputId(null);
    setMessage(isReviewMode ? 'Transaction logged successfully.' : 'Submitted to Treasurer queue.');
    
    if (updatedItem) {
      await notifyAdmin('New STK Deposit 📥', `STK deposit from ${user?.phone} for KES ${(updatedItem as LedgerItem).amount}`);
    }
  };

  const handleWithdraw = async () => {
    if (hasUnpaidLoan) {
      return setMessage('You cannot withdraw savings while you have an active loan.');
    }

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
    await saveLedger([item, ...ledger], item);
    
    triggerNotification('Withdrawal Submitted ⏳', `Your request for KES ${netPayout.toLocaleString()} is pending approval.`);
    
    await notifyAdmin('New Withdrawal 💸', `Withdrawal request from ${user?.phone} for KES ${grossAmt}`);
  };

  const totalBorrowed = ledger
    .filter(i => i.type.includes('Loan Request') && i.status === 'COMPLETED')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalRepaid = ledger
    .filter(i => i.type.includes('Loan Repayment') && i.status === 'COMPLETED')
    .reduce((sum, i) => sum + i.amount, 0);

  const hasUnpaidLoan = totalBorrowed > totalRepaid;

  const hasMinDeposit = (user?.total_deposited || 0) >= 400;
  const isAccountActive = user?.account_status === 'active';

  const meetsBaseEligibility = daysActive >= 28 && hasMinDeposit && isAccountActive && !hasUnpaidLoan;

  const completedLoans = ledger.filter(i => i.type.includes('Loan Repayment') && i.status === 'COMPLETED').length;

  let currentStage = 1;
  let stageName = 'Starter';

  if (completedLoans >= 3 && daysActive >= 120) {
    currentStage = 4;
    stageName = 'Established';
  } else if (completedLoans >= 2 && daysActive >= 60) {
    currentStage = 3;
    stageName = 'Trusted';
  } else if (completedLoans >= 1 && daysActive >= 28) {
    currentStage = 2;
    stageName = 'Advanced';
  } else {
    currentStage = 1;
    stageName = 'Starter';
  }

  const calculatedMaxLimit = user?.loan_limit || 0;
  const isEligibleForNewLoan = meetsBaseEligibility;

  const parsedLoanAmt = Math.round(parseFloat(loanAmountInput) || 0);

  const baseLoanFee = Math.round(parsedLoanAmt * 0.05);
  const loanGwfFee = calculateGWF(parsedLoanAmt);
  const totalFee = baseLoanFee + loanGwfFee;
  const amountSentToMpesa = Math.max(0, parsedLoanAmt - totalFee);

  const loanInterestRate = loanTermWeeks === 1 ? 0.05 : loanTermWeeks === 2 ? 0.10 : 0.20;
  const loanInterestAmount = Math.round(parsedLoanAmt * loanInterestRate);
  const totalLoanRepay = parsedLoanAmt + loanInterestAmount;

  const handleApplyLoan = async () => {
    if (hasUnpaidLoan) {
      return setMessage(`You cannot borrow again until your current loan is fully repaid.`);
    }

    if (!isAccountActive) {
      return setMessage(`Your account is under review. Borrowing is temporarily suspended.`);
    }

    if (!meetsBaseEligibility) {
      return setMessage(`You must be an active member for 4 weeks and have KES 400 total deposited to unlock a starter limit.`);
    }

    if (parsedLoanAmt <= 0) return setMessage('Enter a valid loan amount.');
    if (parsedLoanAmt > calculatedMaxLimit) {
      return setMessage(`Exceeds your locked limit of KES ${calculatedMaxLimit.toLocaleString()}.`);
    }

    const due = new Date();
    due.setDate(due.getDate() + loanTermWeeks * 7);
    const dueDateStr = due.toISOString().split('T')[0];
    const loanTxnId = 'LOAN-' + Math.floor(1000 + Math.random() * 9000);

    const newLoan: ActiveLoan = {
      id: loanTxnId,
      requestedAmount: parsedLoanAmt,
      fee: totalFee,
      gwfFee: loanGwfFee,
      amountSent: amountSentToMpesa,
      termWeeks: loanTermWeeks,
      interestRate: loanInterestRate,
      interestAmount: loanInterestAmount,
      totalRepay: totalLoanRepay,
      baseRepay: totalLoanRepay,
      penaltyAmount: 0,
      amountPaid: 0,
      status: 'PENDING ADMIN APPROVAL',
      dueDate: dueDateStr,
      requestedDate: new Date().toISOString(),
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
      type: `Loan Request (${loanTxnId})`,
      amount: parsedLoanAmt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: loanTxnId,
      phone: user?.phone,
    };
    await saveLedger([item, ...ledger], item);
    
    triggerNotification('Loan Requested 🏦', `Your loan of KES ${parsedLoanAmt.toLocaleString()} is pending approval.`);
    setRepayAmountInput('');
    
    await notifyAdmin('New Loan Request 🏦', `Loan request from ${user?.phone} for KES ${parsedLoanAmt}`);
  };

  const handleRepaySTK = async () => {
    if (!activeLoan) return;
    if (!repayPhoneInput || repayPhoneInput.length < 10) return setMessage('Enter a valid M-Pesa phone number.');

    const amt = Math.round(parseFloat(repayAmountInput));
    const remaining = activeLoan.totalRepay - activeLoan.amountPaid;

    if (remaining <= 0) return setMessage('Your loan is already fully repaid.');
    if (isNaN(amt) || amt <= 0) return setMessage('Enter a valid amount.');
    if (amt > remaining) return setMessage(`Amount exceeds remaining balance of KES ${remaining}.`);

    setLoading(true);
    setMessage(`Sending STK push to ${repayPhoneInput} for KES ${amt}...`);

    const txnId = Date.now().toString();
    const reqCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);

    const newItem: LedgerItem = {
      id: txnId,
      type: `Loan Repayment (${activeLoan.id})`,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: reqCode,
      phone: user?.phone,
    };
    await saveLedger([newItem, ...ledger], newItem);

    try {
      const res = await fetch('/api/paybridge/stkpush', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, phone: repayPhoneInput, reference: reqCode }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(JSON.stringify(data));
      }

      setMessage(`STK push sent. Enter your M-Pesa PIN. Admin will verify your payment.`);
      setRepayAmountInput('');
    } catch (err: any) {
      triggerNotification('Repayment Failed ❌', `${err?.message || 'unknown'}.`);

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
        if (user) localStorage.setItem(`growpesa_ledger_${user.phone}`, JSON.stringify(updated));
        if (errItem) submitToServerQueue(errItem);
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRepaySMS = async () => {
    if (!activeLoan) return;
    if (!repaySmsText || repaySmsText.length < 10) return setMessage('Paste a valid M-Pesa SMS.');

    const codeMatch = repaySmsText.match(/\b([A-Z0-9]{10})\b/);
    if (!codeMatch) {
      return setMessage('Invalid message: Could not detect the 10-character M-Pesa code. Please paste the full SMS.');
    }
    const extractedCode = codeMatch[1];

    const amt = Math.round(parseFloat(repayAmountInput));
    const remaining = activeLoan.totalRepay - activeLoan.amountPaid;

    if (remaining <= 0) return setMessage('Your loan is already fully repaid.');
    if (isNaN(amt) || amt <= 0) return setMessage('Enter a valid amount.');
    if (amt > remaining) return setMessage(`Amount exceeds remaining balance of KES ${remaining}.`);

    const newItem: LedgerItem = {
      id: Date.now().toString(),
      type: `Loan Repayment (${activeLoan.id})`,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
      status: 'PENDING ADMIN APPROVAL',
      code: extractedCode,
      smsMessage: repaySmsText,
      phone: user?.phone,
    };
    await saveLedger([newItem, ...ledger], newItem);
    setRepaySmsText('');
    setRepayAmountInput('');
    setMessage(`Repayment of KES ${amt} submitted to Treasurer queue.`);
    
    await notifyAdmin('New Repayment 💰', `Loan repayment from ${user?.phone} for KES ${amt}`);
  };

  const parsedWithdrawAmt = Math.round(parseFloat(withdrawAmountInput) || 0);
  const currentGWFFee = calculateGWF(parsedWithdrawAmt);
  const currentNetPayout = Math.max(0, parsedWithdrawAmt - currentGWFFee);

  const packageEarnings = activeSubscriptions.reduce((sum, s) => sum + s.accumulatedBalance, 0);

  const formatMoney = (amount: number) => {
    return hideBalances ? 'KES ****' : `KES ${amount.toLocaleString()}`;
  };

  const displayLedger = isReviewMode
    ? ledger.filter(item => !item.type.includes('Withdrawal') && !item.type.includes('Loan') && !item.type.includes('Sweep'))
    : ledger;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const firstName = user?.name ? user.name.split(' ')[0] : 'Member';

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center p-6 max-w-md mx-auto font-sans">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 font-black text-slate-950 text-2xl shadow-lg shadow-emerald-500/20">
              GP
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Grow<span className="text-emerald-400">Pesa</span> Vault
            </h1>
            <p className="text-xs text-slate-400">
              {authMode === 'login' ? 'Welcome back. Please log in.' : 'Create your savings account.'}
            </p>
          </div>

          {message && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold leading-relaxed text-center">
              {message}
            </div>
          )}

          {authError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold leading-relaxed">
              {authError}
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-Pesa Phone Number</label>
                <input
                  type="text"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="0712XXXXXX"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                  autoComplete="off"
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
                    autoComplete="new-password"
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

              {bioSupported && hasSavedBio && (
                <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  className="w-full py-3.5 bg-slate-800 text-sky-400 font-black rounded-xl text-sm border border-sky-500/30 shadow-lg hover:bg-slate-700 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="text-xl">🫆</span>
                  {loading ? 'Verifying...' : 'Login with Biometrics'}
                </button>
              )}

              <div className="text-center pt-2">
                <button type="button" onClick={() => { setAuthMode('signup'); setAuthError(null); setMessage(null); }} className="text-xs text-emerald-400 font-bold hover:underline">
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
                <button type="button" onClick={() => { setAuthMode('login'); setAuthError(null); setMessage(null); }} className="text-xs text-emerald-400 font-bold hover:underline">
                  Already have an account? Log In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const referralLink = `https://growpesa.co.ke?ref=${user!.referral_code}`;
  const shareMessage = `Join me on GrowPesa and let's grow our wealth together! Use my code ${user!.referral_code} to sign up and get started. ${referralLink}`;

  const handleShareReferral = async () => {
    const shareData = {
      title: 'Join GrowPesa Vault',
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

  const availableTabs = isReviewMode 
    ? (['overview'] as const)
    : (['overview', 'packages', 'lock', 'withdraw', 'loans'] as const);

  const activeLocks = ledger.filter(item => 
    item.type === 'Lock Savings' && item.status === 'COMPLETED'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 max-w-md mx-auto space-y-4 font-sans pb-24 relative">
      
      {!isReviewMode && <InstallPrompt />}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950 text-lg shadow-md shadow-emerald-500/20">
            GP
          </div>
          <div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight text-white">
                {getGreeting()}, <span className="text-emerald-400">{firstName}</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-slate-400 font-medium">GrowPesa</span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Member
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <div className="flex gap-2">
            <button
              onClick={() => setHideBalances(!hideBalances)}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] transition cursor-pointer border border-slate-700"
              title={hideBalances ? "Reveal Balances" : "Hide Balances"}
            >
              {hideBalances ? '🙈' : '👁️'}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-[10px] transition cursor-pointer border border-slate-700"
            >
              Sign Out
            </button>
          </div>
          
          <div className="flex gap-2 mt-1 justify-end">
            <button onClick={() => setShowChangePin(true)} className="text-[9px] text-emerald-400 font-bold hover:underline">
              Change PIN
            </button>
            
            {bioSupported && (
              <button 
                onClick={async () => {
                  if (bioEnabled) {
                    disableBiometrics();
                    setHasSavedBio(false);
                    localStorage.removeItem('growpesa_bio_phone');
                  } else {
                    const success = await enableBiometrics(user.phone);
                    if (success) {
                      localStorage.setItem('growpesa_bio_phone', user.phone);
                      setHasSavedBio(true);
                      alert('Biometrics enabled! You will be prompted on next login.');
                    } else {
                      alert('Failed to enable biometrics. Your device may not support it.');
                    }
                  }
                }} 
                className="text-[9px] text-sky-400 font-bold hover:underline"
              >
                {bioEnabled ? 'Disable Biometrics' : 'Enable Biometrics'}
              </button>
            )}
          </div>
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md p-3 bg-emerald-600 border border-emerald-500 rounded-xl text-white text-xs font-semibold leading-relaxed shadow-2xl flex justify-between items-start">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="ml-2 font-bold hover:text-emerald-200">✕</button>
        </div>
      )}

      <div className={`grid ${isReviewMode ? 'grid-cols-1' : 'grid-cols-5'} gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 text-[11px] font-semibold`}>
        {availableTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setMessage(null); }}
            className={`py-2 rounded-xl capitalize transition cursor-pointer ${
              activeTab === tab
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {tab === 'packages' && isReviewMode ? 'Goals' : tab === 'lock' ? 'Vault' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className={`grid ${isReviewMode ? 'grid-cols-2' : 'grid-cols-2'} gap-2.5`}>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-3.5 rounded-2xl text-white shadow-lg shadow-emerald-900/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">Tracked Balance</p>
              <p className="text-xl font-black mt-1">{formatMoney(mainPool)}</p>
            </div>
            
            {isReviewMode ? (
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-800 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-900/30">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">Days Active</p>
                <p className="text-xl font-black mt-1">{daysActive} Days</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-br from-violet-600 to-purple-800 p-3.5 rounded-2xl text-white shadow-lg shadow-violet-900/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-100">Package Earns</p>
                  <p className="text-xl font-black mt-1">{formatMoney(packageEarnings)}</p>
                </div>
                
                <div className="bg-gradient-to-br from-sky-500 to-blue-700 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-900/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-sky-100">Active Subs</p>
                  <p className="text-xl font-black mt-1">
                    {activeSubscriptions.length} {activeSubscriptions.length === 1 ? 'Tier' : 'Tiers'}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-800 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-900/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-100">Loan Status</p>
                  <p className="text-xl font-black mt-1">{hasUnpaidLoan ? 'Active' : 'None'}</p>
                </div>
              </>
            )}
          </div>

          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
            <button
              onClick={() => setIsDepositOpen(!isDepositOpen)}
              disabled={isPushing}
              className="w-full flex justify-between items-center"
            >
              <h3 className="font-black text-base text-white flex items-center gap-2">
                <span className="text-emerald-400">💵</span> {isReviewMode ? 'Log Transaction' : 'Deposit Funds'}
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">
                {isDepositOpen ? 'Close' : 'Open Form'}
              </span>
            </button>

            {isDepositOpen && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                {!showManualDeposit ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Phone Number</label>
                      <input
                        type="text"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        placeholder="0712345678"
                        disabled={isPushing}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Amount (KES)</label>
                      <div className="flex items-center bg-slate-950 rounded-xl border border-slate-700 p-1 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-2 rounded-lg border border-slate-700/50">KES</span>
                        <input
                          type="number"
                          value={depositAmountInput}
                          onChange={(e) => setDepositAmountInput(e.target.value)}
                          className="w-full bg-transparent px-4 py-1.5 text-lg text-white font-black focus:outline-none"
                          placeholder="Enter amount"
                          disabled={isPushing}
                        />
                      </div>
                    </div>
                    
                    <button
                      onClick={handleDeposit}
                      disabled={isPushing || !depositAmountInput} 
                      className="w-full py-3.5 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isPushing ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent"></span>
                          Waiting for PIN...
                        </>
                      ) : (
                        <>{isReviewMode ? 'Sync M-Pesa' : '⚡ Push to Phone'}</>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setShowManualDeposit(true)}
                        disabled={isPushing}
                        className="text-[10px] text-slate-500 hover:text-slate-300 font-bold underline transition cursor-pointer disabled:opacity-50"
                      >
                        STK push failed? Paste M-Pesa SMS manually
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] text-amber-400 font-bold">Manual Entry Mode</p>
                      <button 
                        onClick={() => setShowManualDeposit(false)}
                        className="text-[10px] text-emerald-400 font-bold hover:underline"
                      >
                        ← Back to Auto STK
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {isReviewMode ? 'Paste your M-Pesa SMS to log the transaction:' : 'Paste the M-Pesa SMS to submit for Treasurer approval:'}
                    </p>
                    <textarea
                      value={manualSmsText}
                      onChange={(e) => setManualSmsText(e.target.value)}
                      placeholder="Paste full SMS here..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 h-24 resize-none transition"
                    />
                    <button
                      onClick={handleDirectSmsSubmit}
                      className="w-full py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm shadow-lg hover:bg-emerald-400 transition cursor-pointer"
                    >
                      {isReviewMode ? 'Log Transaction' : 'Submit Confirmation'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 p-4 shadow-xl relative overflow-hidden">
             <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">New Feature</span>
                  <h3 className="font-black text-base text-white">Lock & Grow</h3>
                </div>
                <div className="text-2xl drop-shadow-md">🔒</div>
              </div>
              <p className="text-[11px] text-slate-400 mb-3 font-medium">
                Lock your savings to earn up to 20%. Watch your money grow effortlessly in the background.
              </p>
              <button
                onClick={() => setActiveTab('lock')}
                className="w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Go to Vault
              </button>
          </div>

          {!isReviewMode && (
            <div className="rounded-3xl bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-4 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-start mb-1">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Refer & Earn</span>
                  <h3 className="font-black text-base text-white">Earn up to KES 50</h3>
                </div>
                <div className="text-2xl drop-shadow-md">🎁</div>
              </div>
              <p className="text-[11px] text-slate-400 mb-4 font-medium">
                Share your invite link. Get rewarded instantly when your friends make their first deposit.
              </p>

              <button
                onClick={handleShareReferral}
                className="w-full py-3 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>↗️ Share Invite</span>
              </button>

              <div className="mt-3 text-center">
                <span className="text-[10px] text-slate-500 font-bold">Code: </span>
                <span className="text-[10px] text-indigo-400 font-mono font-bold tracking-wider">{user.referral_code || user.phone}</span>
              </div>
            </div>
          )}

          {!isReviewMode && (
            <a
              href="https://twitter.com/intent/follow?screen_name=growpesax"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-4 shadow-xl hover:border-slate-500 transition cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black border border-slate-700 font-black text-white text-xl">
                    𝕏
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Follow Us</span>
                    <h3 className="font-black text-sm text-white">@growpesax on X</h3>
                    <p className="text-[10px] text-slate-500">News, updates & community</p>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-white text-slate-950 font-bold rounded-lg text-[10px] shrink-0">
                  Follow →
                </div>
              </div>
            </a>
          )}

          {!isReviewMode && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-sm text-white">Recent Activity</h3>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">{displayLedger.length} Records</span>
              </div>
              
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {displayLedger.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4">No recent activity.</p>
                ) : (
                  displayLedger.map((item) => (
                    <div key={item.id} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="max-w-[65%]">
                          <p className="font-bold text-[11px] text-white truncate">{item.type}</p>
                          <p className="text-[8px] text-slate-500 font-medium">{item.date} · {item.code}</p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-black text-[12px] ${
                              item.type.includes('Deposit') || item.type.includes('Sweep') || item.type.includes('Disbursement') || item.type.includes('Bonus')
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {item.type.includes('Deposit') || item.type.includes('Sweep') || item.type.includes('Disbursement') || item.type.includes('Bonus') ? '+' : '-'}
                            {formatMoney(item.amount)}
                          </p>
                          <p
                            className={`text-[8px] font-bold ${
                              item.status === 'COMPLETED' || item.status === 'DISBURSED' || item.status === 'APPROVED'
                                ? 'text-emerald-500'
                                : item.status === 'PENDING ADMIN APPROVAL' || item.status === 'PENDING PIN' || (isReviewMode && item.status.includes('ADMIN'))
                                ? 'text-sky-400'
                                : item.status === 'REJECTED' || item.status === 'FAILED'
                                ? 'text-rose-500'
                                : 'text-amber-400 animate-pulse'
                            }`}
                          >
                            {isReviewMode && item.status.includes('ADMIN') ? 'PENDING SYNC' : item.status}
                          </p>
                        </div>
                      </div>

                      {(item.status.includes('TIMEOUT') || item.status === 'PENDING PIN') && activeSmsInputId !== item.id && (
                        <button
                          onClick={() => setActiveSmsInputId(item.id)}
                          className="w-full py-1 mt-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-md text-[9px] font-bold transition cursor-pointer"
                        >
                          Paste M-Pesa SMS
                        </button>
                      )}

                      {activeSmsInputId === item.id && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80 mt-2">
                          <textarea
                            value={pastedSmsText}
                            onChange={(e) => setPastedSmsText(e.target.value)}
                            placeholder="Paste full M-Pesa text here"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-amber-500 h-14 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSubmitSmsForApproval(item.id)}
                              className="flex-1 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-[9px] transition cursor-pointer"
                            >
                              {isReviewMode ? 'Log Transaction' : 'Submit'}
                            </button>
                            <button
                              onClick={() => setActiveSmsInputId(null)}
                              className="px-3 py-1.5 bg-slate-800 text-slate-400 font-bold rounded-lg text-[9px] transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <h3 className="font-black text-sm text-white">
                {isReviewMode ? 'Your Active Challenges' : 'Your Active Packages'}
              </h3>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                {activeSubscriptions.length} Running
              </span>
            </div>
            
            {activeSubscriptions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center">
                <span className="text-3xl mb-3 block opacity-50">📦</span>
                <p className="text-xs text-slate-400 font-medium">No active packages. Join a tier below to start earning.</p>
              </div>
            ) : (
              activeSubscriptions.map((sub) => {
                const tier = PACKAGE_TIERS.find((t) => t.id === sub.tierId);
                if (!tier) return null;
                const isExpired = todayStr !== '' && todayStr >= sub.endDate;
                
                return (
                  <div key={sub.tierId} className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-4 space-y-4 shadow-xl relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 rounded-full ${isExpired ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    
                    <div className="flex justify-between items-center relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="text-4xl drop-shadow-md">{tier.icon}</div>
                        <div>
                          <h3 className="font-black text-base text-white">{tier.name}</h3>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Ends: {sub.endDate}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${
                        isExpired 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {isExpired ? 'Matured' : 'Active'}
                      </span>
                    </div>

                    {!isReviewMode && (
                      <div className="grid grid-cols-2 gap-2 relative z-10">
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Earned</p>
                          <p className="text-lg font-black text-white">{formatMoney(sub.accumulatedBalance)}</p>
                        </div>
                        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80">
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Daily Rate</p>
                          <p className="text-lg font-black text-emerald-400">+{formatMoney(tier.dailyLimit)}</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => handleSweepSub(sub.tierId)}
                      disabled={sub.accumulatedBalance <= 0}
                      className="w-full py-3 relative z-10 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:grayscale flex flex-col items-center justify-center"
                    >
                      <span>
                        {isReviewMode 
                          ? (isExpired ? 'Complete Goal 🎉' : 'Update Progress 🚀')
                          : (isExpired ? 'Claim & Close Package 🎉' : 'Sweep to Vault 🚀')}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-4">
            <h3 className="font-black text-sm text-white mb-3 flex items-center gap-2">
              <span className="text-emerald-400">💎</span> Available Tiers
            </h3>
            
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {PACKAGE_TIERS.map((tier) => {
                const isSubscribed = activeSubscriptions.some((s) => s.tierId === tier.id);
                const hasEnough = mainPool >= tier.entry;
                
                return (
                  <div
                    key={tier.id}
                    className={`p-3 rounded-2xl border flex justify-between items-center transition-all ${
                      isSubscribed
                        ? 'bg-slate-950/30 border-slate-800/50 opacity-60 grayscale-[50%]'
                        : 'bg-slate-950 border border-slate-800 shadow-sm hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl drop-shadow-sm">{tier.icon}</div>
                      <div>
                        <p className="font-bold text-xs text-white">{tier.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Entry: <strong className={hasEnough ? 'text-emerald-400' : 'text-rose-400'}>{formatMoney(tier.entry)}</strong> 
                          <span className="mx-1 text-slate-600">•</span> 
                          {tier.lockDays} Days
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      {!isReviewMode && (
                        <p className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          +{formatMoney(tier.dailyLimit)}/d
                        </p>
                      )}
                      {isSubscribed ? (
                        <span className="text-[9px] font-bold text-slate-500 mr-2 mt-1">
                          Joined
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSubscribeTier(tier.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[10px] transition shadow-sm mt-1"
                        >
                          Join
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

      {activeTab === 'lock' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-2xl backdrop-blur-sm">
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <span className="text-blue-400">🔒</span> Lock Savings
            </h3>
            <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl">
              <p className="text-xs text-blue-300 font-bold mb-1">Earn up to 20% APY! 🚀</p>
              <p className="text-[10px] text-slate-400">Lock your funds for a specific period. The longer you lock, the more you grow. Emergency unlocks are available (2% penalty applies).</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount to Lock (KES)</label>
              <div className="flex items-center bg-slate-950 rounded-xl border border-slate-700 p-1 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-2.5 rounded-lg border border-slate-700/50">KES</span>
                <input
                  type="number"
                  value={lockAmountInput}
                  onChange={(e) => setLockAmountInput(e.target.value)}
                  className="w-full bg-transparent px-4 py-2 text-lg text-white font-black focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unlock Date (Min 30 days)</label>
              <input
                type="date"
                value={lockDateInput}
                min={new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]}
                onChange={(e) => setLockDateInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleCreateLock}
              disabled={!lockAmountInput || !lockDateInput || mainPool < Number(lockAmountInput)}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-xl text-sm transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale"
            >
              Lock Funds
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-1">
              Available to lock: <span className="font-bold text-white">KES {mainPool.toLocaleString()}</span>
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
            <h3 className="font-bold text-sm text-white mb-3">Your Active Locks</h3>
            {activeLocks.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-4">No locked funds yet.</p>
            ) : (
              <div className="space-y-3">
                {activeLocks.map(lock => {
                  let meta: any = {};
                  try { meta = JSON.parse(lock.smsMessage || lock.sms_message || '{}'); } catch(e){}
                  const unlockDateStr = meta.unlockDate || lock.date;
                  const unlockDate = new Date(unlockDateStr);
                  const today = new Date();
                  const isMatured = today >= unlockDate;
                  
                  const start = new Date(lock.date);
                  const totalDays = Math.max(1, Math.floor((unlockDate.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                  const daysPassed = Math.max(0, Math.floor((today.getTime() - start.getTime()) / (1000 * 3600 * 24)));
                  const progress = Math.min(100, (daysPassed / totalDays) * 100);

                  return (
                    <div key={lock.id} className={`p-3 rounded-xl border ${isMatured ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-black text-white">KES {lock.amount.toLocaleString()}</p>
                          <p className="text-[9px] text-slate-400">Unlocks: {unlockDateStr}</p>
                        </div>
                        {isMatured ? (
                           <button onClick={() => handleClaimMaturedLock(lock)} className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs animate-pulse">Claim</button>
                        ) : (
                          <button onClick={() => handleEmergencyUnlock(lock)} className="px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-[10px]">Emergency Unlock</button>
                        )}
                      </div>
                      {!isMatured && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-400">
                            <span>Growing...</span>
                            <span>{Math.floor(progress)}% time elapsed</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'withdraw' && !isReviewMode && (
        <div className="space-y-3">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-5 shadow-2xl backdrop-blur-sm">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <span className="text-emerald-400">🏦</span> Withdraw
              </h3>
              <span className="text-[11px] font-black px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-sm">
                Bal: {formatMoney(mainPool)}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount to Withdraw (Min KES 50)</label>
              <div className="flex items-center bg-slate-950 rounded-xl border border-slate-700 p-1 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-2.5 rounded-lg border border-slate-700/50">KES</span>
                <input
                  type="number"
                  value={withdrawAmountInput}
                  onChange={(e) => setWithdrawAmountInput(e.target.value)}
                  className="w-full bg-transparent px-4 py-2 text-lg text-white font-black focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              onClick={handleWithdraw}
              disabled={mainPool <= 0 || parsedWithdrawAmt < 50 || parsedWithdrawAmt > mainPool || hasUnpaidLoan}
              className="w-full py-3.5 mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-sm hover:opacity-90 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-2"
            >
              {hasUnpaidLoan ? (
                <>🚫 Active Loan</>
              ) : loading ? (
                <>Processing...</>
              ) : (
                <>Request Payout</>
              )}
            </button>
            
            <p className="text-center text-[9px] text-slate-500 font-medium">
              Funds are typically disbursed within 24 hours.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'loans' && !isReviewMode && (
        <div className="space-y-3">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 space-y-4 shadow-2xl backdrop-blur-sm">
            
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <span className="text-emerald-400">💸</span> Loan Engine
              </h3>
              <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg border shadow-sm ${
                calculatedMaxLimit > 0
                  ? 'text-sky-300 bg-sky-500/10 border-sky-500/30'
                  : 'text-rose-300 bg-rose-500/10 border-rose-500/30'
              }`}>
                Limit: {calculatedMaxLimit > 0 ? `KES ${calculatedMaxLimit.toLocaleString()}` : 'Locked'}
              </span>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 shadow-inner flex flex-col items-center justify-center space-y-2 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
              
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">Your Membership Tier</p>
              <div className="flex items-center gap-3 relative z-10">
                <span className="text-emerald-400 font-black text-2xl drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">Stage {currentStage}</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-lg font-black uppercase tracking-wider border border-emerald-500/30 shadow-sm">{stageName}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium relative z-10">Keep saving & repaying to unlock higher limits.</p>
            </div>

            {activeLoan ? (
              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Loan Ref</p>
                      <p className="font-black text-sm text-white">{activeLoan.id}</p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-black rounded-lg border ${
                      (activeLoan.status === 'PENDING ADMIN APPROVAL') ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' :
                      (activeLoan.status === 'OVERDUE') ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {activeLoan.status}
                    </span>
                  </div>

                  {activeLoan.penaltyAmount && activeLoan.penaltyAmount > 0 ? (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl mb-2">
                       <p className="text-[10px] font-bold text-rose-400 mb-1">Late Payment Penalty (0.5%/day)</p>
                       <div className="flex justify-between text-xs font-bold text-slate-300">
                         <span>Base Repay:</span>
                         <span>KES {(activeLoan.baseRepay || 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs font-bold text-rose-400">
                         <span>Penalty:</span>
                         <span>+ KES {activeLoan.penaltyAmount.toLocaleString()}</span>
                       </div>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>Paid: <span className="text-emerald-400">KES {activeLoan.amountPaid.toLocaleString()}</span></span>
                      <span>Total: <span className="text-white">KES {activeLoan.totalRepay.toLocaleString()}</span></span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (activeLoan.amountPaid / activeLoan.totalRepay) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Requested</p>
                      <p className="font-bold text-white text-sm mt-0.5">KES {activeLoan.requestedAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Remaining</p>
                      <p className="font-black text-rose-400 text-sm mt-0.5">KES {(activeLoan.totalRepay - activeLoan.amountPaid).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {activeLoan.status === 'PENDING ADMIN APPROVAL' ? (
                  <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-xs text-sky-300 text-center font-bold">
                    Awaiting Treasurer Approval (24 hr).
                  </div>
                ) : activeLoan.status === 'OVERDUE' ? (
                  <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-rose-500/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                    <p className="text-xs font-bold text-rose-400">Limit increase paused. Clear arrears immediately.</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount to Pay (KES)</label>
                      <input
                        type="number"
                        value={repayAmountInput}
                        onChange={(e) => setRepayAmountInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                        placeholder={`Remaining: ${formatMoney(activeLoan.totalRepay - activeLoan.amountPaid)}`}
                      />
                    </div>
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setRepayMode('stk')}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition ${repayMode === 'stk' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        Pay via STK Push
                      </button>
                      <button
                        onClick={() => setRepayMode('sms')}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition ${repayMode === 'sms' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        Paste SMS
                      </button>
                    </div>

                    {repayMode === 'stk' ? (
                      <div className="space-y-3 pt-1">
                        <input
                          type="text"
                          value={repayPhoneInput}
                          onChange={(e) => setRepayPhoneInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-rose-500"
                          placeholder="M-Pesa Number (0712345678)"
                        />
                        <button
                          onClick={handleRepaySTK}
                          disabled={loading}
                          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black rounded-xl text-xs transition shadow-lg shadow-rose-500/20 disabled:opacity-50"
                        >
                          {loading ? 'Sending...' : 'Trigger STK Push'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <textarea
                          value={repaySmsText}
                          onChange={(e) => setRepaySmsText(e.target.value)}
                          placeholder="Paste M-Pesa SMS here..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 h-20 resize-none"
                        />
                        <button
                          onClick={handleRepaySMS}
                          className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black rounded-xl text-xs transition shadow-lg shadow-rose-500/20"
                        >
                          Submit SMS
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount to Pay (KES)</label>
                      <input
                        type="number"
                        value={repayAmountInput}
                        onChange={(e) => setRepayAmountInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                        placeholder={`Remaining: ${formatMoney(activeLoan.totalRepay - activeLoan.amountPaid)}`}
                      />
                    </div>
                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={() => setRepayMode('stk')}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition ${repayMode === 'stk' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        STK Push
                      </button>
                      <button
                        onClick={() => setRepayMode('sms')}
                        className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition ${repayMode === 'sms' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500'}`}
                      >
                        Paste SMS
                      </button>
                    </div>

                    {repayMode === 'stk' ? (
                      <div className="space-y-3 pt-1">
                        <input
                          type="text"
                          value={repayPhoneInput}
                          onChange={(e) => setRepayPhoneInput(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                          placeholder="M-Pesa Number (0712345678)"
                        />
                        <button
                          onClick={handleRepaySTK}
                          disabled={loading}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                        >
                          {loading ? 'Sending...' : 'Trigger STK Push'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1">
                        <textarea
                          value={repaySmsText}
                          onChange={(e) => setRepaySmsText(e.target.value)}
                          placeholder="Paste M-Pesa SMS here..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500 h-20 resize-none"
                        />
                        <button
                          onClick={handleRepaySMS}
                          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-xs transition shadow-lg shadow-emerald-500/20"
                        >
                          Submit SMS
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {!isEligibleForNewLoan ? (
                  <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl text-center space-y-3 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full"></div>
                    <div className="text-3xl mb-1 relative z-10">🚀</div>
                    <p className="text-sm font-bold text-slate-200 relative z-10">Building Your Credit</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium relative z-10">
                      Keep saving and checking in. Your borrowing power unlocks automatically as your vault grows.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Loan Amount (KES)</label>
                      <div className="flex items-center bg-slate-950 rounded-xl border border-slate-700 p-1 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <span className="text-xs font-bold text-slate-400 bg-slate-800 px-3 py-2.5 rounded-lg border border-slate-700/50">KES</span>
                        <input
                          type="number"
                          value={loanAmountInput}
                          onChange={(e) => setLoanAmountInput(e.target.value)}
                          className="w-full bg-transparent px-4 py-2 text-lg text-white font-black focus:outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Repayment Term</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { weeks: 1 },
                          { weeks: 2 },
                          { weeks: 4 },
                        ].map((term) => (
                          <button
                            key={term.weeks}
                            onClick={() => setLoanTermWeeks(term.weeks)}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              loanTermWeeks === term.weeks
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                                : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                            }`}
                          >
                            {term.weeks}W
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center mt-2">
                      <span className="text-xs font-bold text-slate-400">Total Repay:</span>
                      <span className="text-sm font-black text-emerald-400">KES {totalLoanRepay.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={handleApplyLoan}
                      disabled={parsedLoanAmt <= 0 || parsedLoanAmt > calculatedMaxLimit}
                      className="w-full py-3.5 mt-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-xl text-sm hover:opacity-90 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:grayscale"
                    >
                      Submit Request
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!isReviewMode && (
        <PushNotificationManager userPhone={user.phone} />
      )}
    </div>
  );
}