import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🚨 WEBHOOK RECEIVED:', JSON.stringify(body, null, 2));

    // Look for reference in various possible payload structures
    const reference = body.reference || body.data?.reference || body.account_number;
    const status = body.status || body.data?.status;

    if (!reference) {
      console.log('❌ No reference found in payload');
      return NextResponse.json({ error: 'No reference' }, { status: 400 });
    }

    if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'success') {
      const { data: ledgerItem } = await supabase.from('ledger_items').select('*').eq('code', reference).single();

      if (ledgerItem) {
        // 1. Mark transaction completed
        await supabase.from('ledger_items').update({ status: 'COMPLETED' }).eq('code', reference);

        // 2. Add money to user balance
        if (ledgerItem.phone) {
          const { data: member } = await supabase.from('members').select('savings_balance, total_deposited').eq('phone', ledgerItem.phone).single();
          if (member) {
            await supabase.from('members').update({ 
              savings_balance: Number(member.savings_balance || 0) + Number(ledgerItem.amount),
              total_deposited: Number(member.total_deposited || 0) + Number(ledgerItem.amount)
            }).eq('phone', ledgerItem.phone);
          }
        }

        // 3. Update treasury pool
        const { data: pool } = await supabase.from('treasury_pool').select('pool_balance').eq('id', 1).single();
        if (pool) {
          await supabase.from('treasury_pool').update({ pool_balance: Number(pool.pool_balance) + Number(ledgerItem.amount) }).eq('id', 1);
        }
      }
    } else {
      await supabase.from('ledger_items').update({ status: 'FAILED' }).eq('code', reference);
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}