import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Get code
  const [member] = await sql`select referral_code from members where id = ${memberId}`;
  
  // Get invited count
  const [invites] = await sql`select count(*) as count from referrals where referrer_id = ${memberId}`;
  
  // Get total earned from referrals (kind = 'referral')
  const [earned] = await sql`
    select coalesce(sum(amount), 0) as total 
    from savings 
    where member_id = ${memberId} and kind = 'referral'
  `;

  return Response.json({
    code: member.referral_code,
    invites: Number(invites.count),
    earned: Number(earned.total)
  });
}