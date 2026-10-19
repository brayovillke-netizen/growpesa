'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';

export default function ReferralPage() {
  const [data, setData] = useState<{ code: string, invites: number, earned: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referral')
      .then(res => res.json())
      .then(d => setData(d));
  }, []);

  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/join?ref=${data?.code}` 
    : '';

  function copyCode() {
    if (data?.code) {
      navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function shareLink() {
    if (!data?.code) return;

    const shareData = {
      title: 'Join GrowPesa',
      text: `Join me on GrowPesa! Save weekly and borrow when ready. Use my link to join:`,
      url: referralLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${referralLink}`);
        alert('Invite link copied to clipboard! Send it to a friend.');
      }
    } catch (err) {
      console.log('Error sharing', err);
    }
  }

  if (!data) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold text-gray-900">Invite Friends</h1>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">Back</Link>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-deep">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Earn KSh 3</h2>
          <p className="text-sm text-gray-500 mb-6 px-4">
            Share your link. When they join and save KSh 100, you instantly get KSh 3 added to your savings!
          </p>

          <button onClick={shareLink} className="w-full bg-green-deep text-white font-semibold p-3.5 rounded-xl hover:bg-green-800 transition flex items-center justify-center gap-2 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            Share Invite Link
          </button>
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

        <div className="text-center pt-2">
          <p className="text-xs text-gray-400 mb-2">Or share your code</p>
          <div onClick={copyCode} className="bg-white border border-gray-200 rounded-xl py-3 px-6 inline-block cursor-pointer hover:bg-gray-50 transition">
            <span className="text-lg font-bold tracking-widest text-gray-900">{data.code}</span>
            <p className="text-[10px] text-amber-warm font-semibold mt-1">
              {copied ? 'Copied!' : 'Tap to copy'}
            </p>
          </div>
        </div>

      </div>
      <BottomNav />
    </main>
  );
}