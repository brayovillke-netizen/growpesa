import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    // 🚨 Use your sk_live key from the PayBridge dashboard
    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    
    // 🚨 Use the exact URL from your Usage section
    const PAYBRIDGE_URL = 'https://paybridge.kingscreation.co.ke/api/v1/payments'; 

    if (!PAYBRIDGE_API_KEY) {
      return NextResponse.json({ success: false, error: 'Paybridge API key missing' }, { status: 500 });
    }

    // Format phone to 2547xxxxxxxx (12 digits, no plus sign)
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    const payload = {
      phone: formattedPhone,
      amount: Number(amount),
      // Check if your dashboard requires other fields like 'reference' or 'callback_url'
    };

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 🚨 This is the direct Bearer token method shown in your dashboard
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