import { NextResponse } from 'next/server';
import crypto from 'crypto';

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
    
    const rawBody = JSON.stringify(payload);

    // 🚨 HMAC SIGNATURE GENERATION
    const signature = crypto
      .createHmac('sha256', PAYBRIDGE_API_KEY)
      .update(rawBody)
      .digest('hex');

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Send both headers to cover different possible requirements
        'Authorization': `Bearer ${PAYBRIDGE_API_KEY}`, 
        'X-PayBridge-Signature': signature, 
      },
      body: rawBody,
    });

    const data = await response.json();

    if (!response.ok) {
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