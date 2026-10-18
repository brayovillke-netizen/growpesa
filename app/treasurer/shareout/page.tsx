'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ShareoutPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/treasurer/shareout')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-6 text-center text-gray-500">Calculating...</div>;

  const totalPayout = data.shareoutList.reduce((sum: number, m: any) => sum + m.net, 0);
  const totalFees = data.shareoutList.reduce((sum: number, m: any) => sum + m.fee, 0);

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Share-out Day</h1>
            <p className="text-xs text-gray-500">Final Payouts</p>
          </div>
          <Link href="/treasurer" className="text-sm text-green-deep font-semibold hover:underline">
            Back &rarr;
          </Link>
        </header>

        {/* Totals Summary */}
        <div className="bg-green-deep rounded-2xl p-5 shadow-sm text-white flex justify-between items-center">
          <div>
            <p className="text-xs font-medium opacity-80 mb-1">Total to Send</p>
            <h2 className="text-2xl font-bold">KSh {totalPayout.toLocaleString()}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium opacity-80 mb-1">Group Fees Kept</p>
            <h2 className="text-xl font-bold text-amber-warm">KSh {totalFees.toLocaleString()}</h2>
          </div>
        </div>

        {/* Member List */}
        <div className="space-y-3">
          {data.shareoutList.map((member: any) => (
            <div key={member.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Send via M-Pesa</p>
                  <p className="font-bold text-green-deep text-lg">KSh {member.net.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Saved</p>
                  <p className="font-semibold text-gray-900">{member.saved.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Loan Debt</p>
                  <p className="font-semibold text-red-500">-{member.debt.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">5% Fee</p>
                  <p className="font-semibold text-amber-warm">-{member.fee.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data.shareoutList.length === 0 && (
          <div className="text-center text-gray-500 py-10">No active members to pay out.</div>
        )}

      </div>
    </main>
  );
}