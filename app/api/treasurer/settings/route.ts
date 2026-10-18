import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await sql`select key, value from settings`;
  const settings: any = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return Response.json(settings);
}

export async function POST(req: Request) {
  const body = await req.json();

  try {
    for (const [key, value] of Object.entries(body)) {
      // Upsert each setting
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