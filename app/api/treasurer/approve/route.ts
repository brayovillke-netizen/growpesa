import { sql } from '@/lib/db';

export async function POST(req: Request) {
  const { loanId } = await req.json();

  if (!loanId) return Response.json({ error: 'Missing loan ID' }, { status: 400 });

  try {
    await sql`
      update loans 
      set status = 'accepted' 
      where id = ${loanId} and status = 'asked'
    `;
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Failed to approve' }, { status: 500 });
  }
}