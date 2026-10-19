import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [treasurer] = await sql`select role from members where id = ${memberId}`;
  if (treasurer?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  // Fetch all active members (excluding the treasurer)
  const members = await sql`
    select id, name, phone 
    from members 
    where status = 'active' and role != 'treasurer'
    order by name asc
  `;

  return Response.json({ members });
}