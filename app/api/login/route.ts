import { sql } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { phone, pin } = await req.json();

    if (!phone || !pin) {
      return Response.json({ error: 'Missing phone or PIN' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    
    // Fetch the role along with the id and pin
    const [member] = await sql`select id, pin, role from members where phone = ${cleanPhone}`;

    if (!member) {
      return Response.json({ error: 'Phone number not found' }, { status: 404 });
    }

    if (member.pin !== pin) {
      return Response.json({ error: 'Incorrect PIN' }, { status: 401 });
    }

    await createSession(member.id);
    
    // Return the role so the frontend knows where to redirect
    return Response.json({ ok: true, role: member.role || 'member' });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Database connection error' }, { status: 500 });
  }
}