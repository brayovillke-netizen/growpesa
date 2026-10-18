import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, code } = await req.json();
  if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

  try {
    // Find active loan
    const [loan] = await sql`
      select id, repay_total, paid from loans 
      where member_id = ${memberId} and status in ('accepted', 'paid_out')
      limit 1
    `;

    if (!loan) return Response.json({ error: 'No active loan found' }, { status: 400 });

    // Save repayment
    await sql`
      insert into repayments (loan_id, amount, code)
      values (${loan.id}, ${amount}, ${code || 'MANUAL'})
    `;

    // Update loan paid amount
    const newPaid = loan.paid + amount;
    const isClosed = newPaid >= loan.repay_total;

    await sql`
      update loans 
      set paid = ${newPaid}, status = ${isClosed ? 'closed' : 'paid_out'}
      where id = ${loan.id}
    `;

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}