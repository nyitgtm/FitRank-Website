
"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import app from '@/lib/firebase';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import LoadingSpinner from './LoadingSpinner';
import { Workout, User, Team } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

type Item = {
  id: string;
  workout: Workout;
  user?: User;
  team?: Team;
};

export default function VideoUploadView() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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

      const getTime = (ts: any) => {
        if (!ts) return 0;
        if (typeof ts === 'object' && typeof ts.toDate === 'function') return ts.toDate().getTime();
        if (ts instanceof Date) return ts.getTime();
        if (typeof ts === 'number') return ts;
        const parsed = new Date(ts as any).getTime();
        return isNaN(parsed) ? 0 : parsed;
      };

      const list: Item[] = workoutsSnap.docs
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

          return { id: w.id, workout: w, user, team } as Item;
        })
  .sort((a, b) => getTime(b.workout.createdAt) - getTime(a.workout.createdAt));

  setItems(list);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const markDeleting = (id: string, adding = true) => {
    setDeletingIds(prev => (adding ? [...prev, id] : prev.filter(x => x !== id)));
  };

  const deleteVideo = async (id: string, videoUrl: string) => {
    const ok = confirm('Delete this video and mark workout as removed?');
    if (!ok) return;
    markDeleting(id, true);
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
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video. See console for details.');
    } finally {
      markDeleting(id, false);
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
      // refresh
      await loadAll();
      // reset form
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

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-6">Uploaded Videos</h2>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Uploaded Videos</h2>
        <div className="text-sm text-gray-600">Total: {items.length}</div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl">No videos found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                {/* Video */}
                <div className="w-44 flex-shrink-0">
                  <video
                    src={item.workout.videoUrl}
                    controls
                    playsInline
                    className="w-full aspect-video object-cover rounded-md bg-black"
                  />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-lg font-semibold">{item.user?.name ?? item.workout.userId ?? 'Unknown'}</p>
                      <p className="text-sm text-gray-600">@{item.user?.username ?? (item.workout.userId ?? 'unknown')}</p>
                    </div>

                    {item.team && (
                      <div className="ml-2 px-2 py-1 rounded-full text-sm font-medium" style={{ background: item.team.color || '#eee' }}>
                        {item.team.icon ?? ''} {item.team.name}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Lift:</span> {item.workout.liftType ?? '—'}
                    {typeof item.workout.weight === 'number' && (
                      <span className="ml-4"><span className="font-medium">Weight:</span> {item.workout.weight} lbs</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="w-36 flex flex-col items-end gap-2">
                  <div className="text-xs text-gray-500">{formatDate(item.workout.createdAt)}</div>
                  <button
                    onClick={() => deleteVideo(item.id, item.workout.videoUrl)}
                    disabled={deletingIds.includes(item.id)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all text-white ${deletingIds.includes(item.id) ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {deletingIds.includes(item.id) ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Add Video (coaches only) */}
      {user?.isCoach && (
        <div className="mt-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdd(prev => !prev)}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              {showAdd ? 'Close' : 'Add Video'}
            </button>
          </div>

          {showAdd && (
            <div className="mt-4 bg-white p-4 rounded-lg shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Video URL</label>
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Lift Type</label>
                  <select value={liftType} onChange={e => setLiftType(e.target.value as any)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="bench">Bench</option>
                    <option value="squat">Squat</option>
                    <option value="deadlift">Deadlift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Weight (lbs)</label>
                  <input
                    type="number"
                    value={weight as any}
                    onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., 225"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Team</label>
                  <select value={teamId} onChange={e => setTeamId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">(none)</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.icon ?? ''} {t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2 justify-end">
                <button
                  onClick={() => { setShowAdd(false); }}
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className={`px-4 py-2 rounded-lg text-white ${creating ? 'bg-green-300' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {creating ? 'Adding...' : 'Add Video'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
