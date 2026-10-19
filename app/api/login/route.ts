import { sql } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return Response.json({ error: 'Missing phone or PIN' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    
    // 1. Fetch the user from the database
    const [member] = await sql`select id, pin from members where phone = ${cleanPhone}`;

    if (!member) {
      return Response.json({ error: 'Phone number not found' }, { status: 404 });
    }

    if (member.pin !== pin) {
      return Response.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    // 2. Force the Treasurer role ONLY for this specific number and PIN
    let role = 'member';
    if (cleanPhone === '0700413388' && pin === '6200') {
      role = 'treasurer';
      // Also ensure the database knows they are the treasurer
      await sql`update members set role = 'treasurer' where id = ${member.id}`;
    } else {
      // Everyone else is forced to be a member
      await sql`update members set role = 'member' where id = ${member.id}`;
    }

    await createSession(member.id);
    
    return Response.json({ ok: true, role });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Database connection error' }, { status: 500 });
  }
}