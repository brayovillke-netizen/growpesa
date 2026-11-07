import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Ensure these are set in Vercel Environment Variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('PayBridge Webhook Received:', body);

    // Extract data from PayBridge's payload (adjust based on their exact JSON structure)
    const reference = body.reference || body.data?.reference; 
    const status = body.status || body.data?.status; // 'SUCCESS', 'FAILED', 'CANCELLED'
    const mpesaReceipt = body.mpesa_receipt || body.data?.mpesa_receipt;

    if (!reference) {
      return NextResponse.json({ error: 'No reference found' }, { status: 400 });
    }

    if (status === 'SUCCESS' || status === 'COMPLETED') {
      // 1. Find the transaction
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', reference)
        .single();

      if (transaction) {
        // 2. Mark as completed
        await supabase
          .from('transactions')
          .update({ status: 'completed', receipt: mpesaReceipt })
          .eq('reference', reference);

        // 3. Add funds to user wallet
        const newBalance = transaction.amount + (transaction.balance || 0);
        await supabase
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', transaction.user_id);
      }
    } else {
      // Mark as failed/cancelled
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('reference', reference);
    }

    // Always return 200 OK so PayBridge knows it was received
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}