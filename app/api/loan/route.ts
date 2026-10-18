import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getQuote } from '@/lib/loan';

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, weeks, reason } = await req.json();

  if (!amount || !weeks) return Response.json({ error: 'Missing fields' }, { status: 400 });

  try {
    const openLoans = await sql`
      select id from loans 
      where member_id = ${memberId} and status in ('asked','approved','accepted','paid_out')
    `;
    if (openLoans.length > 0) return Response.json({ error: 'You already have an open loan' }, { status: 400 });

    // FETCH SETTINGS FROM DATABASE
    const settingsRows = await sql`select key, value from settings`;
    const settings: any = {};
    settingsRows.forEach(r => settings[r.key] = r.value);
    const borrowLimitPct = settings.borrow_limit_pct || 25;

    const [savingsData] = await sql`
      select coalesce(sum(amount), 0) as total from savings 
      where member_id = ${memberId} and status = 'confirmed'
    `;
    const saved = Number(savingsData.total);
    const limit = Math.floor(saved * (borrowLimitPct / 100));

    if (amount > limit) return Response.json({ error: `Max loan is KSh ${limit}` }, { status: 400 });

    const quote = getQuote(amount, weeks);

    await sql`
      insert into loans (
        member_id, amount, weeks, rate_pct, fee, payout, interest, repay_total, due_date, status, reason
      ) values (
        ${memberId}, ${quote.amount}, ${weeks}, ${quote.rate}, ${quote.fee}, ${quote.payout}, ${quote.interest}, ${quote.repayTotal}, ${quote.dueDate}, 'asked', ${reason || null}
      )
    `;

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}