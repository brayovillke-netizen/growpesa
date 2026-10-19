import { sql } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Fetch current profile details
export async function GET() {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const [member] = await sql`select name, phone from members where id = ${memberId}`;
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  return Response.json({ name: member.name, phone: member.phone });
}

// Update name and/or PIN
export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, currentPin, newPin } = await req.json();

    // 1. Get current data from DB
    const [member] = await sql`select name, pin from members where id = ${memberId}`;
    if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

    let updatedName = member.name;

    // 2. If changing name, validate and prepare
    if (name && name.trim().length > 0) {
      updatedName = name.trim();
    }

    // 3. If changing PIN, verify the current PIN first
    if (newPin) {
      if (newPin.length !== 4 || isNaN(Number(newPin))) {
        return Response.json({ error: 'New PIN must be exactly 4 digits' }, { status: 400 });
      }
      if (member.pin !== currentPin) {
        return Response.json({ error: 'Incorrect current PIN' }, { status: 401 });
      }
    }

    // 4. Save to database
    await sql`
      update members 
      set name = ${updatedName}, 
          pin = ${newPin || member.pin}
      where id = ${memberId}
    `;

    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}