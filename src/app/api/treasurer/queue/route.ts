import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    // Fetch pool from Supabase
    const { data: poolData } = await supabase
      .from('treasury_pool')
      .select('pool_balance')
      .eq('id', 1)
      .single();

    // Fetch live queue from Supabase
    const { data: queueData, error } = await supabase
      .from('ledger_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

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
      // Upsert transaction into Supabase database so all devices see it instantly
      const { error } = await supabase.from('ledger_items').upsert({
        id: item.id,
        phone: item.phone || '0712345678',
        type: item.type,
        amount: item.amount,
        date: item.date,
        status: item.status,
        code: item.code,
        sms_message: item.smsMessage || null,
      });
      if (error) throw error;
    } else if (action === 'approve' && item) {
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'COMPLETED' })
        .eq('id', item.id);
      if (error) throw error;

      if (poolUpdate !== undefined) {
        await supabase
          .from('treasury_pool')
          .update({ pool_balance: poolUpdate, updated_at: new Date().toISOString() })
          .eq('id', 1);
      }
    } else if (action === 'reject' && item) {
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'REJECTED' })
        .eq('id', item.id);
      if (error) throw error;
    }

    // Return latest database state
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