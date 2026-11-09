import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { amount, phone, reference } = await req.json(); 

    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    const PAYBRIDGE_ACCOUNT_ID = process.env.PAYBRIDGE_ACCOUNT_ID;
    
    if (!PAYBRIDGE_API_KEY || !PAYBRIDGE_ACCOUNT_ID) {
      return NextResponse.json({ success: false, error: 'Credentials missing' }, { status: 500 });
    }

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    const payload = {
      account_id: PAYBRIDGE_ACCOUNT_ID, 
      phone_number: formattedPhone,
      amount: Number(amount),
      channel_id: "01a1b1b0-8dd5-70c5-9be0-3cbdfc67d9fc", // Your exact channel UUID
      account_number: "01103198794002", // Your Co-op account
      reference: reference, 
      
      // 🔥 FIXED: Using the non-www domain to prevent Vercel 308 redirects
      callback_url: "https://growpesa.co.ke/api/paybridge/webhook",
      webhook_url: "https://growpesa.co.ke/api/paybridge/webhook"
    };

    const response = await fetch('https://paybridge.kingscreation.co.ke/api/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAYBRIDGE_API_KEY}` },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }

    // 🔥 CRITICAL FIX: PayBridge ignores our reference and creates its own UUID.
    // We must save their UUID in our database so the webhook knows which transaction to update.
    const paybridgeReference = data.data?.reference;

    if (paybridgeReference && reference) {
      await supabase
        .from('ledger_items')
        .update({ code: paybridgeReference })
        .eq('code', reference);
    }

    // Return the new UUID to the frontend so it polls the correct code
    return NextResponse.json({ success: true, data, finalReference: paybridgeReference || reference });

  } catch (error: any) {
    console.error('Paybridge STK Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}