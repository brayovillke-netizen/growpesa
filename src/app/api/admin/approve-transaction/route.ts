import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { transactionId, status } = await request.json()

    if (!transactionId || !['completed', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update status and record admin approval
    const { data, error } = await supabase
      .from('transactions')
      .update({
        status,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', transactionId)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
