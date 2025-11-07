"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from './LoadingSpinner';
import { User } from '@/lib/types';

type Post = {
  id?: string;
  userId: string;
  content: string;
  createdAt?: any;
};

type PostItem = {
  id: string;
  post: Post;
  user?: User;
};

export default function PostsView() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // fetch users map
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = new Map<string, User>();
      usersSnap.docs.forEach(u => usersMap.set(u.id, { id: u.id, ...u.data() } as User));

      // fetch posts
      const postsSnap = await getDocs(collection(db, 'posts'));
      const items: PostItem[] = postsSnap.docs
        .map(d => ({ id: d.id, ...(d.data() as Post) }))
        .map(p => {
          // determine possible author id from several common field names
          const possibleFields = ['userId', 'authorId', 'authorID', 'author', 'uid', 'user', 'creatorId'];
          let rawAuthor: any = null;
          for (const f of possibleFields) {
            if ((p as any)[f]) {
              rawAuthor = (p as any)[f];
              break;
            }
          }

          // normalize to string id
          let authorId: string | null = null;
          if (rawAuthor) {
            if (typeof rawAuthor === 'string') {
              authorId = rawAuthor;
            } else if (typeof rawAuthor === 'object') {
              // Firestore DocumentReference has .id or .path
              if ((rawAuthor as any).id) authorId = (rawAuthor as any).id;
              else if ((rawAuthor as any).path) authorId = (rawAuthor as any).path.split('/').pop();
            }
          }

          if (typeof authorId === 'string' && authorId.includes('/')) {
            authorId = authorId.split('/').pop() as string;
          }

          const user = authorId ? usersMap.get(authorId) : undefined;
          if (!user) console.warn('PostsView: user not found for post', p.id, authorId, rawAuthor);

          return { id: p.id!, post: p as Post, user } as PostItem;
        })
        .sort((a, b) => {
          const ta = a.post.createdAt?.toDate ? a.post.createdAt.toDate().getTime() : new Date(a.post.createdAt ?? 0).getTime();
          const tb = b.post.createdAt?.toDate ? b.post.createdAt.toDate().getTime() : new Date(b.post.createdAt ?? 0).getTime();
          return tb - ta;
        });

      setPosts(items);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markDeleting = (id: string, adding = true) => {
    setDeletingIds(prev => (adding ? [...prev, id] : prev.filter(x => x !== id)));
  };

  const deletePost = async (id: string) => {
    const ok = confirm('Delete this post? This will permanently remove it from Firebase.');
    if (!ok) return;
    markDeleting(id, true);
    try {
      await deleteDoc(doc(db, 'posts', id));
      setPosts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. See console for details.');
    } finally {
      markDeleting(id, false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-3xl font-bold mb-6">Posts</h2>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">All Posts</h2>
        <div className="text-sm text-gray-600">Total: {posts.length}</div>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl">No posts found</p>
          <p className="text-sm mt-2">Posts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-md p-4 flex items-start gap-4">
              <div className="flex-1">
                <p className="font-semibold text-md">{item.user?.name ?? 'Unknown User'}</p>
                <p className="text-sm text-gray-600">@{item.user?.username ?? 'unknown'}</p>
                <p className="mt-2 text-gray-800 whitespace-pre-wrap">{(item.post.content ?? (item.post as any).text ?? (item.post as any).body ?? '')}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-xs text-gray-500">{item.post.createdAt ? (item.post.createdAt?.toDate ? item.post.createdAt.toDate().toLocaleString() : new Date(item.post.createdAt).toLocaleString()) : ''}</div>
                <button
                  onClick={() => deletePost(item.id)}
                  disabled={deletingIds.includes(item.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all text-white ${deletingIds.includes(item.id) ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {deletingIds.includes(item.id) ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
