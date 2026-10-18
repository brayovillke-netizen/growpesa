import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [loan] = await sql`
    select id, amount, paid, repay_total, due_date, status
    from loans
    where member_id = ${memberId} and status in ('accepted', 'paid_out')
    limit 1
  `;

  return Response.json({ loan: loan || null });
}