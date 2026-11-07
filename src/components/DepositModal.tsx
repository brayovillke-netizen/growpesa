'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, CheckCircle2, AlertCircle, Send, Clock } from 'lucide-react'

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onManualSubmit: (data: { phone: string; amount: number; reference: string }) => void
}

export default function DepositModal({ isOpen, onClose, onManualSubmit }: DepositModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [mpesaMessage, setMpesaMessage] = useState('')
  
  const [status, setStatus] = useState<'idle' | 'prompting' | 'fallback_sms' | 'success'>('idle')
  const [timer, setTimer] = useState(25) // 25 seconds to give Safaricom time
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Simple Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'prompting' && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000)
    } else if (status === 'prompting' && timer === 0) {
      setStatus('fallback_sms')
    }
    return () => clearInterval(interval)
  }, [status, timer])

  if (!isOpen) return null

  const resetModal = () => {
    setStatus('idle')
    setTimer(25)
    setError(null)
    setMpesaMessage('')
    setIsLoading(false)
    onClose()
  }

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber || !amount) return

    setError(null)
    setStatus('prompting') // 🔥 Instantly show the "Check phone" screen
    setTimer(25)
    setIsLoading(true)

    try {
      const response = await fetch('/api/paybridge/stkpush', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, amount: Number(amount) }),
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'PayBridge rejected the request.')
      }
      
    } catch (err: any) {
      // If it fails instantly, show the error and push them to fallback
      setError(err.message || 'Network error. Please use the SMS fallback.')
      setStatus('fallback_sms')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSMSSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mpesaMessage) {
      setError('Please paste your M-Pesa transaction reference or message.')
      return
    }
    onManualSubmit({
      phone: phoneNumber,
      amount: Number(amount),
      reference: mpesaMessage.trim().toUpperCase(),
    })
    setStatus('success')
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-800">
        <button onClick={resetModal} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <X className="w-5 h-5" />
        </button>

        {status === 'idle' && (
          <form onSubmit={handleInitiatePayment} className="space-y-4">
             <h2 className="text-lg font-bold text-slate-900">M-Pesa Deposit</h2>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Phone Number</label>
              <input type="text" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="0712011554" className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Amount (KES)</label>
              <input type="number" required min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm" />
            </div>
            {error && <div className="bg-rose-50 text-rose-600 text-xs p-2.5 rounded-xl">{error}</div>}
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm">
              Send STK Prompt
            </button>
          </form>
        )}

        {status === 'prompting' && (
          <div className="text-center py-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Check Your Phone!</h3>
            <p className="text-slate-500 text-xs">
              {isLoading ? "Sending prompt..." : `Enter your M-Pesa PIN for ${phoneNumber}`}
            </p>
            <div className="bg-emerald-50 text-emerald-700 rounded-2xl p-3 inline-flex items-center gap-2 text-xs font-bold">
              <Clock className="w-4 h-4 animate-pulse" /> Waiting: {timer}s
            </div>
            <button type="button" onClick={() => setStatus('fallback_sms')} className="block w-full text-xs font-bold text-slate-500 underline pt-2">
              No prompt received? Paste SMS here
            </button>
          </div>
        )}

        {status === 'fallback_sms' && (
          <form onSubmit={handleSMSSubmit} className="space-y-4">
            <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl">
              {error ? error : "If M-Pesa deducted you, paste the SMS below for approval."}
            </div>
            <textarea required rows={3} value={mpesaMessage} onChange={(e) => setMpesaMessage(e.target.value)} placeholder="Paste M-Pesa SMS..." className="w-full bg-slate-50 border rounded-xl p-3 text-xs uppercase" />
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm">Submit Confirmation</button>
          </form>
        )}

        {status === 'success' && (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-slate-900 font-bold text-lg">Submitted!</h3>
            <p className="text-slate-600 text-xs">Your payment is pending admin approval.</p>
            <button onClick={resetModal} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}