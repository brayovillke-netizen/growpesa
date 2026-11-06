import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    
    // 🚨 REPLACE THIS URL WITH THE EXACT URL FROM PAYBRIDGE DOCS
    const PAYBRIDGE_URL = 'https://api.paybridge.co.ke/v1/stkpush'; 

    if (!PAYBRIDGE_API_KEY) {
      return NextResponse.json({ success: false, error: 'Paybridge API key missing' }, { status: 500 });
    }

    // Format phone to 2547... (Most gateways require this)
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    // 🚨 UPDATE THIS PAYLOAD TO MATCH PAYBRIDGE'S EXACT REQUIREMENTS
    const payload = {
      amount: Number(amount),
      phone_number: formattedPhone,
      // Add any other required fields (e.g., account_reference, callback_url)
    };

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 🚨 UPDATE THE AUTH HEADER (Bearer token, or 'x-api-key', etc.)
        'Authorization': `Bearer ${PAYBRIDGE_API_KEY}`, 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Paybridge STK Push failed');
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Paybridge STK Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}