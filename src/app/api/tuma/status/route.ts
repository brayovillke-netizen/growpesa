import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutId = searchParams.get('checkoutId');

    if (!checkoutId) {
      return NextResponse.json({ success: false, error: 'Missing checkoutId' }, { status: 400 });
    }

    const businessEmail = process.env.TUMA_BUSINESS_EMAIL || 'briankegode129@gmail.com';
    const apiKey = process.env.TUMA_API_KEY || 'tuma_8e5729cf712e406ff23f211e6a981aeaf63dd430d10aa9963f4c93a3e1de935d_1792648763';

    // 1. Authenticate with Tuma
    const authResponse = await fetch('https://api.tuma.co.ke/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: businessEmail, api_key: apiKey }),
    });

    const authData = await authResponse.json().catch(() => null);
    if (!authResponse.ok || !authData?.success || !authData?.data?.token) {
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 401 });
    }

    const token = authData.data.token;

    // 2. Check transaction status from Tuma gateway
    const statusResponse = await fetch(`https://api.tuma.co.ke/payment/status/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const statusData = await statusResponse.json().catch(() => null);

    return NextResponse.json({
      success: true,
      status: statusData?.data?.status || 'PENDING', // e.g., COMPLETED, FAILED, CANCELLED, PENDING
      data: statusData?.data || {},
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Status check failed' }, { status: 500 });
  }
}