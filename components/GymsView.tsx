'use client';

import { useEffect, useState, Fragment } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Gym {
  id: string;
  name: string;
  location: {
    address: string;
    lat: number;
    lon: number;
  };
  ownerTeamId: string;
  ownerTeamName: string;
  ownerTeamColor: string;
  bestBenchId?: any;
  bestDeadliftId?: any;
  bestSquatId?: any;
}

const TEAM_NAMES: { [key: string]: string } = {
  '0': 'Default',
  '1': 'Killa Gorrilaz',
  '2': 'Regal Eagles',
  '3': 'Dark Sharks'
};

const TEAM_COLORS: { [key: string]: string } = {
  '0': '#86868b',
  '1': '#ff7700',
  '2': '#ffd700',
  '3': '#00ddff'
};

export default function GymsView() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expandedGymId, setExpandedGymId] = useState<string | null>(null);

  useEffect(() => {
    const fetchGyms = async () => {
      try {
        const gymsSnapshot = await getDocs(collection(db, 'gyms'));
        const gymsData = gymsSnapshot.docs.map(doc => {
          const data = doc.data();
          const teamId = data.ownerTeamId?.id || 'N/A';
          return {
            id: doc.id,
            name: data.name || 'N/A',
            location: data.location || { address: 'N/A', lat: 0, lon: 0 },
            ownerTeamId: teamId,
            ownerTeamName: TEAM_NAMES[teamId] || teamId,
            ownerTeamColor: TEAM_COLORS[teamId] || '#86868b',
            bestBenchId: data.bestBenchId,
            bestDeadliftId: data.bestDeadliftId,
            bestSquatId: data.bestSquatId
          };
        });
        setGyms(gymsData);
      } catch (error) {
        console.error('Error fetching gyms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGyms();
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredGyms = gyms.filter(gym =>
    gym.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gym.location.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedGyms = [...filteredGyms].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue: any = sortConfig.key === 'location' ? a.location.address : a[sortConfig.key as keyof Gym];
    let bValue: any = sortConfig.key === 'location' ? b.location.address : b[sortConfig.key as keyof Gym];

    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) {
      return <span className="text-[#86868b]">↕</span>;
    }
    return sortConfig.direction === 'asc' ? <span className="text-[#0071e3]">↑</span> : <span className="text-[#0071e3]">↓</span>;
  };

  const toggleGymExpansion = (gymId: string) => {
    if (expandedGymId === gymId) {
      setExpandedGymId(null);
    } else {
      setExpandedGymId(gymId);
    }
  };

  const formatReference = (ref: any) => {
    if (!ref) return 'None';
    if (typeof ref === 'string') return ref;
    if (ref.path) return ref.path;
    return 'Reference';
  };

  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionMenu, setActionMenu] = useState<{ gym: Gym; top: number; left: number } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (actionMenu) setActionMenu(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [actionMenu]);

  const [isAdding, setIsAdding] = useState(false);
  const [newGym, setNewGym] = useState({
    name: '',
    location: { address: '', lat: 0, lon: 0 },
    ownerTeamId: '0'
  });

  const handleAddGym = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const ownerTeamRef = newGym.ownerTeamId === '0'
        ? doc(db, 'workouts', '0')
        : doc(db, 'teams', newGym.ownerTeamId);

      const docRef = await addDoc(collection(db, 'gyms'), {
        name: newGym.name,
        location: newGym.location,
        ownerTeamId: ownerTeamRef
      });

      const newGymData: Gym = {
        id: docRef.id,
        name: newGym.name,
        location: newGym.location,
        ownerTeamId: newGym.ownerTeamId,
        ownerTeamName: TEAM_NAMES[newGym.ownerTeamId],
        ownerTeamColor: TEAM_COLORS[newGym.ownerTeamId]
      };

      setGyms(prev => [...prev, newGymData]);
      setIsAdding(false);
      setNewGym({ name: '', location: { address: '', lat: 0, lon: 0 }, ownerTeamId: '0' });
    } catch (error) {
      console.error('Error adding gym:', error);
      alert('Failed to add gym');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGym) return;

    setUpdating(true);
    try {
      const ownerTeamRef = editingGym.ownerTeamId === '0'
        ? doc(db, 'workouts', '0')
        : doc(db, 'teams', editingGym.ownerTeamId);

      const gymRef = doc(db, 'gyms', editingGym.id);
      await updateDoc(gymRef, {
        name: editingGym.name,
        location: editingGym.location,
        ownerTeamId: ownerTeamRef
      });

      // Update local state
      setGyms(prev => prev.map(g => {
        if (g.id === editingGym.id) {
          return {
            ...g,
            name: editingGym.name,
            location: editingGym.location,
            ownerTeamId: editingGym.ownerTeamId,
            ownerTeamName: TEAM_NAMES[editingGym.ownerTeamId] || editingGym.ownerTeamId,
            ownerTeamColor: TEAM_COLORS[editingGym.ownerTeamId] || '#86868b'
          };
        }
        return g;
      }));

      setEditingGym(null);
    } catch (error) {
      console.error('Error updating gym:', error);
      alert('Failed to update gym');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-semibold text-[#1d1d1f]">Gyms</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 bg-[#0071e3] text-white rounded-lg font-medium hover:bg-[#0077ed] transition-colors shadow-sm"
        >
          + Add Gym
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, location, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-[#f5f5f7] border border-[#d2d2d7] rounded-xl text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#d2d2d7]">
        <table className="w-full">
          <thead className="bg-[#f5f5f7]">
            <tr>
              <th
                className="px-6 py-4 text-left text-[14px] font-semibold text-[#1d1d1f] cursor-pointer hover:text-[#0071e3] transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name <SortIcon column="name" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-left text-[14px] font-semibold text-[#1d1d1f] cursor-pointer hover:text-[#0071e3] transition-colors"
                onClick={() => handleSort('location')}
              >
                <div className="flex items-center gap-1">
                  Location <SortIcon column="location" />
                </div>
              </th>
              <th
                className="px-6 py-4 text-left text-[14px] font-semibold text-[#1d1d1f] cursor-pointer hover:text-[#0071e3] transition-colors"
                onClick={() => handleSort('ownerTeamName')}
              >
                <div className="flex items-center gap-1">
                  Owner Team <SortIcon column="ownerTeamName" />
                </div>
              </th>
              <th className="px-6 py-4 text-left text-[14px] font-semibold text-[#1d1d1f]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d2d2d7]">
            {sortedGyms.map((gym) => (
              <Fragment key={gym.id}>
                <tr
                  className="hover:bg-[#e5e5e5] transition-colors odd:bg-white even:bg-[#f5f5f7] cursor-pointer"
                  onClick={() => toggleGymExpansion(gym.id)}
                >
                  <td className="px-6 py-4 text-sm text-[#1d1d1f]">{gym.name}</td>
                  <td className="px-6 py-4 text-sm text-[#1d1d1f]">{gym.location.address}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className="font-semibold"
                      style={{ color: gym.ownerTeamColor }}
                    >
                      {gym.ownerTeamName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="p-2 hover:bg-black/5 rounded-full transition-colors"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setActionMenu({
                          gym,
                          top: rect.bottom,
                          left: rect.right - 128 // Align right edge, assuming w-32 (128px)
                        });
                      }}
                    >
                      <span className="text-[#1d1d1f] font-bold text-lg leading-none">⋯</span>
                    </button>
                  </td>
                </tr>
                {expandedGymId === gym.id && (
                  <tr className="bg-[#f5f5f7]">
                    <td colSpan={4} className="px-6 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                        <div>
                          <h4 className="font-semibold text-[#1d1d1f] mb-2">Best Lifts</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-[#86868b]">Bench Press:</span>
                              <span className="font-mono">{formatReference(gym.bestBenchId)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#86868b]">Deadlift:</span>
                              <span className="font-mono">{formatReference(gym.bestDeadliftId)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#86868b]">Squat:</span>
                              <span className="font-mono">{formatReference(gym.bestSquatId)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-[#1d1d1f] mb-2">Location Details</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-[#86868b]">Address:</span>
                              <span className="text-right">{gym.location.address}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#86868b]">Coordinates:</span>
                              <span className="font-mono">{gym.location.lat.toFixed(6)}, {gym.location.lon.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#86868b]">Owner Team ID:</span>
                              <span className="font-mono text-xs">{gym.ownerTeamId}</span>
                            </div>
                            <div className="mt-2">
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${gym.location.lat},${gym.location.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0071e3] hover:underline flex items-center gap-1"
                              >
                                View on Google Maps ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {gyms.length === 0 && (
        <div className="text-center py-12 text-[#86868b]">
          No gyms found
        </div>
      )}

      {/* Action Menu */}
      {actionMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
          <div
            className="fixed z-50 w-32 bg-white rounded-lg shadow-lg border border-[#d2d2d7] overflow-hidden"
            style={{
              top: actionMenu.top + 4,
              left: actionMenu.left
            }}
          >
            <button
              className="w-full text-left px-4 py-2 text-sm text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
              onClick={() => {
                setEditingGym(actionMenu.gym);
                setActionMenu(null);
              }}
            >
              Edit
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm text-[#ff3b30] hover:bg-[#f5f5f7] transition-colors"
              onClick={async () => {
                if (confirm('Are you sure you want to delete this gym?')) {
                  try {
                    await deleteDoc(doc(db, 'gyms', actionMenu.gym.id));
                    setGyms(prev => prev.filter(g => g.id !== actionMenu.gym.id));
                  } catch (error) {
                    console.error('Error deleting gym:', error);
                    alert('Failed to delete gym');
                  }
                }
                setActionMenu(null);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#d2d2d7] flex justify-between items-center bg-[#f5f5f7]">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">Add New Gym</h3>
              <button
                onClick={() => setIsAdding(false)}
                className="text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGym} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Name</label>
                <input
                  type="text"
                  value={newGym.name}
                  onChange={e => setNewGym({ ...newGym, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                  required
                  placeholder="Gym Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Address</label>
                <input
                  type="text"
                  value={newGym.location.address}
                  onChange={e => setNewGym({
                    ...newGym,
                    location: { ...newGym.location, address: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                  required
                  placeholder="123 Main St, City, State"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newGym.location.lat}
                    onChange={e => setNewGym({
                      ...newGym,
                      location: { ...newGym.location, lat: parseFloat(e.target.value) }
                    })}
                    className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                    required
                    placeholder="0.000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newGym.location.lon}
                    onChange={e => setNewGym({
                      ...newGym,
                      location: { ...newGym.location, lon: parseFloat(e.target.value) }
                    })}
                    className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                    required
                    placeholder="0.000000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Owner Team</label>
                <select
                  value={newGym.ownerTeamId}
                  onChange={e => setNewGym({ ...newGym, ownerTeamId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                >
                  {Object.entries(TEAM_NAMES).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-lg hover:bg-[#e5e5e5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-lg hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  {updating ? 'Adding...' : 'Add Gym'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingGym && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-[#d2d2d7] flex justify-between items-center bg-[#f5f5f7]">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">Edit Gym</h3>
              <button
                onClick={() => setEditingGym(null)}
                className="text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateGym} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Name</label>
                <input
                  type="text"
                  value={editingGym.name}
                  onChange={e => setEditingGym({ ...editingGym, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Address</label>
                <input
                  type="text"
                  value={editingGym.location.address}
                  onChange={e => setEditingGym({
                    ...editingGym,
                    location: { ...editingGym.location, address: e.target.value }
                  })}
                  className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editingGym.location.lat}
                    onChange={e => setEditingGym({
                      ...editingGym,
                      location: { ...editingGym.location, lat: parseFloat(e.target.value) }
                    })}
                    className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editingGym.location.lon}
                    onChange={e => setEditingGym({
                      ...editingGym,
                      location: { ...editingGym.location, lon: parseFloat(e.target.value) }
                    })}
                    className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1d1d1f] mb-1">Owner Team</label>
                <select
                  value={editingGym.ownerTeamId}
                  onChange={e => setEditingGym({ ...editingGym, ownerTeamId: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#d2d2d7] rounded-lg focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                >
                  {Object.entries(TEAM_NAMES).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingGym(null)}
                  className="px-4 py-2 text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] rounded-lg hover:bg-[#e5e5e5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0071e3] rounded-lg hover:bg-[#0077ed] transition-colors disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
