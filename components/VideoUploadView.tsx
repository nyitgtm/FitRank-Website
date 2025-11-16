'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
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

type Comment = {
  id: string;
  content: string;
  userID: string;
  userName?: string;
  timestamp: any;
  likes: number;
  dislikes: number;
  replyCount: number;
};

type Reply = {
  id: string;
  content: string;
  userID: string;
  userName?: string;
  timestamp: any;
  likes: number;
  dislikes: number;
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
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [replies, setReplies] = useState<Map<string, Reply[]>>(new Map());
  const [loadingComments, setLoadingComments] = useState(false);
  const [expandedCommentId, setExpandedCommentId] = useState<string | null>(null);

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
      const usersMapData = new Map<string, User>();
      usersSnap.docs.forEach(u => usersMapData.set(u.id, { id: u.id, ...u.data() } as User));
      setUsersMap(usersMapData);

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
          const user = usersMapData.get(userId);

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

  const loadCommentsForWorkout = async (workoutId: string) => {
    setLoadingComments(true);
    try {
      // Fetch comments
      const commentsRef = collection(db, `workouts/${workoutId}/comments`);
      const commentsQuery = query(commentsRef, orderBy('timestamp', 'desc'));
      const commentsSnap = await getDocs(commentsQuery);
      
      const commentsData: Comment[] = [];
      const repliesMap = new Map<string, Reply[]>();

      for (const commentDoc of commentsSnap.docs) {
        const commentData = commentDoc.data();
        const commentUser = usersMap.get(commentData.userID);
        
        commentsData.push({
          id: commentDoc.id,
          content: commentData.content || '',
          userID: commentData.userID || '',
          userName: commentUser?.name || 'Unknown User',
          timestamp: commentData.timestamp,
          likes: commentData.likes || 0,
          dislikes: commentData.dislikes || 0,
          replyCount: commentData.replyCount || 0,
        });

        // Fetch replies for this comment if it has any
        if (commentData.replyCount > 0) {
          const repliesRef = collection(db, `workouts/${workoutId}/comments/${commentDoc.id}/replies`);
          const repliesQuery = query(repliesRef, orderBy('timestamp', 'asc'));
          const repliesSnap = await getDocs(repliesQuery);
          
          const repliesData: Reply[] = repliesSnap.docs.map(replyDoc => {
            const replyData = replyDoc.data();
            const replyUser = usersMap.get(replyData.userID);
            return {
              id: replyDoc.id,
              content: replyData.content || '',
              userID: replyData.userID || '',
              userName: replyUser?.name || 'Unknown User',
              timestamp: replyData.timestamp,
              likes: replyData.likes || 0,
              dislikes: replyData.dislikes || 0,
            };
          });
          
          repliesMap.set(commentDoc.id, repliesData);
        }
      }

      setComments(commentsData);
      setReplies(repliesMap);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
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

  const toggleVideoExpansion = async (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      setExpandedWorkoutId(null);
      setComments([]);
      setReplies(new Map());
    } else {
      setExpandedWorkoutId(workoutId);
      await loadCommentsForWorkout(workoutId);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedCommentId(expandedCommentId === commentId ? null : commentId);
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
      return <span className="text-slate-500">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-indigo-400">↑</span> : <span className="text-indigo-400">↓</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-4xl font-bold gradient-text">Workout Videos</h2>
        <div className="glass-effect rounded-2xl p-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400">Loading videos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold gradient-text mb-2">Workout Videos</h2>
          <p className="text-slate-400">{sortedItems.length} {sortedItems.length === 1 ? 'video' : 'videos'} uploaded</p>
        </div>
        {user?.isCoach && (
          <button
            onClick={() => setShowAdd(prev => !prev)}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
          >
            {showAdd ? '✕ Cancel' : '+ Add Video'}
          </button>
        )}
      </div>

      {/* Add Video Form */}
      {showAdd && (
        <div className="glass-effect rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-slate-100 mb-4">Add New Video</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Video URL</label>
              <input
                type="text"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Lift Type</label>
              <select
                value={liftType}
                onChange={e => setLiftType(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="bench">Bench Press</option>
                <option value="squat">Squat</option>
                <option value="deadlift">Deadlift</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Weight (lbs)</label>
              <input
                type="number"
                value={weight as any}
                onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="e.g., 225"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">Team</label>
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
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
              className="px-6 py-3 rounded-xl bg-slate-700 text-slate-200 font-semibold hover:bg-slate-600 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className={`px-6 py-3 rounded-xl text-white font-semibold transition-all ${
                creating ? 'bg-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30'
              }`}
            >
              {creating ? 'Adding...' : '✓ Add Video'}
            </button>
          </div>
        </div>
      )}

      {/* Videos Table */}
      {sortedItems.length === 0 ? (
        <div className="glass-effect rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🎥</div>
          <p className="text-xl text-slate-300 mb-2">No videos found</p>
          <p className="text-slate-500">Upload your first workout video</p>
        </div>
      ) : (
        <div className="glass-effect rounded-2xl overflow-hidden border border-slate-700">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-slate-800/50 border-b border-slate-700">
            <button
              onClick={() => handleSort('userName')}
              className="text-left text-sm font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              User <SortIcon field="userName" />
            </button>
            <button
              onClick={() => handleSort('liftType')}
              className="text-left text-sm font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              Lift Type <SortIcon field="liftType" />
            </button>
            <button
              onClick={() => handleSort('weight')}
              className="text-left text-sm font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              Weight <SortIcon field="weight" />
            </button>
            <button
              onClick={() => handleSort('team')}
              className="text-left text-sm font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              Team <SortIcon field="team" />
            </button>
            <button
              onClick={() => handleSort('createdAt')}
              className="text-left text-sm font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              Date <SortIcon field="createdAt" />
            </button>
            <div className="text-left text-sm font-semibold text-slate-300">
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
                  className={`grid grid-cols-6 gap-4 px-6 py-4 border-b border-slate-700/50 ${
                    isEven ? 'bg-slate-800/30' : 'bg-slate-800/10'
                  } hover:bg-slate-700/30 transition-colors cursor-pointer`}
                  onClick={() => toggleVideoExpansion(item.id)}
                >
                  <div className="text-sm text-slate-200 font-medium">
                    {item.user?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-slate-400 capitalize">
                    {item.workout.liftType}
                  </div>
                  <div className="text-sm font-bold text-amber-400">
                    {item.workout.weight} lbs
                  </div>
                  <div className="text-sm font-medium" style={{ color: item.team?.color || '#94a3b8' }}>
                    {item.team?.name || '—'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {formatDate(item.workout.createdAt)}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => deleteVideo(item.id, item.workout.videoUrl)}
                      disabled={isDeleting}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        isDeleting
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/20'
                      }`}
                    >
                      {isDeleting ? 'Deleting...' : '🗑️ Delete'}
                    </button>
                  </div>
                </div>

                {/* Expanded Video Preview & Comments */}
                {isExpanded && (
                  <div className={`px-6 py-6 ${isEven ? 'bg-slate-800/30' : 'bg-slate-800/10'} border-t border-slate-700`}>
                    <div className="max-w-4xl mx-auto space-y-6">
                      {/* Video Player */}
                      <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                        <video
                          src={item.workout.videoUrl}
                          controls
                          playsInline
                          className="w-full bg-black"
                          style={{ maxHeight: '400px' }}
                          autoPlay
                        />
                      </div>

                      {/* Comments Section */}
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
                          💬 Comments ({comments.length})
                        </h3>

                        {loadingComments ? (
                          <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : comments.length === 0 ? (
                          <p className="text-slate-400 text-center py-8">No comments yet</p>
                        ) : (
                          <div className="space-y-4">
                            {comments.map((comment) => {
                              const commentReplies = replies.get(comment.id) || [];
                              const isCommentExpanded = expandedCommentId === comment.id;
                              
                              return (
                                <div key={comment.id} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                                  {/* Comment Header */}
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-bold text-white">
                                          {(comment.userName || 'U')[0].toUpperCase()}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-200">{comment.userName}</p>
                                        <p className="text-xs text-slate-500">{formatDate(comment.timestamp)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                      <span className="flex items-center gap-1 text-green-400">
                                        👍 {comment.likes}
                                      </span>
                                      <span className="flex items-center gap-1 text-red-400">
                                        👎 {comment.dislikes}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Comment Content */}
                                  <p className="text-slate-300 mb-3 ml-13">{comment.content}</p>

                                  {/* Replies Toggle */}
                                  {comment.replyCount > 0 && (
                                    <button
                                      onClick={() => toggleReplies(comment.id)}
                                      className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold ml-13 flex items-center gap-1"
                                    >
                                      {isCommentExpanded ? '▼' : '▶'} {comment.replyCount} {comment.replyCount === 1 ? 'Reply' : 'Replies'}
                                    </button>
                                  )}

                                  {/* Replies */}
                                  {isCommentExpanded && commentReplies.length > 0 && (
                                    <div className="mt-4 ml-13 space-y-3 border-l-2 border-slate-700 pl-4">
                                      {commentReplies.map((reply) => (
                                        <div key={reply.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-bold text-white">
                                                  {(reply.userName || 'U')[0].toUpperCase()}
                                                </span>
                                              </div>
                                              <div>
                                                <p className="text-xs font-semibold text-slate-200">{reply.userName}</p>
                                                <p className="text-xs text-slate-500">{formatDate(reply.timestamp)}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                              <span className="text-green-400">👍 {reply.likes}</span>
                                              <span className="text-red-400">👎 {reply.dislikes}</span>
                                            </div>
                                          </div>
                                          <p className="text-sm text-slate-300 ml-10">{reply.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
