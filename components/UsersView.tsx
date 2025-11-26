'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, Team } from '@/lib/types';

type SortField = 'username' | 'name' | 'team' | 'tokens' | 'friends' | 'workouts';
type SortDirection = 'asc' | 'desc';

interface ExtendedUser extends User {
  friendsCount: number;
  workoutsCount: number;
  isSuspended?: boolean;
}

type ActionModalType = 'tokens' | 'username' | 'name' | 'team' | null;

export default function UsersView() {
  const [users, setUsers] = useState<ExtendedUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<'all' | 'coaches' | 'athletes'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'suspended' | 'deleted' | 'flagged'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Action menu state
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ActionModalType>(null);
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [modalValue, setModalValue] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [sendingResetUserId, setSendingResetUserId] = useState<string | null>(null);

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
          workoutsCount,
          isSuspended: false // Will be fetched from Auth
        } as ExtendedUser;
      });

      const usersData = await Promise.all(usersDataPromises);

      // Fetch suspension statuses from Firebase Auth
      const userIds = usersData.map(u => u.id);
      try {
        const response = await fetch('/api/users/get-auth-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds })
        });

        if (response.ok) {
          const { userStatuses } = await response.json();
          usersData.forEach(user => {
            user.isSuspended = userStatuses[user.id] || false;
          });
        }
      } catch (error) {
        console.error('Error fetching auth statuses:', error);
      }

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

  const openActionModal = (user: ExtendedUser, type: ActionModalType) => {
    setSelectedUser(user);
    setModalType(type);
    setActiveMenuUserId(null);

    // Pre-fill modal with current values
    if (type === 'tokens') {
      setModalValue(user.tokens.toString());
    } else if (type === 'username') {
      setModalValue(user.username);
    } else if (type === 'name') {
      setModalValue(user.name);
    } else if (type === 'team') {
      const teamId = user.team.split('/').pop() || '';
      setModalValue(teamId);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setModalValue('');
  };

  const toggleSuspension = async (user: ExtendedUser) => {
    const action = user.isSuspended ? 'unsuspend' : 'suspend';
    const ok = confirm(`Are you sure you want to ${action} ${user.name}? This will ${user.isSuspended ? 'enable' : 'disable'} their Firebase Authentication account.`);
    if (!ok) return;

    setActiveMenuUserId(null);
    setUpdating(true);
    try {
      const response = await fetch('/api/users/toggle-suspension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          disabled: !user.isSuspended
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      await fetchData();
    } catch (error: any) {
      console.error('Error toggling suspension:', error);
      alert('Failed to update suspension status: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const sendPasswordReset = async (user: ExtendedUser) => {
    const okConfirm = confirm(
      `Send password reset email for ${user.name} (@${user.username})?`
    );
    if (!okConfirm) return;

    setActiveMenuUserId(null);
    setSendingResetUserId(user.id);
    try {
      const response = await fetch('/api/users/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset');
      }

      alert(data.message || `Password reset email sent to ${data.email || 'user'}`);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      alert('Failed to send password reset: ' + (error.message || error));
    } finally {
      setSendingResetUserId(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser || !modalType) return;

    setUpdating(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);

      if (modalType === 'tokens') {
        const tokens = parseInt(modalValue);
        if (isNaN(tokens)) {
          alert('Please enter a valid number');
          return;
        }
        await updateDoc(userRef, { tokens });
      } else if (modalType === 'username') {
        if (!modalValue.trim()) {
          alert('Username cannot be empty');
          return;
        }
        await updateDoc(userRef, { username: modalValue.trim() });
      } else if (modalType === 'name') {
        if (!modalValue.trim()) {
          alert('Name cannot be empty');
          return;
        }
        await updateDoc(userRef, { name: modalValue.trim() });
      } else if (modalType === 'team') {
        if (!modalValue) {
          alert('Please select a team');
          return;
        }
        await updateDoc(userRef, { team: `teams/${modalValue}` });
      }

      // Refresh data
      await fetchData();
      closeModal();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. See console for details.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = filterTeam === 'all' || user.team.includes(filterTeam);
    const matchesRole = filterRole === 'all' ||
      (filterRole === 'coaches' && user.isCoach) ||
      (filterRole === 'athletes' && !user.isCoach);
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'suspended' && user.isSuspended) ||
      (filterStatus === 'deleted' && user.deleteUser) ||
      (filterStatus === 'flagged' && (user.isSuspended || user.deleteUser));
    return matchesSearch && matchesTeam && matchesRole && matchesStatus;
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

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'suspended' | 'deleted' | 'flagged')}
          className="px-5 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
          <option value="flagged">Suspended & Deleted</option>
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
        <div className="bg-white border border-[#d2d2d7] rounded-2xl overflow-visible">
          {/* Table Header */}
          <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-[#f5f5f7] border-b border-[#d2d2d7]">
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
            <div className="text-left text-[14px] font-semibold text-[#1d1d1f]">
              Actions
            </div>
          </div>

          {/* Table Body */}
          {sortedUsers.map((user, index) => {
            const team = getTeamById(user.team);
            const isEven = index % 2 === 0;
            const isMenuOpen = activeMenuUserId === user.id;
            return (
              <div
                id={`user-row-${user.id}`}
                key={user.id}
                className={`grid grid-cols-7 gap-4 px-6 py-4 ${user.deleteUser ? 'bg-red-50' : isEven ? 'bg-white' : 'bg-[#f5f5f7]'
                  } hover:bg-[#e8e8ed] transition-colors`}
              >
                <div className="text-[15px] text-[#1d1d1f] flex items-center gap-2 flex-wrap">
                  @{user.username}
                  {user.isCoach && (
                    <span className="px-2 py-0.5 text-[11px] font-medium text-[#0071e3] bg-[#0071e3]/10 rounded-full">
                      Coach
                    </span>
                  )}
                  {user.isSuspended && (
                    <span className="px-2 py-0.5 text-[11px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-full">
                      Suspended
                    </span>
                  )}
                  {user.deleteUser && (
                    <span className="px-2 py-0.5 text-[11px] font-medium text-[#ff3b30] bg-[#ff3b30]/10 rounded-full">
                      Deleted
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
                <div className="relative">
                  <button
                    onClick={() => {
                      const opening = !isMenuOpen;
                      setActiveMenuUserId(opening ? user.id : null);
                      if (opening) {
                        // ensure the row (and dropdown) is visible in the viewport
                        setTimeout(() => {
                          const el = document.getElementById(`user-row-${user.id}`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }, 100);
                      }
                    }}
                    className="px-3 py-1.5 text-[#1d1d1f] hover:bg-[#d2d2d7] rounded-lg transition-colors text-[18px] font-bold"
                  >
                    ⋯
                  </button>

                  {isMenuOpen && (
                    <>
                      <div
                        className="absolute inset-0 z-40"
                        onClick={() => setActiveMenuUserId(null)}
                      />
                      <div className="absolute right-0 mt-1 w-48 bg-white border border-[#d2d2d7] rounded-xl shadow-lg z-50 overflow-visible">
                        <button
                          onClick={() => openActionModal(user, 'tokens')}
                          className="w-full text-left px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
                        >
                          Modify Tokens
                        </button>
                        <button
                          onClick={() => openActionModal(user, 'username')}
                          className="w-full text-left px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors border-t border-[#d2d2d7]"
                        >
                          Change Username
                        </button>
                        <button
                          onClick={() => openActionModal(user, 'name')}
                          className="w-full text-left px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors border-t border-[#d2d2d7]"
                        >
                          Change Name
                        </button>
                        <button
                          onClick={() => openActionModal(user, 'team')}
                          className="w-full text-left px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors border-t border-[#d2d2d7]"
                        >
                          Change Team
                        </button>
                        <button
                          onClick={() => sendPasswordReset(user)}
                          disabled={sendingResetUserId === user.id}
                          className="w-full text-left px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors border-t border-[#d2d2d7] disabled:opacity-50"
                        >
                          {sendingResetUserId === user.id ? 'Sending...' : 'Send Password Reset'}
                        </button>
                        <button
                          onClick={() => toggleSuspension(user)}
                          className={`w-full text-left px-4 py-3 text-[14px] hover:bg-[#f5f5f7] transition-colors border-t border-[#d2d2d7] ${user.isSuspended ? 'text-[#34c759]' : 'text-[#ff3b30]'
                            }`}
                        >
                          {user.isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Modal */}
      {modalType && selectedUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#d2d2d7]">
              <h3 className="text-[20px] font-semibold text-[#1d1d1f]">
                {modalType === 'tokens' && 'Modify Tokens'}
                {modalType === 'username' && 'Change Username'}
                {modalType === 'name' && 'Change Name'}
                {modalType === 'team' && 'Change Team'}
              </h3>
              <p className="text-[14px] text-[#86868b] mt-1">
                {selectedUser.name} (@{selectedUser.username})
              </p>
            </div>

            <div className="p-6">
              {modalType === 'team' ? (
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                    Select Team
                  </label>
                  <select
                    value={modalValue}
                    onChange={(e) => setModalValue(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                  >
                    <option value="">Select a team...</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">
                    {modalType === 'tokens' && 'New Token Amount'}
                    {modalType === 'username' && 'New Username'}
                    {modalType === 'name' && 'New Name'}
                  </label>
                  <input
                    type={modalType === 'tokens' ? 'number' : 'text'}
                    value={modalValue}
                    onChange={(e) => setModalValue(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f5f5f7] border border-transparent rounded-xl text-[15px] text-[#1d1d1f] focus:outline-none focus:bg-white focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                    placeholder={
                      modalType === 'tokens' ? 'Enter token amount' :
                        modalType === 'username' ? 'Enter new username' :
                          'Enter new name'
                    }
                  />
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#d2d2d7] flex gap-3 justify-end">
              <button
                onClick={closeModal}
                disabled={updating}
                className="px-5 py-2.5 rounded-xl bg-[#f5f5f7] text-[#1d1d1f] text-[14px] font-medium hover:bg-[#e8e8ed] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className={`px-5 py-2.5 rounded-xl text-white text-[14px] font-medium ${updating ? 'bg-[#86868b] cursor-not-allowed' : 'bg-[#0071e3] hover:bg-[#0077ed]'
                  }`}
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
