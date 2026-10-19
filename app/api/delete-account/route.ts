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

    // 2. Safely format the new phone string in JavaScript
    const deletedSuffix = `_deleted_${Date.now()}`;
    
    // 3. Update the member status to 'deleted'
    await sql`
      update members 
      set status = 'deleted', phone = concat(phone, ${deletedSuffix}) 
      where id = ${memberId}
    `;

    // 4. Clear their session cookie
    cookies().set('growpesa_session', '', { maxAge: 0, path: '/' });

    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('Delete Error:', e);
    return Response.json({ error: e.message || 'Failed to delete account' }, { status: 500 });
  }
}