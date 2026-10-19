import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const history = await sql`
    (
      SELECT 'Savings' as type, amount, created_at, status, code 
      FROM savings WHERE member_id = ${memberId} AND status = 'confirmed'
    )
    UNION ALL
    (
      SELECT 'Loan Taken' as type, amount, created_at, status, null as code 
      FROM loans WHERE member_id = ${memberId} AND status != 'asked'
    )
    UNION ALL
    (
      SELECT 'Repayment' as type, amount, paid_at as created_at, 'paid' as status, code 
      FROM repayments WHERE loan_id IN (SELECT id FROM loans WHERE member_id = ${memberId})
    )
    ORDER BY created_at DESC
  `;

  return Response.json({ history });
}