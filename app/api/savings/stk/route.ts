import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { triggerSTK } from '@/lib/daraja';

export async function POST(req: Request) {
  const memberId = await getSession();
  if (!memberId) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { amount } = await req.json();
  if (!amount || amount <= 0) return Response.json({ error: 'Invalid amount' }, { status: 400 });

  try {
    // Get member phone
    const [member] = await sql`select phone from members where id = ${memberId}`;
    
    // Trigger the M-Pesa prompt on their phone
    const response = await triggerSTK(member.phone, amount);
    
    if (response.ResponseCode === '0') {
       return Response.json({ ok: true, message: 'M-Pesa prompt sent' });
    } else {
       return Response.json({ error: response.ResponseDescription || 'Failed to trigger M-Pesa' }, { status: 400 });
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Daraja connection error' }, { status: 500 });
  }
}