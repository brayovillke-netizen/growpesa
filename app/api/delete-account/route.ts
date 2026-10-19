import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Prevent the Treasurer from deleting their own account
    const [member] = await sql`select role, phone from members where id = ${memberId}`;
    if (member?.role === 'treasurer') {
      return Response.json({ error: 'The Treasurer cannot delete their own account.' }, { status: 403 });
    }

    // 2. Create the new phone number in JavaScript to avoid Postgres concat() errors
    const timestamp = Date.now();
    const newPhone = `${member.phone}_deleted_${timestamp}`;
    
    // 3. Soft delete the account
    await sql`
      update members 
      set status = 'deleted', phone = ${newPhone} 
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