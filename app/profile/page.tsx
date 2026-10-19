'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (!confirm('Are you sure you want to log out?')) return;
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/';
  }

  async function handleDelete() {
    const confirmDelete = confirm(
      'WARNING: Are you sure you want to delete your account? You will lose access to your savings history. This cannot be undone.'
    );
    if (!confirmDelete) return;

    setLoading(true);
    const res = await fetch('/api/delete-account', { method: 'POST' });
    
    if (res.ok) {
      alert('Your account has been deleted.');
      window.location.href = '/';
    } else {
      alert('Failed to delete account.');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
        
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">My Account</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Back</Link>
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-900 font-semibold p-3.5 rounded-xl hover:bg-gray-200 transition"
          >
            Log Out
          </button>

          <button 
            onClick={handleDelete}
            disabled={loading}
            className="w-full bg-red-50 text-red-600 border border-red-200 font-semibold p-3.5 rounded-xl hover:bg-red-100 transition disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>

      </div>
    </main>
  );
}