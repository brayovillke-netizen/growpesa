'use client'

import { useState } from 'react'
import { calculateGWF } from '@/lib/gwf'
import { ArrowDownRight, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function WithdrawalGWFCalculator() {
  const [amountInput, setAmountInput] = useState('900')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const amount = Number(amountInput) || 0
  const isValid = amount >= 50

  let gwfFee = 0
  let netCash = 0

  if (isValid) {
    try {
      gwfFee = calculateGWF(amount)
      netCash = amount - gwfFee
    } catch (e: any) {
      gwfFee = 0
    }
  }

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Withdrawal request failed')

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 font-sans text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight">Withdraw Savings</h2>
          <p className="text-[11px] text-slate-500 font-medium">Calculated using GWF v6 bands</p>
        </div>
        <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
          Secure Payout
        </span>
      </div>

      {success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-slate-900 font-bold text-lg">Withdrawal Submitted!</h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            Your withdrawal of <strong>KES {amount.toLocaleString()}</strong> (Net: <strong>KES {netCash.toLocaleString()}</strong>) has been queued for Treasurer approval.
          </p>
          <button
            onClick={() => { setSuccess(false); setAmountInput('900'); }}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-3 rounded-xl font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Enter Amount to Withdraw (KES)
            </label>
            <input
              type="number"
              required
              min="50"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="900"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 font-extrabold text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">* Minimum withdrawal amount is KSh 50</p>
          </div>

          {isValid && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <span className="font-bold text-slate-600 uppercase tracking-wider block border-b border-slate-200 pb-1.5 text-[10px]">
                Pre-Confirmation Breakdown
              </span>
              <div className="flex justify-between font-medium">
                <span className="text-slate-600">Gross Withdrawal</span>
                <span className="text-slate-900 font-bold">KES {amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-medium">
                <span>GWF v6 Fee</span>
                <span className="font-bold">- KES {gwfFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 text-emerald-700 font-black text-sm">
                <span>Net to M-Pesa</span>
                <span>KES {netCash.toLocaleString()}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs shadow-md disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownRight className="w-4 h-4 text-emerald-400" />}
            {loading ? 'Submitting...' : `Confirm & Withdraw Net KES {netCash.toLocaleString()}`}
          </button>
        </form>
      )}
    </div>
  )
}
