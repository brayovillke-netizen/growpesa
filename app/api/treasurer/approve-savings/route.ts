import { sql } from '@/lib/db';

export async function POST(req: Request) {
  const { savingId } = await req.json();

  if (!savingId) return Response.json({ error: 'Missing ID' }, { status: 400 });

  try {
    // 1. Mark savings as confirmed
    const [saving] = await sql`
      update savings set status = 'confirmed' 
      where id = ${savingId} and status = 'pending'
      returning member_id, amount
    `;

    if (!saving) return Response.json({ error: 'Not found or already confirmed' }, { status: 404 });

    // 2. Check if this member just hit KSh 100 for the first time (Referral Trigger)
    const [member] = await sql`select referrer_id from members where id = ${saving.member_id}`;
    
    if (member?.referrer_id) {
      const [savingsData] = await sql`
        select coalesce(sum(amount), 0) as total 
        from savings where member_id = ${saving.member_id} and status = 'confirmed'
      `;
      
      if (Number(savingsData.total) >= 100) {
        // Check if this referral hasn't been paid yet
        const [referral] = await sql`
          select id, credited_at from referrals 
          where referrer_id = ${member.referrer_id} and invited_id = ${saving.member_id}
        `;

        if (referral && !referral.credited_at) {
          // Pay the referrer KSh 3
          await sql`
            insert into savings (member_id, amount, week_date, kind, status)
            values (${member.referrer_id}, 3, current_date, 'referral', 'confirmed')
          `;
          await sql`update referrals set credited_at = now() where id = ${referral.id}`;
        }
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Database error' }, { status: 500 });
  }
}