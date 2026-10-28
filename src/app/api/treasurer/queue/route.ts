import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. Fetch live pool balance from Supabase
    const { data: poolData, error: poolError } = await supabase
      .from('treasury_pool')
      .select('pool_balance')
      .eq('id', 1)
      .single();

    if (poolError) {
      console.error('Pool fetch error:', poolError);
    }

    // 2. Fetch live ledger queue items from Supabase
    const { data: queueData, error: queueError } = await supabase
      .from('ledger_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (queueError) throw queueError;

    return NextResponse.json({
      success: true,
      pool: poolData ? Number(poolData.pool_balance) : 6000,
      queue: queueData || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, item, poolUpdate } = body;

    if (action === 'submit' && item) {
      // Insert or update transaction in Supabase
      const { error } = await supabase.from('ledger_items').upsert({
        id: item.id,
        phone: item.phone || '0700000000',
        type: item.type,
        amount: item.amount,
        date: item.date,
        status: item.status,
        code: item.code,
        sms_message: item.smsMessage || null,
      });
      if (error) throw error;
    } else if (action === 'approve' && item) {
      // Mark item as completed
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'COMPLETED' })
        .eq('id', item.id);
      if (error) throw error;

      // Update pool balance if provided
      if (poolUpdate !== undefined) {
        await supabase
          .from('treasury_pool')
          .update({ pool_balance: poolUpdate, updated_at: new Date().toISOString() })
          .eq('id', 1);
      }
    } else if (action === 'reject' && item) {
      // Mark item as rejected
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'REJECTED' })
        .eq('id', item.id);
      if (error) throw error;
    }

    // Return latest state from database
    const { data: poolData } = await supabase
      .from('treasury_pool')
      .select('pool_balance')
      .eq('id', 1)
      .single();

    const { data: queueData } = await supabase
      .from('ledger_items')
      .select('*')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      pool: poolData ? Number(poolData.pool_balance) : 6000,
      queue: queueData || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}