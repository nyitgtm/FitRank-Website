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
    if (rank === 1) return 'from-yellow-400 to-yellow-600';
    if (rank === 2) return 'from-gray-300 to-gray-500';
    if (rank === 3) return 'from-orange-400 to-orange-600';
    return 'from-blue-400 to-blue-600';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '👑';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-6">Leaderboard</h2>

      {/* Score Type Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setScoreType('tokens')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            scoreType === 'tokens'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⭐ Tokens
        </button>
        <button
          onClick={() => setScoreType('weight')}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            scoreType === 'weight'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          🏋️ Weight
        </button>
      </div>

      {/* Lift Type Selector */}
      {scoreType === 'weight' && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {LIFT_TYPES.map(lift => (
            <button
              key={lift.value}
              onClick={() => setLiftType(lift.value)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                liftType === lift.value
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {lift.icon} {lift.label}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl">No entries yet</p>
          <p className="text-sm mt-2">Be the first to compete!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map(entry => {
            const team = getTeamById(entry.team);
            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 hover:shadow-lg transition-shadow"
              >
                {/* Rank Badge */}
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br ${getRankColor(
                    entry.rank
                  )} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
                >
                  {getRankIcon(entry.rank)}
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <p className="font-semibold text-lg">{entry.userName}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>@{entry.username}</span>
                    {team && (
                      <>
                        <span>•</span>
                        <span style={{ color: team.color }}>
                          {team.icon} {team.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {entry.score}
                    {scoreType === 'weight' && <span className="text-sm ml-1 text-gray-500">lbs</span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {scoreType === 'tokens' ? 'tokens' : LIFT_TYPES.find(l => l.value === liftType)?.label}
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
