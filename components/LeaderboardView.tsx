'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LeaderboardEntry, Team, User, Workout, LiftType, ScoreType, LeaderboardTab } from '@/lib/types';

const LIFT_TYPES: { value: LiftType; label: string; icon: string }[] = [
  { value: 'bench', label: 'Bench Press', icon: '🏋️' },
  { value: 'squat', label: 'Squat', icon: '🦵' },
  { value: 'deadlift', label: 'Deadlift', icon: '💪' }
];

export default function LeaderboardView() {
  const [scoreType, setScoreType] = useState<ScoreType>('tokens');
  const [liftType, setLiftType] = useState<LiftType>('bench');
  const [tab, setTab] = useState<LeaderboardTab>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [scoreType, liftType]);

  const fetchTeams = async () => {
    try {
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      if (scoreType === 'tokens') {
        await fetchTokenLeaderboard();
      } else {
        await fetchWeightLeaderboard();
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenLeaderboard = async () => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('tokens', 'desc'), limit(100));
    const snapshot = await getDocs(q);

    const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => {
      const data = doc.data() as User;
      return {
        id: doc.id,
        rank: index + 1,
        userId: doc.id,
        userName: data.name,
        username: data.username,
        team: data.team,
        score: data.tokens,
        scoreType: 'tokens'
      };
    });

    setLeaderboard(entries);
  };

  const fetchWeightLeaderboard = async () => {
    const workoutsRef = collection(db, 'workouts');
    const q = query(
      workoutsRef,
      where('liftType', '==', liftType),
      where('status', '==', 'published')
    );
    const snapshot = await getDocs(q);

    const userMaxWeights = new Map<string, { weight: number; user: User }>();

    for (const doc of snapshot.docs) {
      const workout = doc.data() as Workout;
      const current = userMaxWeights.get(workout.userId);

      if (!current || workout.weight > current.weight) {
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', workout.userId), limit(1)));
          if (!userDoc.empty) {
            const userData = { id: userDoc.docs[0].id, ...userDoc.docs[0].data() } as User;
            userMaxWeights.set(workout.userId, { weight: workout.weight, user: userData });
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      }
    }

    const entries: LeaderboardEntry[] = Array.from(userMaxWeights.values())
      .sort((a, b) => b.weight - a.weight)
      .map((data, index) => ({
        id: data.user.id,
        rank: index + 1,
        userId: data.user.id,
        userName: data.user.name,
        username: data.user.username,
        team: data.user.team,
        score: data.weight,
        scoreType: 'weight',
        liftType
      }));

    setLeaderboard(entries);
  };

  const getTeamById = (teamRef: string): Team | undefined => {
    const teamId = teamRef.split('/').pop();
    return teams.find(t => t.id === teamId);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-500';
    return 'text-[#86868b]';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight mb-6">Leaderboard</h2>

        {/* Score Type Toggle */}
        <div className="flex gap-3 mb-4 bg-[#f5f5f7] p-2 rounded-2xl inline-flex">
          <button
            onClick={() => setScoreType('tokens')}
            className={`px-6 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
              scoreType === 'tokens'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Tokens
          </button>
          <button
            onClick={() => setScoreType('weight')}
            className={`px-6 py-2.5 rounded-xl text-[15px] font-medium transition-all ${
              scoreType === 'weight'
                ? 'bg-white text-[#1d1d1f] shadow-sm'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Weight
          </button>
        </div>

        {/* Lift Type Selector */}
        {scoreType === 'weight' && (
          <div className="flex gap-2 mt-3">
            {LIFT_TYPES.map(lift => (
              <button
                key={lift.value}
                onClick={() => setLiftType(lift.value)}
                className={`px-4 py-2 rounded-full text-[14px] font-medium transition-all ${
                  liftType === lift.value
                    ? 'bg-[#0071e3] text-white'
                    : 'bg-[#f5f5f7] text-[#86868b] hover:bg-[#e8e8ed]'
                }`}
              >
                {lift.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">
          <p className="text-[17px]">No entries yet</p>
        </div>
      ) : (
        <div className="bg-white border border-[#d2d2d7] rounded-2xl overflow-hidden">
          {leaderboard.map((entry, index) => {
            const team = getTeamById(entry.team);
            return (
              <div
                key={entry.id}
                className={`flex items-center gap-4 px-6 py-5 hover:bg-[#f5f5f7] transition-colors ${
                  index !== leaderboard.length - 1 ? 'border-b border-[#d2d2d7]' : ''
                }`}
              >
                {/* Rank */}
                <div className={`w-12 text-center text-[17px] font-semibold ${getRankColor(entry.rank)}`}>
                  {getRankIcon(entry.rank)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[17px] text-[#1d1d1f] truncate">{entry.userName}</p>
                  <div className="flex items-center gap-2 text-[14px] text-[#86868b] mt-0.5">
                    <span className="truncate">@{entry.username}</span>
                    {team && (
                      <>
                        <span>•</span>
                        <span className="truncate" style={{ color: team.color }}>
                          {team.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-[22px] font-semibold text-[#1d1d1f]">
                    {entry.score}
                    {scoreType === 'weight' && <span className="text-[14px] ml-1 text-[#86868b]">lbs</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
