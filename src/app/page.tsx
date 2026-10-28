import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6">
      {/* Top Navbar */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-bold text-slate-950 text-lg">
            T
          </div>
          <span className="text-xl font-bold tracking-tight">
            Tiba<span className="text-emerald-400">Pay</span>
          </span>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition"
        >
          Sign In
        </Link>
      </div>

      {/* Hero Section */}
      <div className="my-auto text-center max-w-lg mx-auto">
        <span className="inline-block rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 mb-6">
          COMMUNITY SAVINGS & PAYOUTS
        </span>
        <h1 className="text-4xl font-black tracking-tight text-white mb-4">
          Smart savings made effortless.
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          Manage weekly savings, track payout cycles, and transfer seamlessly—all in one secure PWA.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full rounded-2xl bg-emerald-500 py-3.5 text-center font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
          >
            Open Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="block w-full rounded-2xl border border-slate-800 bg-slate-900/60 py-3.5 text-center font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Get Started
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-4">
        © 2026 TibaPay. Built for reliable group & personal finance management.
      </footer>
    </main>
  );
}