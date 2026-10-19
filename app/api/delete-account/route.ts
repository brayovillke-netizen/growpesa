import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Soft delete: We set status to 'deleted' so their financial history remains intact for the group ledger,
    // but they disappear from the active member list, loans, and share-outs.
    await sql`
      update members 
      set status = 'deleted', phone = concat(phone, '_deleted_', extract(epoch from now())) 
      where id = ${memberId}
    `;

    // Clear their session cookie so they are logged out
    cookies().set('growpesa_session', '', { maxAge: 0, path: '/' });

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}