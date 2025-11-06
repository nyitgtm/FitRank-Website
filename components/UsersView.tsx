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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">All Users</h2>
        <div className="text-sm text-gray-600">
          Total: {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search by name or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Team Filter */}
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Teams</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.icon} {team.name}
            </option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as 'all' | 'coaches' | 'athletes')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Roles</option>
          <option value="coaches">Coaches</option>
          <option value="athletes">Athletes</option>
        </select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl">No users found</p>
          <p className="text-sm mt-2">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => {
            const team = getTeamById(user.team);
            return (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-md p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                  </div>
                  {user.isCoach && (
                    <span className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 rounded-full">
                      Coach
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {team && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">Team:</span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: team.color }}
                      >
                        {team.icon} {team.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Tokens:</span>
                    <span className="text-sm font-bold text-yellow-600">
                      ⭐ {user.tokens}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
