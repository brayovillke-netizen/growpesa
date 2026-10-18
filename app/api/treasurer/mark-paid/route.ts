import { sql } from '@/lib/db';

export async function POST(req: Request) {
  const { loanId } = await req.json();

  if (!loanId) return Response.json({ error: 'Missing ID' }, { status: 400 });

  try {
    // Change status from 'accepted' to 'paid_out'
    await sql`
      update loans 
      set status = 'paid_out', sent_at = now()
      where id = ${loanId} and status = 'accepted'
    `;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Failed to update' }, { status: 500 });
  }
}