import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

function mapRow(row: any) {
  return {
    id: String(row.id),
    phone: row.phone ?? undefined,
    type: String(row.type || ''),
    amount: Number(row.amount) || 0,
    date: String(row.date || ''),
    status: String(row.status || '').replace(/_/g, ' '),
    code: String(row.code || ''),
    smsMessage: row.sms_message ?? undefined,
    sms_message: row.sms_message ?? undefined,
  };
}

async function readState() {
  const { data: poolData } = await supabase
    .from('treasury_pool')
    .select('pool_balance')
    .eq('id', 1)
    .single();

  const { data: queueData, error } = await supabase
    .from('ledger_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return {
    pool: poolData ? Number(poolData.pool_balance) : 6000,
    queue: (queueData || []).map(mapRow),
  };
}

export async function GET() {
  try {
    const { pool, queue } = await readState();
    return NextResponse.json({ success: true, pool, queue });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to read queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, item, poolUpdate } = body || {};

    if (action === 'submit' && item) {
      const { error } = await supabase.from('ledger_items').upsert({
        id: String(item.id),
        phone: item.phone ?? null,
        type: item.type,
        amount: Number(item.amount),
        date: item.date,
        status: item.status,
        code: item.code,
        sms_message: item.smsMessage ?? item.sms_message ?? null,
      });
      if (error) throw error;
    } else if (action === 'approve' && item) {
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'COMPLETED' })
        .eq('id', String(item.id));
      if (error) throw error;

      if (typeof poolUpdate === 'number') {
        await supabase
          .from('treasury_pool')
          .update({ pool_balance: poolUpdate, updated_at: new Date().toISOString() })
          .eq('id', 1);
      }
    } else if (action === 'reject' && item) {
      const { error } = await supabase
        .from('ledger_items')
        .update({ status: 'REJECTED' })
        .eq('id', String(item.id));
      if (error) throw error;
    }

    const { pool, queue } = await readState();
    return NextResponse.json({ success: true, pool, queue });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update queue' },
      { status: 500 }
    );
  }
}