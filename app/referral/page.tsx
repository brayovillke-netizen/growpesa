'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ReferralPage() {
  const [data, setData] = useState<{ code: string, invites: number, earned: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral')
      .then(res => res.json())
      .then(d => setData(d));
  }, []);

  function copyCode() {
    if (data?.code) {
      navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!data) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">Invite Friends</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Back</Link>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium mb-4">Your unique code</p>
          <div 
            onClick={copyCode}
            className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl py-4 cursor-pointer hover:bg-gray-100 transition"
          >
            <h2 className="text-3xl font-bold tracking-widest text-green-deep">{data.code}</h2>
            <p className="text-xs text-amber-warm font-semibold mt-2">
              {copied ? 'Copied!' : 'Tap to copy'}
            </p>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Earn <strong className="text-gray-900">KSh 3</strong> when they save their first KSh 100.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium mb-1">Friends Joined</p>
            <p className="text-2xl font-bold text-gray-900">{data.invites}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-green-deep">KSh {data.earned}</p>
          </div>
        </div>

        <div className="text-center pt-4">
          <p className="text-xs text-gray-400">Max 20 rewards per month.</p>
        </div>

      </div>
    </main>
  );
}