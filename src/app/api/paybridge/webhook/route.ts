import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🔥 THIS IS THE MOST IMPORTANT LINE. WE NEED TO SEE THIS IN VERCEL LOGS.
    console.log('🚨 PAYBRIDGE WEBHOOK RECEIVED:', JSON.stringify(body, null, 2));

    // PayBridge might use 'reference', 'tx_ref', or 'account_number'
    const reference = body.reference || body.tx_ref || body.data?.reference || body.account_number;
    const status = body.status || body.data?.status || body.event_type;

    if (!reference) {
      console.log('❌ Webhook failed: No reference found in payload.');
      return NextResponse.json({ error: 'No reference found' }, { status: 400 });
    }

    // Accept various success keywords
    const isSuccess = status === 'SUCCESS' || status === 'COMPLETED' || status === 'success' || status === 'charge.completed';

    if (isSuccess) {
      console.log(`✅ Webhook Success for Ref: ${reference}`);

      const { data: ledgerItem } = await supabase
        .from('ledger_items')
        .select('*')
        .eq('code', reference)
        .single();

      if (ledgerItem) {
        // 1. Update Ledger
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
        console.log(`⚠️ Transaction ${reference} not found in database.`);
      }
    } else {
      console.log(`❌ Webhook Failed/Cancelled for Ref: ${reference}. Status was: ${status}`);
      await supabase.from('ledger_items').update({ status: 'FAILED' }).eq('code', reference);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}