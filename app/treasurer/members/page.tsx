'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if the treasurer has unlocked the session
    if (sessionStorage.getItem('treasurer_unlocked') !== 'true') {
      router.push('/treasurer');
      return;
    }

    fetch('/api/treasurer/members')
      .then(res => {
        if (!res.ok) throw new Error('Denied');
        return res.json();
      })
      .then(d => {
        setMembers(d.members);
        setLoading(false);
      })
      .catch(() => router.push('/treasurer'));
  }, [router]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading members...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-20">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Members</h1>
            <p className="text-xs text-gray-500">Total: {members.length}</p>
          </div>
          <Link href="/treasurer" className="text-sm text-green-deep font-semibold hover:underline">
            Back &rarr;
          </Link>
        </header>

        <div className="space-y-3">
          {members.map((m: any) => (
            <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <p className="font-bold text-gray-900">{m.name}</p>
                <p className="text-xs text-gray-500">{m.phone}</p>
              </div>
              <a 
                href={`/api/treasurer/ledger?memberId=${m.id}`}
                download
                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 transition flex items-center gap-1"
              >
                📥 Ledger
              </a>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}