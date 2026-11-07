import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('PayBridge Webhook Received:', JSON.stringify(body, null, 2));

    const payload = body.data || body;
    
    // 🔥 THE FIX: PayBridge sends our reference in 'external_reference'
    const reference = payload.external_reference || payload.reference; 
    const status = payload.status; 

    if (!reference) {
      return NextResponse.json({ error: 'No reference found' }, { status: 400 });
    }

    if (status === 'completed' || status === 'SUCCESS') {
      console.log(`✅ Success for ref: ${reference}`);
      
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference) // Finds GP-169...
        .single();

      if (transaction) {
        // 1. Mark as completed
        await supabase
          .from('transactions')
          .update({ status: 'completed', receipt: payload.receipt })
          .eq('reference', reference);

        // 2. Add to balance
        const newBalance = Number(transaction.amount) + Number(transaction.balance || 0);
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', transaction.user_id);
          
        console.log(`💰 Balance updated for ${reference}`);
      } else {
        console.log(`⚠️ Transaction ${reference} not found in DB`);
      }
    } else {
      // Failed or expired
      await supabase.from('transactions').update({ status: 'failed' }).eq('reference', reference);
      console.log(`❌ Failed for ref: ${reference}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}