import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🚨 PAYBRIDGE WEBHOOK HIT:', JSON.stringify(body, null, 2));

    const reference = body.reference || body.tx_ref || body.data?.reference || body.account_number;
    
    // 🔥 Flexible status check
    const rawStatus = body.status || body.data?.status || body.event_type || body.ResultCode;
    const statusStr = String(rawStatus).toLowerCase();
    const isSuccess = statusStr.includes('success') || statusStr.includes('complete') || statusStr === '0' || rawStatus === true;

    if (!reference) {
      return NextResponse.json({ error: 'No reference found' }, { status: 400 });
    }

    if (isSuccess) {
      const { data: ledgerItem, error: fetchErr } = await supabase
        .from('ledger_items')
        .select('*')
        .eq('code', reference)
        .single();

      if (fetchErr || !ledgerItem) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      // 1. Mark as completed
      await supabase.from('ledger_items').update({ status: 'COMPLETED' }).eq('code', reference);

      // 2. Update Member Balance
      if (ledgerItem.phone) {
        const { data: member } = await supabase.from('members').select('savings_balance, total_deposited').eq('phone', ledgerItem.phone).single();
        if (member) {
          await supabase.from('members').update({ 
            savings_balance: Number(member.savings_balance || 0) + Number(ledgerItem.amount),
            total_deposited: Number(member.total_deposited || 0) + Number(ledgerItem.amount)
          }).eq('phone', ledgerItem.phone);
        }
      }

      // 3. Update Treasury Pool
      const { data: pool } = await supabase.from('treasury_pool').select('pool_balance').eq('id', 1).single();
      if (pool) {
        await supabase.from('treasury_pool').update({ pool_balance: Number(pool.pool_balance) + Number(ledgerItem.amount) }).eq('id', 1);
      }
    } else {
      await supabase.from('ledger_items').update({ status: 'FAILED' }).eq('code', reference);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}