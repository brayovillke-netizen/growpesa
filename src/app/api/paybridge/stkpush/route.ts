import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    const PAYBRIDGE_CHANNEL_ID = process.env.PAYBRIDGE_CHANNEL_ID;
    
    // URL exactly as shown in the docs
    const PAYBRIDGE_URL = 'https://paybridge.kingscreation.co.ke/api/v1/payments'; 

    if (!PAYBRIDGE_API_KEY || !PAYBRIDGE_CHANNEL_ID) {
      return NextResponse.json({ success: false, error: 'Missing PayBridge configuration' }, { status: 500 });
    }

    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    // Generate a unique reference for this transaction
    const reference = `GP-${Date.now()}`;

    // Payload exactly as required by the documentation
    const payload = {
      channel_id: PAYBRIDGE_CHANNEL_ID,
      phone_number: formattedPhone,
      amount: Number(amount),
      external_reference: reference,
      customer_name: "GrowPesa User"
    };

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAYBRIDGE_API_KEY}`, 
        'Idempotency-Key': reference, // Required by PayBridge
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('PayBridge Response:', data);

    if (!response.ok) {
      // Extract the exact error message from their nested error object
      let errorMessage = 'STK push failed';
      if (data.error) {
        errorMessage = typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error);
      } else if (data.message) {
        errorMessage = data.message;
      }
      throw new Error(errorMessage);
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('PayBridge STK Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}