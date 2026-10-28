import { NextResponse } from 'next/server';

function normalizePhone(raw: string): string | null {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.length === 9) return '254' + digits;
  return null;
}

function resolveBaseUrl(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
  if (envUrl) {
    const withScheme = envUrl.startsWith('http') ? envUrl : `https://${envUrl}`;
    return withScheme.replace(/\/+$/, '');
  }
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'https://tibapay.vercel.app';
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const amount = Number(body?.amount);
    const phoneRaw = body?.phone;

    if (!amount || amount < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(String(phoneRaw || ''));
    if (!phone) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid phone number. Use 07XXXXXXXX or 2547XXXXXXXX.',
        },
        { status: 400 }
      );
    }

    const businessEmail = process.env.TUMA_BUSINESS_EMAIL;
    const apiKey = process.env.TUMA_API_KEY;

    if (!businessEmail || !apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Tuma credentials missing. Add TUMA_BUSINESS_EMAIL and TUMA_API_KEY in Vercel environment variables.',
        },
        { status: 500 }
      );
    }

    const baseUrl = resolveBaseUrl(request);
    const callbackUrl = `${baseUrl}/api/tuma/callback`;

    const authResponse = await fetch('https://api.tuma.co.ke/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: businessEmail, api_key: apiKey }),
      cache: 'no-store',
    });

    const authData = await authResponse.json().catch(() => null);
    const token = authData?.data?.token || authData?.token;

    if (!authResponse.ok || !token) {
      return NextResponse.json(
        {
          success: false,
          error: authData?.message || 'Tuma authentication failed',
        },
        { status: 401 }
      );
    }

    const stkResponse = await fetch('https://api.tuma.co.ke/payment/stk-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount,
        phone,
        description: 'TibaPay Savings Contribution',
        callback_url: callbackUrl,
      }),
      cache: 'no-store',
    });

    const stkData = await stkResponse.json().catch(() => null);

    if (!stkResponse.ok || !stkData?.success) {
      return NextResponse.json(
        {
          success: false,
          error: stkData?.message || 'Tuma STK push rejected',
        },
        { status: stkResponse.status || 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'STK push sent. Enter your M-Pesa PIN.',
      data: stkData,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to reach Tuma API' },
      { status: 500 }
    );
  }
}