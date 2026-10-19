import { sql } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return Response.json({ error: 'Missing phone or PIN' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const [member] = await sql`select id, pin from members where phone = ${cleanPhone}`;

    if (!member) {
      return Response.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Check if the PIN matches
    if (member.pin !== pin) {
      return Response.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    await createSession(member.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Database connection error' }, { status: 500 });
  }
}