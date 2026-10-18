import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, code } = await req.json();

  if (!amount || amount <= 0) return Response.json({ error: 'Enter a valid amount' }, { status: 400 });
  if (!code || code.length < 5) return Response.json({ error: 'Enter a valid M-Pesa code' }, { status: 400 });

  try {
    // Insert as 'pending' so the treasurer has to check the code
    await sql`
      insert into savings (member_id, amount, week_date, code, status)
      values (${memberId}, ${amount}, current_date, ${code.toUpperCase()}, 'pending')
    `;

    return Response.json({ ok: true });
  } catch (e: any) {
    if (e.code === '23505') return Response.json({ error: 'This M-Pesa code has already been used' }, { status: 400 });
    return Response.json({ error: 'Failed to save' }, { status: 500 });
  }
}