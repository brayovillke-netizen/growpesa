import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { packageId, groupId } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch package tier details
    const { data: pkg, error: pkgErr } = await supabase
      .from('member_packages')
      .select('*, package_tiers(*)')
      .eq('id', packageId)
      .eq('user_id', user.id)
      .single()

    if (pkgErr || !pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const dailyLimit = Number(pkg.package_tiers.daily_limit)
    const groupCut = dailyLimit * 0.10 // 10% Cut to Group Profit Pool
    const netSavings = dailyLimit * 0.90 // 90% Swept to Member Main Savings Pool

    // 2. Record 90% Sweep into Member's Main Savings Ledger
    await supabase.from('transactions').insert({
      user_id: user.id,
      group_id: groupId,
      amount: netSavings,
      type: 'weekly_contribution',
      status: 'completed',
      mpesa_receipt_number: `SWEEP-${Date.now()}`,
    })

    // 3. Record 10% Cut into Group Profit Pool Ledger
    await supabase.from('transactions').insert({
      user_id: user.id,
      group_id: groupId,
      amount: groupCut,
      type: 'deposit',
      status: 'completed',
      mpesa_receipt_number: `GROUPCUT-${Date.now()}`,
    })

    // 4. Update last claimed timestamp
    await supabase
      .from('member_packages')
      .update({ last_claimed_at: new Date().toISOString() })
      .eq('id', packageId)

    return NextResponse.json({
      success: true,
      breakdown: {
        grossDaily: dailyLimit,
        groupCut10Pct: groupCut,
        netToSavingsPool: netSavings,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
