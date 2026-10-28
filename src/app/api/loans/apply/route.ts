import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateLoanBreakdown } from '@/lib/loans'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { requestedAmount, termWeeks, reason, groupId } = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const amount = Number(requestedAmount)
    const weeks = Number(termWeeks) as 1 | 2 | 4

    if (!amount || amount < 100) {
      return NextResponse.json({ error: 'Minimum loan amount is KSh 100' }, { status: 400 })
    }

    const breakdown = calculateLoanBreakdown(amount, weeks)

    // Calculate Due Date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + weeks * 7)

    // Check Auto-Approval Threshold (≤ KSh 1,000)
    const isAutoApproved = amount <= 1000
    const initialStatus = isAutoApproved ? 'approved' : 'pending'

    const { data, error } = await supabase.from('loans').insert({
      user_id: user.id,
      group_id: groupId,
      requested_amount: breakdown.requestedAmount,
      upfront_fee: breakdown.upfrontFee,
      disbursed_amount: breakdown.disbursedAmount,
      term_weeks: weeks,
      interest_rate: breakdown.interestRatePct,
      interest_amount: breakdown.interestAmount,
      total_repayment: breakdown.totalRepayment,
      due_date: dueDate.toISOString(),
      status: initialStatus,
      is_auto_approved: isAutoApproved,
      reason,
    }).select()

    if (error) throw error

    return NextResponse.json({ success: true, breakdown, isAutoApproved, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
