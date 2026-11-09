import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    webpush.setVapidDetails(
      `mailto:${process.env.WEB_PUSH_EMAIL}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const { phone, title, body } = await req.json();

    if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 });

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('phone', phone);

    if (error || !subs || subs.length === 0) {
      return NextResponse.json({ error: 'No subscription found for this phone' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: title || 'GrowPesa Alert',
      body: body,
      url: '/dashboard',
    });

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          return { success: true, id: sub.id };
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
          throw err;
        }
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Push API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}