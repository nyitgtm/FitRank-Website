'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Team } from '@/lib/types';

type SortField = 'username' | 'name' | 'team' | 'tokens' | 'friends' | 'workouts';
type SortDirection = 'asc' | 'desc';

interface ExtendedUser extends User {
  friendsCount: number;
  workoutsCount: number;
}

export default function UsersView() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'coaches' | 'athletes'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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
      
      // Fetch additional data for each user
      const usersDataPromises = snapshot.docs.map(async (doc) => {
        const userData = { id: doc.id, ...doc.data() } as User;
        
        // Get friends count
        const friendsSnap = await getDocs(collection(db, `users/${doc.id}/friends`));
        const friendsCount = friendsSnap.size;
        
        // Get workouts count
        const workoutsQuery = query(
          collection(db, 'workouts'),
          where('userId', '==', doc.id)
        );
        const workoutsSnap = await getDocs(workoutsQuery);
        const workoutsCount = workoutsSnap.size;
        
        return {
          ...userData,
          friendsCount,
          workoutsCount
        } as ExtendedUser;
      });
      
      const usersData = await Promise.all(usersDataPromises);
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
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

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'username':
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        break;
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'team':
        const aTeam = getTeamById(a.team);
        const bTeam = getTeamById(b.team);
        aValue = aTeam?.name.toLowerCase() || '';
        bValue = bTeam?.name.toLowerCase() || '';
        break;
      case 'tokens':
        aValue = a.tokens;
        bValue = b.tokens;
        break;
      case 'friends':
        aValue = a.friendsCount;
        bValue = b.friendsCount;
        break;
      case 'workouts':
        aValue = a.workoutsCount;
        bValue = b.workoutsCount;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-[#86868b]">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-[#0071e3]">↑</span> : <span className="text-[#0071e3]">↓</span>;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">All Users</h2>
        <div className="text-[15px] text-[#86868b]">
          {sortedUsers.length} {sortedUsers.length === 1 ? 'user' : 'users'}
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

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">
          <p className="text-[17px]">No users found</p>
          <p className="text-[14px] mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="bg-white border border-[#d2d2d7] rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-[#f5f5f7] border-b border-[#d2d2d7]">
            <button
              onClick={() => handleSort('username')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Username <SortIcon field="username" />
            </button>
            <button
              onClick={() => handleSort('name')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Name <SortIcon field="name" />
            </button>
            <button
              onClick={() => handleSort('team')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Team <SortIcon field="team" />
            </button>
            <button
              onClick={() => handleSort('tokens')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Tokens <SortIcon field="tokens" />
            </button>
            <button
              onClick={() => handleSort('friends')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Friends <SortIcon field="friends" />
            </button>
            <button
              onClick={() => handleSort('workouts')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Workouts <SortIcon field="workouts" />
            </button>
          </div>

          {/* Table Body */}
          {sortedUsers.map((user, index) => {
            const team = getTeamById(user.team);
            const isEven = index % 2 === 0;
            return (
              <div
                key={user.id}
                className={`grid grid-cols-6 gap-4 px-6 py-4 ${
                  isEven ? 'bg-white' : 'bg-[#f5f5f7]'
                } hover:bg-[#e8e8ed] transition-colors`}
              >
                <div className="text-[15px] text-[#1d1d1f] flex items-center">
                  @{user.username}
                  {user.isCoach && (
                    <span className="ml-2 px-2 py-0.5 text-[11px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-full">
                      Coach
                    </span>
                  )}
                </div>
                <div className="text-[15px] text-[#1d1d1f]">{user.name}</div>
                <div className="text-[15px]" style={{ color: team?.color || '#86868b' }}>
                  {team?.name || 'No Team'}
                </div>
                <div className="text-[15px] font-medium text-[#1d1d1f]">{user.tokens}</div>
                <div className="text-[15px] text-[#86868b]">{user.friendsCount}</div>
                <div className="text-[15px] text-[#86868b]">{user.workoutsCount}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
