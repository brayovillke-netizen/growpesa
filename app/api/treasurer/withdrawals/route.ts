import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET pending and approved withdrawals for the Treasurer
export async function GET() {
  const treasurerId = await getSession();
  if (!treasurerId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [treasurer] = await sql`select role from members where id = ${treasurerId}`;
  if (treasurer?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const withdrawals = await sql`
    select w.id, w.amount, w.status, w.created_at, m.name, m.phone
    from withdrawals w
    join members m on m.id = w.member_id
    where w.status in ('pending', 'approved')
    order by w.created_at asc
  `;

  return Response.json({ withdrawals });
}

// POST to update status (Approve or Complete)
export async function POST(req: Request) {
  const treasurerId = await getSession();
  if (!treasurerId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [treasurer] = await sql`select role from members where id = ${treasurerId}`;
  if (treasurer?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const { withdrawalId, action } = await req.json();

  try {
    if (action === 'approve') {
      await sql`
        update withdrawals set status = 'approved', approved_at = now() 
        where id = ${withdrawalId} and status = 'pending'
      `;
    } else if (action === 'complete') {
      // 1. Mark as completed
      const [w] = await sql`
        update withdrawals set status = 'completed', completed_at = now() 
        where id = ${withdrawalId} and status = 'approved'
        returning member_id, amount
      `;

      // 2. Deduct the withdrawal amount from their savings ledger
      if (w) {
        await sql`
          insert into savings (member_id, amount, week_date, kind, status)
          values (${w.member_id}, ${-w.amount}, current_date, 'withdrawal', 'confirmed')
        `;
      }
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Failed to update withdrawal' }, { status: 500 });
  }
}