import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Security Check
  const treasurerId = await getSession();
  if (!treasurerId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [treasurer] = await sql`select role from members where id = ${treasurerId}`;
  if (treasurer?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  // 2. Get the memberId from the URL
  const { searchParams } = new URL(req.url);
  const memberId = searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'Member ID required' }, { status: 400 });

  // 3. Fetch Member Info
  const [member] = await sql`select name, phone, join_date from members where id = ${memberId}`;
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  // 4. Fetch all their transactions
  const savings = await sql`select amount, code, created_at from savings where member_id = ${memberId} and status = 'confirmed' order by created_at asc`;
  const loans = await sql`select amount, repay_total, status, created_at from loans where member_id = ${memberId} order by created_at asc`;
  const repayments = await sql`select amount, code, paid_at as created_at from repayments where loan_id in (select id from loans where member_id = ${memberId}) order by paid_at asc`;

  // 5. Build the CSV string
  let csv = `GrowPesa Ledger\n`;
  csv += `Member,${member.name}\n`;
  csv += `Phone,${member.phone}\n`;
  csv += `Joined,${new Date(member.join_date).toDateString()}\n\n`;

  csv += `Type,Date,Amount (KSh),Status/Code\n`;

  // Add Savings
  savings.forEach(s => {
    csv += `Savings,${new Date(s.created_at).toLocaleDateString()},${s.amount},${s.code || 'Manual'}\n`;
  });

  // Add Loans
  loans.forEach(l => {
    csv += `Loan Taken,${new Date(l.created_at).toLocaleDateString()},${l.amount},${l.status}\n`;
  });

  // Add Repayments
  repayments.forEach(r => {
    csv += `Loan Repayment,${new Date(r.created_at).toLocaleDateString()},${r.amount},${r.code || 'Manual'}\n`;
  });

  // 6. Return the file
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${member.name.replace(/\s+/g, '_')}_Ledger.csv"`,
    },
  });
}