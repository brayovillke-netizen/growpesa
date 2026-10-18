import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [member] = await sql`select role from members where id = ${memberId}`;
  if (member?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const [savings] = await sql`select coalesce(sum(amount), 0) as total from savings where status = 'confirmed'`;
  const [loansOut] = await sql`select coalesce(sum(repay_total - paid), 0) as total from loans where status in ('accepted', 'paid_out')`;
  
  const requests = await sql`
    select l.id, l.amount, l.weeks, l.reason, m.name, m.phone
    from loans l join members m on m.id = l.member_id
    where l.status = 'asked' order by l.created_at asc
  `;
  const pendingSavings = await sql`
    select s.id, s.amount, s.code, m.name
    from savings s join members m on m.id = s.member_id
    where s.status = 'pending' order by s.created_at asc
  `;
  const awaitingPayout = await sql`
    select l.id, l.amount, l.payout, m.name, m.phone
    from loans l join members m on m.id = l.member_id
    where l.status = 'accepted' order by l.created_at asc
  `;

  const totalPool = Number(savings.total) + Number(loansOut.total);

  return Response.json({
    pool: totalPool,
    cashOut: Number(loansOut.total),
    requests,
    pendingSavings,
    awaitingPayout
  });
}