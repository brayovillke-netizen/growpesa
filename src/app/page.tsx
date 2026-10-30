'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden flex flex-col">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"></div>

      {/* HEADER */}
      <header className="p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 font-black text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
            T
          </div>
          <span className="text-xl font-black tracking-tight">
            Tiba<span className="text-emerald-400">Pay</span>
          </span>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 max-w-lg mx-auto text-center space-y-8 mt-[-40px]">
        
        {/* Trust Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-widest shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Community Savings & Payouts
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight">
          Grow your wealth, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            effortlessly.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto font-medium">
          Secure your future with automated savings, micro-loans, and daily payouts. Built for the modern hustle.
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-2">
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 shadow-lg">
            <span className="text-xl">🏦</span>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Save</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 shadow-lg">
            <span className="text-xl">⚡</span>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Borrow</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-col items-center gap-1.5 shadow-lg">
            <span className="text-xl">💸</span>
            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">Withdraw</span>
          </div>
        </div>

        {/* THE ONLY BUTTON NEEDED */}
        <div className="w-full pt-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black rounded-2xl text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 ease-out cursor-pointer flex items-center justify-center gap-2"
          >
            Enter Vault
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </button>
          <p className="text-[9px] text-slate-500 mt-3 font-medium">Sign in or create an account instantly.</p>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="p-6 text-center relative z-10">
        <p className="text-[10px] text-slate-600 font-medium">
          © {new Date().getFullYear()} TibaPay. Built for reliable group & personal finance.
        </p>
      </footer>
    </div>
  );
}