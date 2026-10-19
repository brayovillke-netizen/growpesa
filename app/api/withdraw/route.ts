import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount } = await req.json();
  if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

  try {
    // 1. Get Total Savings (only confirmed)
    const [savingsData] = await sql`
      select coalesce(sum(amount), 0) as total 
      from savings where member_id = ${memberId} and status = 'confirmed'
    `;
    const totalSaved = Number(savingsData.total);

    // 2. Get Total Locked Savings (where lock_until is in the future)
    const [lockedData] = await sql`
      select coalesce(sum(amount), 0) as locked 
      from savings where member_id = ${memberId} and lock_until > current_date
    `;
    const lockedAmount = Number(lockedData.locked);

    // 3. Get Active Loan Debt
    const [loanData] = await sql`
      select coalesce(sum(repay_total - paid), 0) as debt 
      from loans where member_id = ${memberId} and status in ('accepted', 'paid_out')
    `;
    const debt = Number(loanData.debt);

    // 4. Calculate Available Balance
    const available = totalSaved - lockedAmount - debt;

    if (amount > available) {
      return Response.json({ error: `Insufficient available funds. You can only withdraw up to KSh ${available}. (Locked: ${lockedAmount}, Debt: ${debt})` }, { status: 400 });
    }

    // 5. Create the pending withdrawal request
    await sql`
      insert into withdrawals (member_id, amount, status)
      values (${memberId}, ${amount}, 'pending')
    `;

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}