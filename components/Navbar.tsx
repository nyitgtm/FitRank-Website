'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-[#d2d2d7]">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-[#1d1d1f] tracking-tight">FitRank</h1>
            <span className="text-[14px] text-[#86868b]">Coaches Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[15px] font-medium text-[#1d1d1f]">{user.name}</p>
              <p className="text-[13px] text-[#86868b]">@{user.username}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 text-[14px] font-medium text-white bg-[#1d1d1f] rounded-lg hover:bg-[#2d2d2f] active:bg-[#0d0d0f]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
