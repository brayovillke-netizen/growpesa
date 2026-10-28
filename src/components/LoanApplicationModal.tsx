'use client'

import { useState } from 'react'
import { calculateLoanBreakdown, calculateBorrowingLimit } from '@/lib/loans'
import { Landmark, ShieldCheck, CheckCircle, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

export default function LoanApplicationModal() {
  const [requestedAmount, setRequestedAmount] = useState('1000')
  const [termWeeks, setTermWeeks] = useState<1 | 2 | 4>(2)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Member stats mockup
  const stats = { totalSavings: 10000, weeksActive: 24, consecutiveOnTimeRepayments: 3, hasActiveLoan: false, isInactive: false }
  const maxLimit = calculateBorrowingLimit(stats)

  const amount = Number(requestedAmount) || 0
  const isValid = amount >= 100 && amount <= maxLimit

  const breakdown = isValid ? calculateLoanBreakdown(amount, termWeeks) : null

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedAmount: amount, termWeeks, reason }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to submit loan request')

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 font-sans text-slate-800 max-w-xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Apply for a Chama Loan</h2>
          <p className="text-xs text-slate-500 mt-0.5">Your Dynamic Limit: <strong className="text-emerald-600">KES {maxLimit.toLocaleString()}</strong></p>
        </div>
        <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Savings Shielded
        </span>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-slate-900 font-bold text-lg">Loan Application Submitted!</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            {amount <= 1000 ? 'Auto-Approved! Awaiting Treasurer disbursement to your M-Pesa.' : 'Routed to Treasurer approval queue for verification.'}
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Requested Loan Amount (KES)
            </label>
            <input
              type="number"
              required
              min="100"
              max={maxLimit}
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 font-extrabold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Select Loan Term
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { weeks: 1, rate: '3%' },
                { weeks: 2, rate: '5%' },
                { weeks: 4, rate: '10%' },
              ].map((t) => (
                <button
                  key={t.weeks}
                  type="button"
                  onClick={() => setTermWeeks(t.weeks as any)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    termWeeks === t.weeks
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <p className="text-sm font-bold">{t.weeks} Week{t.weeks > 1 ? 's' : ''}</p>
                  <p className="text-[11px] opacity-80">Interest: {t.rate}</p>
                </button>
              ))}
            </div>
          </div>

          {breakdown && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block border-b border-slate-200 pb-2">
                Mandatory Cost of Credit Disclosure
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-600">Requested Loan</span>
                  <span className="font-bold text-slate-900">KES {breakdown.requestedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-medium">
                  <span>Upfront Processing Fee (5%)</span>
                  <span className="font-bold">- KES {breakdown.upfrontFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-100/60 p-2 rounded-lg">
                  <span>Amount Sent to M-Pesa</span>
                  <span>KES {breakdown.disbursedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>Interest ({breakdown.interestRatePct}%)</span>
                  <span className="font-bold">+ KES {breakdown.interestAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-slate-900 font-bold text-sm">
                  <span>Total Amount to Repay</span>
                  <span className="text-base font-black text-indigo-600">KES {breakdown.totalRepayment.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Submitting Application...' : 'Accept Terms & Submit Loan Request'}
          </button>
        </form>
      )}
    </div>
  )
}
