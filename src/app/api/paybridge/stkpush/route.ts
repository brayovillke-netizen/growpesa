import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    const PAYBRIDGE_ACCOUNT_ID = process.env.PAYBRIDGE_ACCOUNT_ID;
    
    // The exact URL from your dashboard screenshot
    const PAYBRIDGE_URL = 'https://paybridge.kingscreation.co.ke/api/v1/payments'; 

    if (!PAYBRIDGE_API_KEY || !PAYBRIDGE_ACCOUNT_ID) {
      return NextResponse.json({ success: false, error: 'Paybridge credentials missing' }, { status: 500 });
    }

    // Format phone to 2547xxxxxxxx
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    // 🚨 TUMA-STYLE PAYLOAD: Simple and direct
    const payload = {
      api_key: PAYBRIDGE_API_KEY,       // Sending in body just like Tuma
      account_id: PAYBRIDGE_ACCOUNT_ID, // The UUID from your dashboard
      msisdn: formattedPhone,           // Using 'msisdn' like Tuma, PayBridge might accept it
      phone: formattedPhone,            // Also sending 'phone' just in case
      amount: Number(amount),
      reference: `GP-${Date.now()}`,
    };

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Sending the Bearer token exactly like Tuma's header format
        'Authorization': `Bearer ${PAYBRIDGE_API_KEY}`, 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Better error extraction
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