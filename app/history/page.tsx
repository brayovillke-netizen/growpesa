'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/history')
      .then(res => res.json())
      .then(d => {
        setHistory(d.history || []);
        setLoading(false);
      });
  }, []);

  const filteredHistory = history.filter((item) => {
    const search = searchTerm.toLowerCase();
    return item.type.toLowerCase().includes(search) || 
           item.amount.toString().includes(search) ||
           (item.code && item.code.toLowerCase().includes(search));
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">Full History</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Back</Link>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by type, amount, or M-Pesa code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-green-deep focus:border-green-deep block pl-11 p-3.5 shadow-sm outline-none"
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading history...</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {filteredHistory.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No records found.
              </div>
            ) : (
              filteredHistory.map((item, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.type === 'Savings' ? 'bg-green-50 text-green-600' : 
                      item.type === 'Loan Taken' ? 'bg-amber-50 text-amber-warm' : 
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {item.type === 'Savings' ? '↓' : item.type === 'Loan Taken' ? '↑' : '✓'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{item.type}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {item.code && <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.code}</p>}
                    </div>
                  </div>
                  <p className="font-bold text-gray-900">
                    KSh {Number(item.amount).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}