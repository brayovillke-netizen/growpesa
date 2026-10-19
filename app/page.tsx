import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { sundaysSince, sundaysToShareout } from '@/lib/rules';
import LogoutButton from './components/LogoutButton'; // <-- Added Logout Import

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

  const [member] = await sql`select name, join_date from members where id = ${memberId}`;
  
  const [savingsData] = await sql`
    select coalesce(sum(amount), 0) as total 
    from savings where member_id = ${memberId} and status = 'confirmed'
  `;

  const [loan] = await sql`
    select id, repay_total, paid 
    from loans where member_id = ${memberId} and status in ('accepted', 'paid_out')
    limit 1
  `;

  const settingsRows = await sql`select key, value from settings`;
  const settings: any = {};
  settingsRows.forEach(r => settings[r.key] = r.value);

  const weeklyGoal = settings.weekly_goal || 100;
  const borrowLimitPct = settings.borrow_limit_pct || 25;
  const shareoutDate = settings.shareout_date || '2026-12-27';

  const saved = Number(savingsData.total);
  const sundays = sundaysSince(member.join_date);
  
  const goal = sundays * weeklyGoal;
  const behind = Math.max(0, goal - saved);
  const limit = Math.floor(saved * (borrowLimitPct / 100));
  const weeksLeft = sundaysToShareout();

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      
      {/* HEADER WITH LOGOUT BUTTON */}
      <header className="bg-white px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Logo" width={32} height={32} />
          <span className="font-semibold text-green-deep text-lg">GrowPesa</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-500">Hi, {member.name.split(' ')[0]}</span>
          <LogoutButton />
        </div>
      </header>

      <div className="max-w-md mx-auto p-6 space-y-6">
        
        {loan && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center shadow-sm">
            <div>
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Active Loan</p>
              <p className="text-lg font-bold text-gray-900">KSh {(loan.repay_total - loan.paid).toLocaleString()} owed</p>
            </div>
            <Link href="/loan/status" className="bg-amber-warm text-white px-4 py-2 rounded-lg text-sm font-semibold">
              View
            </Link>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500 font-medium mb-1">Total Saved</p>
          <h2 className="text-3xl font-bold text-gray-900">KSh {saved.toLocaleString()}</h2>
          
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Weekly Goal</p>
              <p className="font-semibold text-gray-700">KSh {goal.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Status</p>
              {behind > 0 ? (
                <p className="font-semibold text-red-500 text-sm">Behind KSh {behind.toLocaleString()}</p>
              ) : (
                <p className="font-semibold text-green-600 text-sm">On Track</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">You can borrow up to</p>
            <h2 className="text-2xl font-bold text-gray-900">KSh {limit.toLocaleString()}</h2>
          </div>
          {!loan && (
            <Link href="/loan" className="bg-amber-warm text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-amber-600 transition">
              Ask
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/savings" className="bg-green-deep text-white py-4 rounded-xl font-semibold shadow-sm flex justify-center items-center gap-2 hover:bg-green-800 transition">
            Pay Savings
          </Link>
          <Link href="/loan/status" className="bg-white text-gray-700 border border-gray-200 py-4 rounded-xl font-semibold shadow-sm flex justify-center items-center hover:bg-gray-50 transition">
            Loan Status
          </Link>
        </div>

        <Link href="/referral" className="bg-amber-50 text-amber-warm border border-amber-200 py-4 rounded-xl font-semibold flex justify-center items-center shadow-sm hover:bg-amber-100 transition">
          Refer a Friend & Earn KSh 3
        </Link>

        <div className="text-center pt-4">
          <p className="text-sm text-gray-500 font-medium">
            Share-out in <span className="text-amber-warm font-bold">{weeksLeft} Sundays</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{shareoutDate}</p>
        </div>
      </div>
    </main>
  );
}