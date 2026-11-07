import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Use the Service Role Key so the webhook has permission to update balances
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('PayBridge Webhook Received:', body);

    // PayBridge may send data at the root level or inside a 'data' object
    const payload = body.data || body;
    const reference = payload.reference; 
    const status = payload.status; // e.g., 'SUCCESS', 'FAILED', 'CANCELLED'
    
    // M-Pesa Result Codes: 0 is Success. 1032 is Cancelled. 1 is Insufficient Funds.
    const resultCode = payload.result_code || payload.ResultCode; 

    if (!reference) {
      return NextResponse.json({ error: 'No reference found in payload' }, { status: 400 });
    }

    // Check if it was successful (either by status string or M-Pesa code 0)
    const isSuccess = status === 'SUCCESS' || status === 'COMPLETED' || resultCode === 0 || resultCode === '0';

    if (isSuccess) {
      // 1. Find the pending transaction
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference)
        .single();

      // If transaction exists and is still pending, process it
      if (transaction && transaction.status === 'pending') {
        
        // 2. Mark transaction as completed
        await supabase
          .from('transactions')
          .update({ status: 'completed', receipt: payload.mpesa_receipt || 'AUTO' })
          .eq('reference', reference);

        // 3. Automatically add funds to user's wallet
        const newBalance = Number(transaction.amount) + Number(transaction.balance || 0);
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', transaction.user_id);
          
        console.log(`Successfully auto-updated balance for ${reference}`);
      }
    } else {
      // It Failed or was Cancelled. Mark as failed, do NOT update balance.
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('reference', reference);
        
      console.log(`Transaction ${reference} failed or was cancelled.`);
    }

    // Always return 200 so PayBridge knows you received it
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}