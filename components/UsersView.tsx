'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Team } from '@/lib/types';

export default function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'coaches' | 'athletes'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch teams
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);

      // Fetch users
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamById = (teamRef: string): Team | undefined => {
    const teamId = teamRef.split('/').pop();
    return teams.find(t => t.id === teamId);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = filterTeam === 'all' || user.team.includes(filterTeam);
    const matchesRole = filterRole === 'all' || 
                       (filterRole === 'coaches' && user.isCoach) ||
                       (filterRole === 'athletes' && !user.isCoach);
    return matchesSearch && matchesTeam && matchesRole;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">All Users</h2>
        <div className="text-[15px] text-[#86868b]">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-8">
        {/* Search */}
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-5 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
        />

        {/* Team Filter */}
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="px-5 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 cursor-pointer"
        >
          <option value="all">All Teams</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as 'all' | 'coaches' | 'athletes')}
          className="px-5 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 cursor-pointer"
        >
          <option value="all">All Roles</option>
          <option value="coaches">Coaches</option>
          <option value="athletes">Athletes</option>
        </select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">
          <p className="text-[17px]">No users found</p>
          <p className="text-[14px] mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white border border-[#d2d2d7] rounded-2xl overflow-hidden">
          {filteredUsers.map((user, index) => {
            const team = getTeamById(user.team);
            return (
              <div
                key={user.id}
                className={`flex items-center gap-4 px-6 py-5 hover:bg-[#f5f5f7] transition-colors ${
                  index !== filteredUsers.length - 1 ? 'border-b border-[#d2d2d7]' : ''
                }`}
              >
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-[17px] text-[#1d1d1f]">{user.name}</h3>
                    {user.isCoach && (
                      <span className="px-2.5 py-0.5 text-[12px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-full">
                        Coach
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[14px] text-[#86868b]">
                    <span>@{user.username}</span>
                    {team && (
                      <>
                        <span>•</span>
                        <span style={{ color: team.color }}>
                          {team.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Tokens */}
                <div className="text-right">
                  <p className="text-[17px] font-semibold text-[#1d1d1f]">
                    {user.tokens}
                  </p>
                  <p className="text-[13px] text-[#86868b]">tokens</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
