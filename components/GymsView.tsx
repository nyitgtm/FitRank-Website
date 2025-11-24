'use client';

import { useEffect, useState, Fragment } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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
  '1': 'Killa Gorrilaz',
  '2': 'Regal Eagles',
  '3': 'Dark Sharks'
};

const TEAM_COLORS: { [key: string]: string } = {
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

  const sortedGyms = [...gyms].sort((a, b) => {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-semibold text-[#1d1d1f] mb-8">Gyms</h2>

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
                </tr>
                {expandedGymId === gym.id && (
                  <tr className="bg-[#f5f5f7]">
                    <td colSpan={3} className="px-6 py-4">
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
    </div>
  );
}
