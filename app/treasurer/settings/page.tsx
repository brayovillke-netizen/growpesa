'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/treasurer/settings')
      .then(res => res.json())
      .then(d => {
        setSettings(d);
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch('/api/treasurer/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });

    if (res.ok) {
      alert('Settings saved successfully!');
    } else {
      alert('Failed to save settings');
    }
    setSaving(false);
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Group Settings</h1>
            <p className="text-xs text-gray-500">Rules & Parameters</p>
          </div>
          <Link href="/treasurer" className="text-sm text-green-deep font-semibold hover:underline">
            Back &rarr;
          </Link>
        </header>

        <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Savings Goal (KSh)</label>
            <input 
              type="number" 
              value={settings.weekly_goal || 100}
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
              onChange={e => setSettings({ ...settings, weekly_goal: Number(e.target.value) })} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Borrow Limit (% of savings)</label>
            <input 
              type="number" 
              value={settings.borrow_limit_pct || 25}
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
              onChange={e => setSettings({ ...settings, borrow_limit_pct: Number(e.target.value) })} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loan Fee (%)</label>
            <input 
              type="number" 
              value={settings.loan_fee_pct || 5}
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
              onChange={e => setSettings({ ...settings, loan_fee_pct: Number(e.target.value) })} 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Share-out Date</label>
            <input 
              type="date" 
              value={settings.shareout_date || '2026-12-27'}
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
              onChange={e => setSettings({ ...settings, shareout_date: e.target.value })} 
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Interest Rates (%)</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">1 Week</label>
                <input type="number" value={settings.interest_1wk || 3} className="w-full border p-2 rounded-lg" onChange={e => setSettings({ ...settings, interest_1wk: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">2 Weeks</label>
                <input type="number" value={settings.interest_2wk || 5} className="w-full border p-2 rounded-lg" onChange={e => setSettings({ ...settings, interest_2wk: Number(e.target.value) })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">4 Weeks</label>
                <input type="number" value={settings.interest_4wk || 10} className="w-full border p-2 rounded-lg" onChange={e => setSettings({ ...settings, interest_4wk: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={saving} 
            className="w-full bg-green-deep text-white font-semibold p-3.5 rounded-xl mt-2 hover:bg-green-800 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>
    </main>
  );
}