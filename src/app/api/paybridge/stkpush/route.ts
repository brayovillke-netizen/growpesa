import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    
    // 🚨 MAKE SURE THIS IS THE EXACT URL FROM PAYBRIDGE
    const PAYBRIDGE_URL = 'https://api.paybridge.co.ke/v1/stkpush'; 

    if (!PAYBRIDGE_API_KEY) {
      console.error('Paybridge Error: API key is missing in Vercel Environment Variables');
      return NextResponse.json({ success: false, error: 'Paybridge API key missing' }, { status: 500 });
    }

    // Format phone to 2547...
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    // 🚨 MAKE SURE THIS PAYLOAD MATCHES PAYBRIDGE'S DOCS
    const payload = {
      amount: Number(amount),
      phone: formattedPhone, // Some use 'phone_number', 'msisdn', etc.
    };

    console.log('Sending to Paybridge:', PAYBRIDGE_URL, payload);

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 🚨 MAKE SURE THIS IS THE RIGHT AUTH HEADER
        'Authorization': `Bearer ${PAYBRIDGE_API_KEY}`, 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    // Log the exact response from Paybridge
    console.log('Paybridge Response:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Paybridge STK Push failed');
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Paybridge STK Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}