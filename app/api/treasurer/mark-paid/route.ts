import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [member] = await sql`select role from members where id = ${memberId}`;
  if (member?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const { loanId } = await req.json();
  if (!loanId) return Response.json({ error: 'Missing ID' }, { status: 400 });

  await sql`update loans set status = 'paid_out', sent_at = now() where id = ${loanId} and status = 'accepted'`;
  return Response.json({ ok: true });
}