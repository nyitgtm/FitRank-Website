'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import LeaderboardView from '@/components/LeaderboardView';
import UsersView from '@/components/UsersView';
import VideoUploadView from '@/components/VideoUploadView';
import PostsView from '@/components/PostsView';
import ItemShopView from '@/components/ItemShopView';
import GymsView from '@/components/GymsView';

type TabType = 'leaderboard' | 'users' | 'videos' | 'posts' | 'shop' | 'gyms' | null;

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
        {/* Tab Navigation */}
        <div className="flex gap-3 mb-10 p-2 bg-[#f5f5f7] rounded-2xl">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 px-6 py-3.5 rounded-xl text-[15px] font-medium transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-6 py-3.5 rounded-xl text-[15px] font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            All Users
          </button>
          <button
            onClick={() => setActiveTab(prev => (prev === 'videos' ? null : 'videos'))}
            className={`flex-1 px-6 py-3.5 rounded-xl text-[15px] font-medium transition-all ${
              activeTab === 'videos'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setActiveTab(prev => (prev === 'posts' ? null : 'posts'))}
            className={`flex-1 px-6 py-3.5 rounded-xl text-[15px] font-medium transition-all ${
              activeTab === 'posts'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 px-6 py-3.5 rounded-xl text-[15px] font-medium transition-all ${
              activeTab === 'shop'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Item Shop
          </button>
          <button
            onClick={() => setActiveTab('gyms')}
            className={`flex-1 px-6 py-3.5 rounded-xl text-[15px] font-medium transition-all ${
              activeTab === 'gyms'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Gyms
          </button>
        </div>

        {/* Content */}
        <div className="bg-white">
          {activeTab === 'leaderboard' && <LeaderboardView />}
          {activeTab === 'users' && <UsersView />}
          {activeTab === 'videos' && <VideoUploadView />}
          {activeTab === 'posts' && <PostsView />}
          {activeTab === 'shop' && <ItemShopView />}
          {activeTab === 'gyms' && <GymsView />}
        </div>
      </div>
    </div>
  );
}
