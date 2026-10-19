import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Get all members (EXCLUDING the treasurer)
  const members = await sql`
    select id, name, phone 
    from members 
    where status = 'active' and role != 'treasurer'
  `;

  const shareoutList = [];

  for (const member of members) {
    // 2. Get total confirmed savings
    const [savingsData] = await sql`
      select coalesce(sum(amount), 0) as total 
      from savings where member_id = ${member.id} and status = 'confirmed'
    `;
    const saved = Number(savingsData.total);

    // 3. Get total loan debt
    const [loanData] = await sql`
      select coalesce(sum(repay_total - paid), 0) as total 
      from loans where member_id = ${member.id} and status in ('accepted', 'paid_out')
    `;
    const debt = Number(loanData.total);

    // 4. Calculate Base, Fee (5%), and Net Payout
    const base = Math.max(0, saved - debt);
    const fee = Math.round(base * 0.05);
    const net = base - fee;

    shareoutList.push({
      id: member.id,
      name: member.name,
      phone: member.phone,
      saved,
      debt,
      fee,
      net
    });
  }

  // Sort alphabetically by name
  shareoutList.sort((a, b) => a.name.localeCompare(b.name));

  return Response.json({ shareoutList });
}