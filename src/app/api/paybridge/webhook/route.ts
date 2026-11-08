import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 🔥 CRITICAL: Log the exact payload so you can see it in Vercel Logs
    console.log('🚨 PAYBRIDGE WEBHOOK RECEIVED:', JSON.stringify(body, null, 2));

    // PayBridge might send reference at the root, inside 'data', or as 'account_number'
    const reference = body.reference || body.data?.reference || body.account_number || body.externalReference;
    const status = body.status || body.data?.status || body.event_type;

    if (!reference) {
      console.error('❌ Webhook missing reference. Payload:', body);
      return NextResponse.json({ error: 'No reference found' }, { status: 400 });
    }

    // Check for success (different providers use different terms)
    const isSuccess = status === 'SUCCESS' || status === 'COMPLETED' || status === 'success' || status === 'charge.completed';

    if (isSuccess) {
      const { data: ledgerItem, error: fetchError } = await supabase
        .from('ledger_items')
        .select('*')
        .eq('code', reference)
        .single();

      if (fetchError || !ledgerItem) {
        console.error(`❌ Transaction ${reference} not found in DB`);
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
      }

      // 1. Mark as COMPLETED
      await supabase.from('ledger_items').update({ status: 'COMPLETED' }).eq('code', reference);

      // 2. Add funds to member balance
      if (ledgerItem.phone) {
        const { data: member } = await supabase
          .from('members')
          .select('savings_balance, total_deposited')
          .eq('phone', ledgerItem.phone)
          .single();

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
      // Mark as FAILED if it wasn't a success
      await supabase.from('ledger_items').update({ status: 'FAILED' }).eq('code', reference);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}