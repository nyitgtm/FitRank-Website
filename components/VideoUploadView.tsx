'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import app from '@/lib/firebase';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import { Workout, User, Team } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

type WorkoutItem = {
  id: string;
  workout: Workout;
  user?: User;
  team?: Team;
};

type SortField = 'userName' | 'liftType' | 'weight' | 'createdAt' | 'team';
type SortDirection = 'asc' | 'desc';

export default function VideoUploadView() {
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null);
  const { user } = useAuth();

  // add form state
  const [showAdd, setShowAdd] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [liftType, setLiftType] = useState<Workout['liftType']>('bench');
  const [weight, setWeight] = useState<number | ''>('');
  const [teamId, setTeamId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const getTime = (ts: any) => {
    if (!ts) return 0;
    if (typeof ts === 'object' && typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts === 'number') return ts;
    const parsed = new Date(ts as any).getTime();
    return isNaN(parsed) ? 0 : parsed;
  };

  const formatDate = (ts: any) => {
    if (!ts) return '';
    if (typeof ts === 'object' && typeof ts.toDate === 'function') return ts.toDate().toLocaleString();
    if (ts instanceof Date) return ts.toLocaleString();
    const parsed = new Date(ts as any);
    return isNaN(parsed.getTime()) ? '' : parsed.toLocaleString();
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      // load users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = new Map<string, User>();
      usersSnap.docs.forEach(u => usersMap.set(u.id, { id: u.id, ...u.data() } as User));

      // load teams
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsMap = new Map<string, Team>();
      const teamsArr: Team[] = [];
      teamsSnap.docs.forEach(t => {
        const team = { id: t.id, ...t.data() } as Team;
        teamsMap.set(t.id, team);
        teamsArr.push(team);
      });
      setTeams(teamsArr);

      // load workouts
      const workoutsSnap = await getDocs(collection(db, 'workouts'));

      const toPlain = (docSnap: any) => {
        const data = docSnap.data() as Omit<Workout, 'id'>;
        return { id: docSnap.id, ...(data as any) } as Workout & { id: string };
      };

      const list: WorkoutItem[] = workoutsSnap.docs
        .map(docSnap => toPlain(docSnap))
        .filter(w => (w.videoUrl || '').length > 0 && w.status !== 'removed')
        .map(w => {
          // resolve user
          const rawUserId = (w.userId || '') as string;
          const userId = typeof rawUserId === 'string' && rawUserId.includes('/') ? rawUserId.split('/').pop() as string : rawUserId;
          const user = usersMap.get(userId);

          // resolve team: try workout.teamId, fallback to user's team
          let teamRef = (w.teamId || (user && user.team) || '') as string;
          if (typeof teamRef === 'string' && teamRef.includes('/')) teamRef = teamRef.split('/').pop() as string;
          const team = teamsMap.get(teamRef);

          return { id: w.id, workout: w, user, team } as WorkoutItem;
        });

      setItems(list);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'createdAt' || field === 'weight' ? 'desc' : 'asc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'userName':
        aValue = (a.user?.name || 'Unknown').toLowerCase();
        bValue = (b.user?.name || 'Unknown').toLowerCase();
        break;
      case 'liftType':
        aValue = a.workout.liftType;
        bValue = b.workout.liftType;
        break;
      case 'weight':
        aValue = a.workout.weight || 0;
        bValue = b.workout.weight || 0;
        break;
      case 'createdAt':
        aValue = getTime(a.workout.createdAt);
        bValue = getTime(b.workout.createdAt);
        break;
      case 'team':
        aValue = (a.team?.name || '').toLowerCase();
        bValue = (b.team?.name || '').toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleVideoExpansion = (workoutId: string) => {
    setExpandedWorkoutId(expandedWorkoutId === workoutId ? null : workoutId);
  };

  const deleteVideo = async (id: string, videoUrl: string) => {
    const ok = confirm('Delete this video and mark workout as removed?');
    if (!ok) return;
    setDeletingIds(prev => [...prev, id]);
    try {
      const storage = getStorage(app as any);
      let objectPath: string | null = null;

      if (videoUrl.startsWith('gs://')) {
        const parts = videoUrl.split('/');
        objectPath = parts.slice(3).join('/');
      } else {
        const match = videoUrl.match(/\/o\/([^?]+)/);
        if (match && match[1]) objectPath = decodeURIComponent(match[1]);
      }

      if (objectPath) {
        try {
          await deleteObject(ref(storage, objectPath));
        } catch (err) {
          console.warn('Failed to delete storage object:', err);
        }
      }

      await updateDoc(doc(db, 'workouts', id), { status: 'removed', videoUrl: '' });
      setItems(prev => prev.filter(i => i.id !== id));
      if (expandedWorkoutId === id) {
        setExpandedWorkoutId(null);
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. See console for details.');
    } finally {
      setDeletingIds(prev => prev.filter(x => x !== id));
    }
  };

  const handleCreate = async () => {
    if (!user) {
      alert('You must be signed in as a coach to add videos.');
      return;
    }

    if (!videoUrl) {
      alert('Please provide a video URL');
      return;
    }

    setCreating(true);
    try {
      const newWorkout = {
        userId: user.id,
        videoUrl,
        liftType: liftType || 'bench',
        weight: typeof weight === 'number' ? weight : 0,
        teamId: teamId || user.team || '',
        createdAt: serverTimestamp(),
        status: 'published',
        views: 0,
        upvotes: 0,
        downvotes: 0,
      } as any;

      await addDoc(collection(db, 'workouts'), newWorkout);
      await loadAll();
      setVideoUrl('');
      setWeight('');
      setTeamId('');
      setLiftType('bench');
      setShowAdd(false);
    } catch (error) {
      console.error('Error creating workout:', error);
      alert('Failed to create workout. See console for details.');
    } finally {
      setCreating(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-[#86868b]">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-[#0071e3]">↑</span> : <span className="text-[#0071e3]">↓</span>;
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight mb-8">Uploaded Videos</h2>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">Uploaded Videos</h2>
        <div className="flex items-center gap-4">
          <div className="text-[15px] text-[#86868b]">
            {sortedItems.length} {sortedItems.length === 1 ? 'video' : 'videos'}
          </div>
          {user?.isCoach && (
            <button
              onClick={() => setShowAdd(prev => !prev)}
              className="px-4 py-2 rounded-lg bg-[#0071e3] text-white text-[14px] font-medium hover:bg-[#0077ed] active:bg-[#006edb]"
            >
              {showAdd ? 'Cancel' : 'Add Video'}
            </button>
          )}
        </div>
      </div>

      {/* Add Video Form */}
      {showAdd && (
        <div className="mb-8 bg-[#f5f5f7] p-6 rounded-2xl border border-[#d2d2d7]">
          <h3 className="text-[20px] font-semibold text-[#1d1d1f] mb-4">Add New Video</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">Video URL</label>
              <input
                type="text"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#d2d2d7] rounded-xl text-[15px] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">Lift Type</label>
              <select
                value={liftType}
                onChange={e => setLiftType(e.target.value as any)}
                className="w-full px-4 py-3 bg-white border border-[#d2d2d7] rounded-xl text-[15px] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
              >
                <option value="bench">Bench Press</option>
                <option value="squat">Squat</option>
                <option value="deadlift">Deadlift</option>
              </select>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">Weight (lbs)</label>
              <input
                type="number"
                value={weight as any}
                onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 bg-white border border-[#d2d2d7] rounded-xl text-[15px] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
                placeholder="e.g., 225"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-2">Team</label>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-[#d2d2d7] rounded-xl text-[15px] focus:outline-none focus:border-[#0071e3] focus:ring-4 focus:ring-[#0071e3]/10"
              >
                <option value="">Select team...</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={() => setShowAdd(false)}
              className="px-5 py-2.5 rounded-xl bg-white text-[#1d1d1f] text-[14px] font-medium border border-[#d2d2d7] hover:bg-[#f5f5f7]"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className={`px-5 py-2.5 rounded-xl text-white text-[14px] font-medium ${
                creating ? 'bg-[#86868b] cursor-not-allowed' : 'bg-[#0071e3] hover:bg-[#0077ed]'
              }`}
            >
              {creating ? 'Adding...' : 'Add Video'}
            </button>
          </div>
        </div>
      )}

      {/* Videos Table */}
      {sortedItems.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">
          <p className="text-[17px]">No videos found</p>
        </div>
      ) : (
        <div className="bg-white border border-[#d2d2d7] rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-[#f5f5f7] border-b border-[#d2d2d7]">
            <button
              onClick={() => handleSort('userName')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              User <SortIcon field="userName" />
            </button>
            <button
              onClick={() => handleSort('liftType')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Lift Type <SortIcon field="liftType" />
            </button>
            <button
              onClick={() => handleSort('weight')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Weight <SortIcon field="weight" />
            </button>
            <button
              onClick={() => handleSort('team')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Team <SortIcon field="team" />
            </button>
            <button
              onClick={() => handleSort('createdAt')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Date <SortIcon field="createdAt" />
            </button>
            <div className="text-left text-[14px] font-semibold text-[#1d1d1f]">
              Actions
            </div>
          </div>

          {/* Table Body */}
          {sortedItems.map((item, index) => {
            const isEven = index % 2 === 0;
            const isDeleting = deletingIds.includes(item.id);
            const isExpanded = expandedWorkoutId === item.id;
            return (
              <div key={item.id}>
                <div
                  className={`grid grid-cols-6 gap-4 px-6 py-4 ${
                    isEven ? 'bg-white' : 'bg-[#f5f5f7]'
                  } hover:bg-[#e8e8ed] transition-colors cursor-pointer`}
                  onClick={() => toggleVideoExpansion(item.id)}
                >
                  <div className="text-[15px] text-[#1d1d1f]">
                    {item.user?.name || 'Unknown'}
                  </div>
                  <div className="text-[15px] text-[#86868b] capitalize">
                    {item.workout.liftType}
                  </div>
                  <div className="text-[15px] font-medium text-[#1d1d1f]">
                    {item.workout.weight} lbs
                  </div>
                  <div className="text-[15px]" style={{ color: item.team?.color || '#86868b' }}>
                    {item.team?.name || '—'}
                  </div>
                  <div className="text-[15px] text-[#86868b]">
                    {formatDate(item.workout.createdAt)}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => deleteVideo(item.id, item.workout.videoUrl)}
                      disabled={isDeleting}
                      className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
                        isDeleting
                          ? 'bg-[#86868b] text-white cursor-not-allowed'
                          : 'bg-[#ff3b30] text-white hover:bg-[#ff453a] active:bg-[#ff2d20]'
                      }`}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                {/* Expanded Video Preview */}
                {isExpanded && (
                  <div className={`px-6 py-6 ${isEven ? 'bg-white' : 'bg-[#f5f5f7]'} border-t border-[#d2d2d7]`}>
                    <div className="max-w-3xl mx-auto">
                      <video
                        src={item.workout.videoUrl}
                        controls
                        playsInline
                        className="w-full rounded-2xl bg-black shadow-lg"
                        style={{ maxHeight: '300px' }}
                        autoPlay
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
