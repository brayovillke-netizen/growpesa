import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Log a portion of the key to verify it's loading correctly
console.log("VAPID CHECK:", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 10));

webpush.setVapidDetails(
  `mailto:${process.env.WEB_PUSH_EMAIL}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: Request) {
  try {
    const { phone, title, body } = await req.json();

    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

    const { data: subData, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('phone', phone)
      .single();

    if (error || !subData) {
      return NextResponse.json({ error: 'No subscription found for this phone' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: title,
      body: body,
      url: '/dashboard',
    });

    try {
      await webpush.sendNotification(subData.subscription, payload);
      return NextResponse.json({ success: true });
    } catch (webPushError: any) {
      console.error('WebPush Error:', webPushError);
      
      // If subscription is dead, delete it
      if (webPushError.statusCode === 410 || webPushError.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('phone', phone);
        return NextResponse.json({ error: 'Subscription expired. Please re-enable notifications.' }, { status: 410 });
      }

      return NextResponse.json({ 
        error: webPushError.message, 
        statusCode: webPushError.statusCode 
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Push API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}