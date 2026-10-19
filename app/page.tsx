import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { sundaysSince, sundaysToShareout } from '@/lib/rules';
import { redirect } from 'next/navigation';
import BottomNav from './components/BottomNav';
import PWAInstall from './components/PWAInstall';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const memberId = await getSession();

  if (!memberId) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <img src="/logo.svg" alt="GrowPesa" width={88} height={88} />
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-green-deep">
          Grow<span className="text-amber-warm">Pesa</span>
        </h1>
        <p className="mt-3 text-base text-gray-600">Save weekly. Borrow when ready.</p>
        
        <div className="mt-8 flex flex-col gap-3 w-full max-w-xs">
          <Link href="/join" className="bg-green-deep text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-800 transition">
            Join the Group
          </Link>
          <Link href="/login" className="bg-white text-green-deep border-2 border-green-deep px-6 py-3 rounded-xl font-semibold hover:bg-green-50 transition">
            Log In (Existing Member)
          </Link>
        </div>
      </main>
    );
  }

  const [member] = await sql`select name, join_date, role, status from members where id = ${memberId}`;

  if (member?.role === 'treasurer') redirect('/treasurer');
  if (member?.status === 'deleted') redirect('/api/logout');

  const [savingsData] = await sql`
    select coalesce(sum(amount), 0) as total 
    from savings where member_id = ${memberId} and status = 'confirmed'
  `;

  const [loan] = await sql`
    select id, repay_total, paid 
    from loans where member_id = ${memberId} and status in ('accepted', 'paid_out')
    limit 1
  `;

  // FETCH PENDING WITHDRAWALS FOR FEEDBACK
  const pendingWithdrawals = await sql`
    select amount, status from withdrawals 
    where member_id = ${memberId} and status in ('pending', 'approved')
  `;

  const recentActivity = await sql`
    (
      SELECT 'Savings' as type, amount, created_at, status 
      FROM savings WHERE member_id = ${memberId} AND status = 'confirmed' AND kind != 'withdrawal'
    )
    UNION ALL
    (
      SELECT 'Loan' as type, amount, created_at, status 
      FROM loans WHERE member_id = ${memberId} AND status != 'asked'
    )
    UNION ALL
    (
      SELECT 'Repayment' as type, amount, paid_at as created_at, 'paid' as status 
      FROM repayments WHERE loan_id IN (SELECT id FROM loans WHERE member_id = ${memberId})
    )
    UNION ALL
    (
      SELECT 'Withdrawal' as type, amount, completed_at as created_at, 'completed' as status 
      FROM withdrawals WHERE member_id = ${memberId} AND status = 'completed'
    )
    ORDER BY created_at DESC
    LIMIT 3
  `;

  const settingsRows = await sql`select key, value from settings`;
  const settings: any = {};
  settingsRows.forEach(r => settings[r.key] = r.value);

  const weeklyGoal = settings.weekly_goal || 100;
  const borrowLimitPct = settings.borrow_limit_pct || 25;
  const dividendRate = settings.dividend_rate || 1;

  const saved = Number(savingsData.total);
  const sundays = sundaysSince(member.join_date);
  const monthsInGroup = Math.max(1, Math.floor(sundays / 4)); 
  
  const projectedGrowth = Math.floor(saved * (dividendRate / 100) * monthsInGroup);
  const totalWithGrowth = saved + projectedGrowth;

  const goal = sundays * weeklyGoal;
  const behind = Math.max(0, goal - saved);
  const limit = Math.floor(saved * (borrowLimitPct / 100));
  const weeksLeft = sundaysToShareout();
  
  const formattedShareoutDate = String(settings.shareout_date || '2026-12-27').replace(/"/g, '');

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      
      <header className="bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" width={28} height={28} />
          <span className="font-bold text-green-deep text-lg">GrowPesa</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Hi, {member.name.split(' ')[0]}</span>
          <Link href="/profile" className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
            {member.name.charAt(0)}
          </Link>
        </div>
      </header>

      <div className="max-w-md mx-auto p-5 space-y-6">
        
        {/* WITHDRAWAL FEEDBACK BANNER */}
        {pendingWithdrawals.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-sm font-bold text-blue-900">Withdrawal Pending</p>
              <p className="text-xs text-blue-700 mt-1">
                {pendingWithdrawals[0].status === 'approved' 
                  ? 'Approved! Processing payout via M-Pesa.' 
                  : 'Waiting for Treasurer approval.'}
              </p>
            </div>
            <p className="font-bold text-blue-900">KSh {Number(pendingWithdrawals[0].amount).toLocaleString()}</p>
          </div>
        )}

        {/* Green Summary Card */}
        <div className="bg-green-deep rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-sm font-medium opacity-90 mb-1">My Savings</p>
            <h2 className="text-4xl font-bold mb-4">KSh {saved.toLocaleString()}</h2>
            
            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs opacity-80">Weekly Goal: KSh {weeklyGoal}</p>
                {behind > 0 ? (
                  <p className="text-xs text-red-300 font-semibold mt-1">Behind KSh {behind.toLocaleString()}</p>
                ) : (
                  <p className="text-xs text-green-300 font-semibold mt-1">On Track</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Link href="/savings" className="bg-white text-green-deep px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition text-center">
                  Save Now
                </Link>
                <Link href="/withdraw" className="bg-green-800 text-white border border-green-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-green-900 transition text-center">
                  Withdraw
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
        </div>

        {/* Growth / Dividend Card */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-5 shadow-sm border border-amber-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-amber-900">Your Money is Growing 🌱</p>
            <p className="text-xs text-amber-700 mt-1">
              Earning <strong>{dividendRate}%</strong> monthly. 
            </p>
            <p className="text-xs font-semibold text-green-700 mt-1">
              + KSh {projectedGrowth.toLocaleString()} in dividends!
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">Projected Value</p>
            <p className="text-xl font-bold text-amber-900">KSh {totalWithGrowth.toLocaleString()}</p>
          </div>
        </div>

        {/* Two Column Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium mb-1">Active Loan</p>
            <p className="text-lg font-bold text-gray-900">
              {loan ? `KSh ${(loan.repay_total - loan.paid).toLocaleString()}` : 'KSh 0'}
            </p>
            <Link href="/loan/status" className="text-xs text-amber-warm font-semibold mt-2 block">
              {loan ? 'View Loan' : 'Apply for Loan'}
            </Link>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium mb-1">Borrow Limit</p>
            <p className="text-lg font-bold text-gray-900">KSh {limit.toLocaleString()}</p>
            {!loan && (
              <Link href="/loan" className="text-xs text-green-deep font-semibold mt-2 block">
                Ask for Loan
              </Link>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            <Link href="/savings" className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center mb-2 text-green-deep">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </div>
              <span className="text-[10px] font-medium text-gray-700">Save</span>
            </Link>
            <Link href="/loan" className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center mb-2 text-amber-warm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-[10px] font-medium text-gray-700">Loans</span>
            </Link>
            <Link href="/referral" className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mb-2 text-purple-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <span className="text-[10px] font-medium text-gray-700">Referrals</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <span className="text-[10px] font-medium text-gray-700">Profile</span>
            </Link>
          </div>
        </div>

        {/* Latest Activity Feed */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-800">Latest Activity</h3>
            <Link href="/history" className="text-xs text-green-deep font-semibold hover:underline">See All</Link>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {recentActivity.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No activity yet.</div>
            ) : (
              recentActivity.map((act, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      act.type === 'Savings' ? 'bg-green-50 text-green-600' : 
                      act.type === 'Loan' ? 'bg-amber-50 text-amber-warm' : 
                      act.type === 'Withdrawal' ? 'bg-red-50 text-red-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {act.type === 'Savings' ? '↓' : act.type === 'Loan' ? '↑' : act.type === 'Withdrawal' ? '↗' : '✓'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{act.type}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(act.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold ${act.type === 'Withdrawal' ? 'text-red-500' : 'text-gray-900'}`}>
                    KSh {Number(act.amount).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Shareout Countdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Next Share-out</p>
            <p className="font-bold text-gray-900">{formattedShareoutDate}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-amber-warm bg-amber-50 px-3 py-1 rounded-full">
              {weeksLeft} Sundays left
            </p>
          </div>
        </div>

      </div>

      <BottomNav />
      <PWAInstall />
    </main>
  );
}