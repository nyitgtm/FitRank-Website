'use client';

import { useEffect, useState } from 'react';
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
            ownerTeamColor: TEAM_COLORS[teamId] || '#86868b'
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1d1d1f]">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1d1d1f]">Location</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-[#1d1d1f]">Owner Team</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d2d2d7]">
            {gyms.map((gym) => (
              <tr key={gym.id} className="hover:bg-[#f5f5f7] transition-colors">
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
