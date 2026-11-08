import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Accept reference from the frontend
    const { amount, phone, reference } = await req.json(); 

    const PAYBRIDGE_API_KEY = process.env.PAYBRIDGE_API_KEY;
    const PAYBRIDGE_ACCOUNT_ID = process.env.PAYBRIDGE_ACCOUNT_ID;
    const PAYBRIDGE_URL = 'https://paybridge.kingscreation.co.ke/api/v1/payments'; 

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
      channel_id: "01a1b1b0-8dd5-70c5-9be0-3cbdfc67d9fc", 
      account_number: "01103198794002", 
      reference: reference, // Pass reference to PayBridge
    };

    const response = await fetch(PAYBRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PAYBRIDGE_API_KEY}` },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(JSON.stringify(data));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}