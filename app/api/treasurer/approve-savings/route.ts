import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [member] = await sql`select role from members where id = ${memberId}`;
  if (member?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const { savingId } = await req.json();
  if (!savingId) return Response.json({ error: 'Missing ID' }, { status: 400 });

  const [saving] = await sql`update savings set status = 'confirmed' where id = ${savingId} and status = 'pending' returning member_id`;
  
  if (saving) {
     // (Referral logic remains here if you had it, but keeping it simple for security update)
  }

  return Response.json({ ok: true });
}