import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, phone } = await req.json();

    // 🚨 These must be in your Vercel Environment Variables
    const PAYBRIDGE_CLIENT_ID = process.env.PAYBRIDGE_CLIENT_ID;
    const PAYBRIDGE_CLIENT_SECRET = process.env.PAYBRIDGE_CLIENT_SECRET;
    const PAYBRIDGE_URL = 'https://pesa-bridge.com/api/bridgepay/v1';

    if (!PAYBRIDGE_CLIENT_ID || !PAYBRIDGE_CLIENT_SECRET) {
      return NextResponse.json({ success: false, error: 'Paybridge credentials missing' }, { status: 500 });
    }

    // Format phone to 2547xxxxxxxx (12 digits, no plus sign)
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
    if (formattedPhone.startsWith('+')) formattedPhone = formattedPhone.slice(1);

    // 1. Get OAuth Bearer Token
    const tokenRes = await fetch(`${PAYBRIDGE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PAYBRIDGE_CLIENT_ID,
        client_secret: PAYBRIDGE_CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      throw new Error(tokenData.message || 'Failed to get Paybridge token');
    }

    const token = tokenData.access_token;

    // 2. Push STK Prompt
    const payload = {
      payer_msisdn: formattedPhone,
      amount: Number(amount),
      reference: `GROW-${Date.now()}`,
      idem: `GROW-${Date.now()}`, // Idempotency key
    };

    const response = await fetch(`${PAYBRIDGE_URL}/partner/stk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Paybridge STK Push failed');
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Paybridge STK Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}