import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    const PAYBRIDGE_URL = 'https://paybridge.kingscreation.co.ke/api/v1/payments'; 

    if (!PAYBRIDGE_API_KEY) {
      return NextResponse.json({ success: false, error: 'Paybridge API key missing' }, { status: 500 });
    }

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    const payload = {
      phone: formattedPhone,
      amount: Number(amount),
    };

    console.log('Sending payload to PayBridge:', payload);

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYBRIDGE_API_KEY}`, 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    // 🚨 LOG THE EXACT RESPONSE FROM PAYBRIDGE
    console.log('PayBridge Response:', data);

    if (!response.ok) {
      // Extract the exact error message from the object
      const errorMessage = data.message 
        ? data.message 
        : data.error 
        ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
        : JSON.stringify(data);
        
      throw new Error(errorMessage);
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Paybridge STK Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}