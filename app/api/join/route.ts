import { sql } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: Request) {
  const { name, phone, is18, referralCode, pin } = await req.json();

  if (!name || !phone || !is18 || !pin) {
    return Response.json({ error: 'Missing fields or under 18' }, { status: 400 });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const suffix = Math.floor(10 + Math.random() * 90);
  const newCode = `GP-${prefix}${suffix}`;

  try {
    const existing = await sql`select id from members where phone = ${cleanPhone}`;
    if (existing.length > 0) return Response.json({ error: 'Phone already registered. Please Log In.' }, { status: 400 });

    let referrerId = null;
    if (referralCode) {
      const ref = await sql`select id from members where referral_code = ${referralCode}`;
      if (ref.length > 0) referrerId = ref[0].id;
    }

    const [member] = await sql`
      insert into members (name, phone, is_18, referral_code, referrer_id, pin)
      values (${name}, ${cleanPhone}, ${is18}, ${newCode}, ${referrerId}, ${pin})
      returning id
    `;

    if (referrerId) {
      await sql`insert into referrals (referrer_id, invited_id) values (${referrerId}, ${member.id})`;
    }

    await createSession(member.id);
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}