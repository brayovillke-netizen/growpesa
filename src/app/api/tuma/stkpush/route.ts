import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { amount = 1000, phone = '254712011554' } = body;

    let formattedPhone = String(phone).trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    }

    const businessEmail = process.env.TUMA_BUSINESS_EMAIL || 'briankegode129@gmail.com';
    const apiKey = process.env.TUMA_API_KEY || 'tuma_8e5729cf712e406ff23f211e6a981aeaf63dd430d10aa9963f4c93a3e1de935d_1792648763';
    
    // Ensure absolute valid URL for callback
    const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tibapay.vercel.app';
    const cleanAppUrl = rawAppUrl.startsWith('http') ? rawAppUrl : `https://${rawAppUrl}`;
    const callbackUrl = `${cleanAppUrl.replace(/\/+$/, '')}/api/tuma/callback`;

    // Step 1: Authenticate with Tuma to obtain a temporary Bearer token
    const authResponse = await fetch('https://api.tuma.co.ke/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: businessEmail,
        api_key: apiKey,
      }),
    });

    const authData = await authResponse.json().catch(() => null);

    if (!authResponse.ok || !authData?.success || !authData?.data?.token) {
      return NextResponse.json(
        { success: false, error: authData?.message || 'Tuma Authentication failed. Check credentials.' },
        { status: 401 }
      );
    }

    const token = authData.data.token;

    // Step 2: Trigger STK Push using the acquired Bearer token & valid callback URL
    const stkResponse = await fetch('https://api.tuma.co.ke/payment/stk-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: Number(amount),
        phone: formattedPhone,
        description: 'TibaPay Savings Contribution',
        callback_url: callbackUrl,
      }),
    });

    const stkData = await stkResponse.json().catch(() => null);

    if (!stkResponse.ok || !stkData?.success) {
      return NextResponse.json(
        { success: false, error: stkData?.message || 'Tuma STK Push request rejected.' },
        { status: stkResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'STK push sent to your phone. Enter M-Pesa PIN.',
      data: stkData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to communicate with Tuma API' },
      { status: 500 }
    );
  }
}