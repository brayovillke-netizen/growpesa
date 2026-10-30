import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  // Security check: Vercel Cron sends a specific auth header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: members, error } = await supabase
      .from('members')
      .select('phone, full_name, created_at, total_deposited')
      .eq('account_status', 'active');

    if (error) throw error;

    const today = new Date();
    let processedCount = 0;

    for (const member of members) {
      const joinedDate = new Date(member.created_at);
      
      // Calculate how many weeks the member has been active
      const msDiff = today.getTime() - joinedDate.getTime();
      const daysActive = Math.floor(msDiff / (1000 * 60 * 60 * 24));
      const weeksActive = Math.floor(daysActive / 7);

      // Skip members who joined this week
      if (weeksActive === 0) continue;

      const expectedSavings = weeksActive * 100;
      const actualSavings = Number(member.total_deposited) || 0;
      const deficit = expectedSavings - actualSavings;
      
      const firstName = member.full_name.split(' ')[0];
      let title = '';
      let body = '';

      if (deficit <= 0) {
        // ON TRACK
        title = 'Savings Goal Met! 🎉';
        const messages = [
          `Hey ${firstName}! You're crushing it. You've hit your KES 100/week target. Keep up the great work! 💪`,
          `Happy Sunday ${firstName}! 🌟 You are right on track. Your future self thanks you! 🏦`,
          `You're doing amazing ${firstName}! 🚀 Your savings streak is alive and well. Keep stacking those coins! 🪙`
        ];
        body = messages[Math.floor(Math.random() * messages.length)];
      } else {
        // BEHIND SCHEDULE
        const weeksBehind = Math.ceil(deficit / 100);
        
        if (weeksBehind === 1) {
          title = 'Gentle Savings Reminder 👋';
          body = `Hey ${firstName}, just a friendly nudge! You're currently KES ${deficit} short of your weekly goal. A small top-up today keeps your vault growing! 📈`;
        } else {
          title = 'Let\'s Catch Up! 🚨';
          body = `We miss you ${firstName}! You are KES ${deficit} behind your savings target (${weeksBehind} weeks). Let's get back on track this week! 🤝`;
        }
      }

      // Fire the Push Notification using your existing API route
      try {
        await fetch(`https://tibapay.vercel.app/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: member.phone,
            title: title,
            body: body
          })
        });
        processedCount++;
      } catch (pushErr) {
        console.error(`Failed to send push to ${member.phone}`, pushErr);
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });

  } catch (error: any) {
    console.error('Cron Job Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}