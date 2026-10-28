import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Fetch pool balance
    const { data: poolData } = await supabase
      .from('treasury_pool')
      .select('pool_balance')
      .eq('id', 1)
      .single();

    // Fetch ledger queue items
    const { data: ledgerData, error: ledgerError } = await supabase
      .from('ledger_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (ledgerError) throw ledgerError;

    return NextResponse.json({
      success: true,
      pool: poolData ? Number(poolData.pool_balance) : 6000,
      queue: ledgerData || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, item, poolUpdate } = body;

    if (action === 'submit') {
      // Insert or update ledger item in Supabase
      const { error } = await supabase.from('ledger_items').upsert({
        id: item.id,
        phone: item.phone,
        type: item.type,
        amount: item.amount,
        date: item.date,
        status: item.status,
        code: item.code,
        sms_message: item.smsMessage,
      });

      if (error) throw error;
    } else if (action === 'approve') {
      // Update item status to COMPLETED
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
    } else if (action === 'reject') {
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'REJECTED' })
        .eq('id', item.id);

      if (error) throw error;
    }

    // Return latest state
    const { data: poolData } = await supabase
      .from('treasury_pool')
      .select('pool_balance')
      .eq('id', 1)
      .single();

    const { data: ledgerData } = await supabase
      .from('ledger_items')
      .select('*')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      pool: poolData ? Number(poolData.pool_balance) : 6000,
      queue: ledgerData || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}