import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [member] = await sql`select role from members where id = ${memberId}`;
  if (member?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const rows = await sql`select key, value from settings`;
  const settings: any = {};
  
  rows.forEach(r => { 
    try {
      // Safely parse the jsonb value
      settings[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
    } catch {
      settings[r.key] = r.value;
    }
  });
  
  return Response.json(settings);
}

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [member] = await sql`select role from members where id = ${memberId}`;
  if (member?.role !== 'treasurer') return Response.json({ error: 'Access Denied' }, { status: 403 });

  const body = await req.json();

  try {
    for (const [key, value] of Object.entries(body)) {
      await sql`
        insert into settings (key, value, updated_at) 
        values (${key}, ${JSON.stringify(value)}, now())
        on conflict (key) do update 
        set value = ${JSON.stringify(value)}, updated_at = now()
      `;
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}