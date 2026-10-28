import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateGWF } from '@/lib/gwf'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { amount, groupId } = await request.json()

    if (!amount || Number(amount) < 50) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is KSh 50' },
        { status: 400 }
      )
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestedAmount = Number(amount)

    // 1. Calculate aggregated daily withdrawals for GWF band calculation
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: todaysWithdrawals } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'withdrawal')
      .gte('created_at', todayStart.toISOString())

    const totalTodayPrior = todaysWithdrawals?.reduce((acc, t) => acc + Number(t.amount), 0) || 0
    const aggregatedAmount = totalTodayPrior + requestedAmount

    // 2. Calculate GWF Fee based on total daily aggregated amount
    const gwfFee = calculateGWF(aggregatedAmount)
    const netPayout = requestedAmount - gwfFee

    if (netPayout <= 0) {
      return NextResponse.json(
        { error: 'Requested amount is too low after applying GWF fees.' },
        { status: 400 }
      )
    }

    // 3. Record Main Savings Pool Withdrawal Ledger Entry
    const { data, error } = await supabase.from('transactions').insert({
      user_id: user.id,
      group_id: groupId,
      amount: requestedAmount,
      type: 'withdrawal',
      status: 'pending_approval', // Awaits Treasurer / Admin verification
      mpesa_receipt_number: `GWF-CASH-${Date.now()}`,
    }).select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      breakdown: {
        grossWithdrawal: requestedAmount,
        aggregatedDailyTotal: aggregatedAmount,
        gwfFeeApplied: gwfFee,
        netCashToMpesa: netPayout,
      },
      data,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
