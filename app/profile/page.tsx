'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.json())
      .then(d => {
        if (d.name) {
          setName(d.name);
          setPhone(d.phone);
        }
        setLoading(false);
      });
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    
    // If they typed a new PIN but didn't provide the old one
    if (newPin && !currentPin) {
      alert('Please enter your current PIN to set a new one.');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'POST',
      body: JSON.stringify({ name, currentPin, newPin }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert('Profile updated successfully!');
      setCurrentPin('');
      setNewPin('');
    } else {
      alert(data.error || 'Failed to update profile');
    }
    setSaving(false);
  }

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

    setDeleting(true);
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        alert('Your account has been deleted.');
        window.location.href = '/';
      } else {
        alert(data.error || 'Failed to delete account.');
        setDeleting(false);
      }
    } catch (err) {
      alert('Network error. Failed to delete account.');
      setDeleting(false);
    }
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading profile...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Back</Link>
        </div>

        {/* Edit Profile Form */}
        <form onSubmit={handleUpdate} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input 
              type="text" required value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Read-only)</label>
            <input 
              type="text" readOnly value={phone} 
              className="w-full border border-gray-200 bg-gray-50 text-gray-500 p-3 rounded-xl outline-none cursor-not-allowed" 
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Change PIN</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current PIN</label>
                <input 
                  type="password" maxLength={4} placeholder="••••"
                  value={currentPin} onChange={e => setCurrentPin(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none tracking-widest" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New PIN</label>
                <input 
                  type="password" maxLength={4} placeholder="••••"
                  value={newPin} onChange={e => setNewPin(e.target.value)}
                  className="w-full border border-gray-300 p-3 rounded-xl focus:ring-2 focus:ring-green-deep outline-none tracking-widest" 
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full bg-green-deep text-white font-semibold p-3.5 rounded-xl mt-2 hover:bg-green-800 transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Security Actions */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Account Actions</h3>
          
          <button onClick={handleLogout} className="w-full bg-gray-100 text-gray-900 font-semibold p-3.5 rounded-xl hover:bg-gray-200 transition">
            Log Out
          </button>

          <button onClick={handleDelete} disabled={deleting} className="w-full bg-red-50 text-red-600 border border-red-200 font-semibold p-3.5 rounded-xl hover:bg-red-100 transition disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete My Account'}
          </button>
        </div>

      </div>
      <BottomNav />
    </main>
  );
}