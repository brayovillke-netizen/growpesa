'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, CheckCircle2, AlertCircle, Send, Clock } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for polling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface DepositModalProps {
  isOpen: boolean
  onClose: () => void
  onManualSubmit: (data: { phone: string; amount: number; reference: string }) => void
  userId: string
}

export default function DepositModal({ isOpen, onClose, onManualSubmit, userId }: DepositModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [amount, setAmount] = useState('')
  const [mpesaMessage, setMpesaMessage] = useState('')
  
  const [status, setStatus] = useState<'idle' | 'prompting' | 'fallback_sms' | 'success'>('idle')
  const [timer, setTimer] = useState(20) // Changed to 20 seconds to give the user a bit more time
  const [error, setError] = useState<string | null>(null)
  const [currentReference, setCurrentReference] = useState<string | null>(null)

  // Effect 1: Visual Countdown Timer
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (status === 'prompting' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1)
      }, 1000)
    } else if (status === 'prompting' && timer === 0) {
      // Timeout reached -> automatically switch to SMS fallback
      setStatus('fallback_sms')
    }
    return () => clearInterval(interval)
  }, [status, timer])

  // Effect 2: Auto-Polling Supabase for Webhook Updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout

    if (status === 'prompting' && currentReference) {
      pollInterval = setInterval(async () => {
        const { data, error } = await supabase
          .from('transactions')
          .select('status')
          .eq('reference', currentReference)
          .single()

        if (data) {
          if (data.status === 'completed') {
            setStatus('success')
          } else if (data.status === 'failed') {
            setError('Transaction was cancelled or failed. If you were charged, please paste the SMS below.')
            setStatus('fallback_sms')
          }
        }
      }, 3000) // Check every 3 seconds
    }

    return () => clearInterval(pollInterval)
  }, [status, currentReference])

  if (!isOpen) return null

  const resetModal = () => {
    setStatus('idle')
    setTimer(20)
    setError(null)
    setMpesaMessage('')
    setCurrentReference(null)
    onClose()
  }

  // Handle Initiating STK Prompt & Starting Timer
  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phoneNumber || !amount) return

    setError(null)
    setStatus('prompting')
    setTimer(20)

    try {
      const response = await fetch('/api/paybridge/stkpush', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: phoneNumber, 
          amount: Number(amount),
          userId: userId 
        }),
      })
      
      const resData = await response.json()
      
      // 🔥 FIXED: The backend returns { success: true, data: {...}, reference: "GP-..." }
      // We need to grab the reference correctly
      const ref = resData.reference || resData.data?.reference;

      if (resData.success && ref) {
        setCurrentReference(ref)
      } else {
        throw new Error(resData.error || 'Failed to trigger prompt')
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please use the SMS fallback.')
      setStatus('fallback_sms')
    }
  }

  // Handle Manual Code / SMS Submission (Fallback)
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
        <button
          onClick={resetModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* State 1: Default Deposit Input */}
        {status === 'idle' && (
          <form onSubmit={handleInitiatePayment} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">M-Pesa Contribution</h2>
                <p className="text-slate-500 text-xs">Trigger prompt or submit transaction code</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712011554"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Amount (KES)
              </label>
              <input
                type="number"
                required
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1000"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-2.5 rounded-xl font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/20"
            >
              Send STK Prompt & Start Timer
            </button>
          </form>
        )}

        {/* State 2: Countdown Screen (Also Polling Supabase in background) */}
        {status === 'prompting' && (
          <div className="text-center py-6 space-y-4">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
              <Smartphone className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Check Your Phone!</h3>
              <p className="text-slate-500 text-xs">Sending prompt to <strong className="text-slate-800">{phoneNumber}</strong></p>
              <p className="text-slate-500 text-xs">Enter your M-Pesa PIN on your phone screen.</p>
            </div>

            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl p-3 inline-flex items-center gap-2 text-xs font-bold">
              <Clock className="w-4 h-4 animate-pulse" /> Waiting for response: {timer} seconds
            </div>

            <button
              type="button"
              onClick={() => setStatus('fallback_sms')}
              className="block w-full text-xs font-bold text-slate-500 hover:text-emerald-700 underline pt-2"
            >
              Already paid or no prompt received? Paste SMS code here
            </button>
          </div>
        )}

        {/* State 3: SMS Fallback Form */}
        {status === 'fallback_sms' && (
          <form onSubmit={handleSMSSubmit} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3.5 rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong className="block font-bold">STK Prompt Timeout / Gateway Delay</strong>
                <span>Please paste your M-Pesa confirmation SMS or transaction reference below for Treasurer approval.</span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs p-2.5 rounded-xl font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                M-Pesa Confirmation SMS / Reference Code
              </label>
              <textarea
                required
                rows={3}
                value={mpesaMessage}
                onChange={(e) => setMpesaMessage(e.target.value)}
                placeholder="Paste code (e.g. QHK89234X) or full M-Pesa SMS..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-mono font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs uppercase"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" /> Submit for Treasurer Approval
            </button>
          </form>
        )}

        {/* State 4: Success View (Triggered automatically by Webhook) */}
        {status === 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-slate-900 font-bold text-lg">Deposit Successful!</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Your M-Pesa payment was confirmed and your balance has been updated automatically.
            </p>
            <button
              onClick={resetModal}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-md"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}