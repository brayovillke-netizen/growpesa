'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, Loader2, Sparkles, Clock, ShieldCheck } from 'lucide-react'

const PACKAGES = [
  { name: 'Bronze', entry: 200, daily: 20, cut: 2, net: 18, period: 'Daily Claim (10% Group Cut / 90% Savings Sweep)', bg: 'from-amber-700 to-amber-900', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80' },
  { name: 'Silver', entry: 500, daily: 50, cut: 5, net: 45, period: 'Daily Claim (10% Group Cut / 90% Savings Sweep)', bg: 'from-slate-400 to-slate-600', img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80' },
  { name: 'Gold', entry: 1000, daily: 100, cut: 10, net: 90, period: 'Daily Claim (10% Group Cut / 90% Savings Sweep)', bg: 'from-yellow-500 to-amber-600', img: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Emerald', entry: 2500, daily: 250, cut: 25, net: 225, period: 'Daily Claim (10% Group Cut / 90% Savings Sweep)', bg: 'from-emerald-500 to-teal-700', img: 'https://images.unsplash.com/photo-1599707367072-cd6ca233987c?w=400&auto=format&fit=crop&q=80' },
  { name: 'Ruby', entry: 5000, daily: 500, cut: 50, net: 450, period: 'Daily Claim (10% Group Cut / 90% Savings Sweep)', bg: 'from-rose-600 to-red-800', img: 'https://images.unsplash.com/photo-1615529162924-f8605388461d?w=400&auto=format&fit=crop&q=80' },
  { name: 'Sapphire', entry: 10000, daily: 1000, cut: 100, net: 900, period: 'Daily Claim (10% Group Cut / 90% Savings Sweep)', bg: 'from-blue-600 to-indigo-800', img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&auto=format&fit=crop&q=80' },
  { name: 'Platinum', entry: 20000, daily: 2000, cut: 200, net: 1800, period: 'Daily Claim (10% Group Cut / 90% Savings Sweep)', bg: 'from-violet-700 to-purple-900', img: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&auto=format&fit=crop&q=80' },
]

export default function PackageTiersView() {
  const [selectedPkg, setSelectedPkg] = useState(PACKAGES[0])
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  const handleClaimAllowance = async () => {
    setClaiming(true)
    setTimeout(() => {
      setClaiming(false)
      setClaimed(true)
    }, 1000)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 font-sans text-slate-800">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" /> GrowPesa Packages
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">Select a package to claim daily allowance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.name}
            onClick={() => { setSelectedPkg(pkg); setClaimed(false); }}
            className={`relative rounded-xl overflow-hidden border text-center transition-all group h-24 flex flex-col justify-end p-2 ${
              selectedPkg.name === pkg.name
                ? 'ring-2 ring-emerald-500 ring-offset-2 shadow-md scale-[1.02]'
                : 'border-slate-200 hover:opacity-95'
            }`}
          >
            <div className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110" style={{ backgroundImage: `url(${pkg.img})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <div className="relative z-10 text-white">
              <p className="text-[10px] font-black uppercase tracking-wider">{pkg.name}</p>
              <p className="text-xs font-extrabold text-emerald-300">KES {pkg.entry.toLocaleString()}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Package</span>
            <h3 className="text-base font-black text-slate-900">{selectedPkg.name} Package</h3>
          </div>
          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            Entry: KES {selectedPkg.entry.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Daily Allowance</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5">KES {selectedPkg.daily.toLocaleString()} / day</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Main Pool Sweep (90%)</p>
              <p className="text-sm font-black text-slate-800 mt-0.5">+ KES {selectedPkg.net}</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-[11px] text-blue-800 font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 text-blue-600" />
            <span>{selectedPkg.period}</span>
          </div>
        </div>

        {claimed ? (
          <div className="bg-emerald-600 text-white p-3 rounded-xl text-center text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20">
            <CheckCircle2 className="w-4 h-4" /> KES {selectedPkg.net} Swept to Main Pool Successfully!
          </div>
        ) : (
          <button
            onClick={handleClaimAllowance}
            disabled={claiming}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {claiming ? 'Processing Daily Sweep...' : `Claim Daily Allowance (KES ${selectedPkg.daily})`}
          </button>
        )}
      </div>
    </div>
  )
}
