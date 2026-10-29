import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Needs service role to read subscriptions
const supabase = createClient(supabaseUrl, supabaseServiceKey);

webpush.setVapidDetails(
  `mailto:${process.env.WEB_PUSH_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone, title, body } = await req.json();

    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

    // 1. Get the subscription for this user
    const { data: subData, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('phone', phone)
      .single();

    if (error || !subData) {
      return NextResponse.json({ error: 'No subscription found for this phone' }, { status: 404 });
    }

    // 2. Send the push notification
    const payload = JSON.stringify({
      title: title,
      body: body,
      url: '/dashboard', // Where it goes when clicked
    });

    await webpush.sendNotification(subData.subscription, payload);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}