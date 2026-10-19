'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TreasurerBottomNav from '../../components/TreasurerBottomNav';

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
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

  // Filter members based on search input
  const filteredMembers = members.filter((m) => {
    const search = searchTerm.toLowerCase();
    return m.name.toLowerCase().includes(search) || m.phone.includes(search);
  });

  if (loading) return <div className="p-6 text-center text-gray-500">Loading members...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        
        <header className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Members</h1>
            <p className="text-xs text-gray-500">Total: {members.length}</p>
          </div>
        </header>

        {/* SEARCH BAR */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-900 text-sm rounded-2xl focus:ring-green-deep focus:border-green-deep block pl-11 p-3.5 shadow-sm outline-none"
          />
        </div>

        <div className="space-y-3">
          {filteredMembers.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8 bg-white rounded-2xl border border-gray-100">
              No members found matching "{searchTerm}"
            </div>
          ) : (
            filteredMembers.map((m: any) => (
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
            ))
          )}
        </div>

      </div>
      <TreasurerBottomNav />
    </main>
  );
}