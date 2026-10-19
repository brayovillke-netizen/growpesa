import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

export async function POST(req: Request) {
  const treasurerId = await getSession();
  if (!treasurerId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [treasurer] = await sql`select role from members where id = ${treasurerId}`;
  if (treasurer?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const { withdrawalId, action } = await req.json();
  const id = Number(withdrawalId);

  try {
    if (action === 'approve') {
      await sql`
        update withdrawals set status = 'approved', approved_at = now() 
        where id = ${id} and status = 'pending'
      `;
    } else if (action === 'complete') {
      await sql.begin(async (tx) => {
        const [w] = await tx`
          update withdrawals set status = 'completed', completed_at = now() 
          where id = ${id} and status = 'approved'
          returning member_id, amount
        `;

        if (!w) throw new Error("Withdrawal not found or already completed");

        // Force the amount to be a negative number
        const deduction = Number(w.amount) * -1;
        
        await tx`
          insert into savings (member_id, amount, week_date, kind, status)
          values (${Number(w.member_id)}, ${deduction}, current_date, 'withdrawal', 'confirmed')
        `;
      });
    }
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: e.message || 'Failed to update withdrawal' }, { status: 500 });
  }
}