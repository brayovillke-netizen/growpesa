import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Prevent the Treasurer from deleting their own account
    const [member] = await sql`select role from members where id = ${memberId}`;
    if (member?.role === 'treasurer') {
      return Response.json({ error: 'The Treasurer cannot delete their own account.' }, { status: 403 });
    }

    // 2. Soft delete the account. 
    // We append '_deleted_[timestamp]' to the phone so that if they ever want to rejoin, 
    // they can use their original number again.
    const timestamp = Date.now();
    
    await sql`
      update members 
      set status = 'deleted', phone = concat(phone, '_deleted_', ${timestamp}) 
      where id = ${memberId}
    `;

    // 3. Clear their session cookie
    cookies().set('growpesa_session', '', { maxAge: 0, path: '/' });

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('Delete Error:', e);
    // Return the actual database error so we can see it on the screen
    return Response.json({ error: e.message || 'Failed to delete account' }, { status: 500 });
  }
}