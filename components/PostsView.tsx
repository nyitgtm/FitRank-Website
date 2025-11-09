'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from './LoadingSpinner';
import { User } from '@/lib/types';

type Post = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
  imageURL?: string | null;
  teamTag?: string;
  likeCount: number;
  commentCount: number;
};

type Comment = {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: any;
};

type Like = {
  userId: string;
  userName: string;
  createdAt: any;
};

type SortField = 'authorName' | 'text' | 'createdAt' | 'teamTag' | 'likeCount' | 'commentCount';
type SortDirection = 'asc' | 'desc';

export default function PostsView() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [postDetails, setPostDetails] = useState<{
    comments: Comment[];
    likes: Like[];
    loading: boolean;
  }>({ comments: [], likes: [], loading: false });
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // Fetch all users first for mapping
      const usersSnap = await getDocs(collection(db, 'users'));
      const userMap = new Map<string, User>();
      usersSnap.docs.forEach(doc => {
        userMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
      });
      setUsersMap(userMap);

      const postsSnap = await getDocs(collection(db, 'posts'));
      
      const postsDataPromises = postsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        
        // Get likes count
        const likesSnap = await getDocs(collection(db, `posts/${docSnap.id}/likes`));
        const likeCount = likesSnap.size;
        
        // Get comments count
        const commentsSnap = await getDocs(collection(db, `posts/${docSnap.id}/comments`));
        const commentCount = commentsSnap.size;
        
        return {
          id: docSnap.id,
          authorId: data.authorId || '',
          authorName: data.authorName || 'Unknown',
          text: data.text || '',
          createdAt: data.createdAt,
          imageURL: data.imageURL,
          teamTag: data.teamTag,
          likeCount,
          commentCount
        } as Post;
      });
      
      const postsData = await Promise.all(postsDataPromises);
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetails = async (postId: string) => {
    setPostDetails({ comments: [], likes: [], loading: true });
    try {
      // Fetch comments
      const commentsSnap = await getDocs(collection(db, `posts/${postId}/comments`));
      const comments: Comment[] = commentsSnap.docs.map(doc => ({
        id: doc.id,
        authorId: doc.data().authorId || '',
        authorName: doc.data().authorName || 'Unknown',
        text: doc.data().text || '',
        createdAt: doc.data().createdAt
      })).sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });

      // Fetch likes
      const likesSnap = await getDocs(collection(db, `posts/${postId}/likes`));
      const likes: Like[] = likesSnap.docs.map(doc => {
        const userId = doc.id;
        const user = usersMap.get(userId);
        return {
          userId,
          userName: user?.name || 'Unknown User',
          createdAt: doc.data().createdAt
        };
      }).sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });

      setPostDetails({ comments, likes, loading: false });
    } catch (error) {
      console.error('Error fetching post details:', error);
      setPostDetails({ comments: [], likes: [], loading: false });
    }
  };

  const togglePostExpansion = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      fetchPostDetails(postId);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'authorName':
        aValue = a.authorName.toLowerCase();
        bValue = b.authorName.toLowerCase();
        break;
      case 'text':
        aValue = a.text.toLowerCase();
        bValue = b.text.toLowerCase();
        break;
      case 'createdAt':
        aValue = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        bValue = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        break;
      case 'teamTag':
        aValue = (a.teamTag || '').toLowerCase();
        bValue = (b.teamTag || '').toLowerCase();
        break;
      case 'likeCount':
        aValue = a.likeCount;
        bValue = b.likeCount;
        break;
      case 'commentCount':
        aValue = a.commentCount;
        bValue = b.commentCount;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const deletePost = async (id: string) => {
    const ok = confirm('Delete this post? This will permanently remove it from Firebase.');
    if (!ok) return;
    setDeletingIds(prev => [...prev, id]);
    try {
      await deleteDoc(doc(db, 'posts', id));
      setPosts(prev => prev.filter(p => p.id !== id));
      if (expandedPostId === id) {
        setExpandedPostId(null);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post. See console for details.');
    } finally {
      setDeletingIds(prev => prev.filter(x => x !== id));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-[#86868b]">↕</span>;
    }
    return sortDirection === 'asc' ? <span className="text-[#0071e3]">↑</span> : <span className="text-[#0071e3]">↓</span>;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight mb-8">All Posts</h2>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-[32px] font-semibold text-[#1d1d1f] tracking-tight">All Posts</h2>
        <div className="text-[15px] text-[#86868b]">
          {sortedPosts.length} {sortedPosts.length === 1 ? 'post' : 'posts'}
        </div>
      </div>

      {sortedPosts.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">
          <p className="text-[17px]">No posts found</p>
          <p className="text-[14px] mt-2">Posts will appear here</p>
        </div>
      ) : (
        <div className="bg-white border border-[#d2d2d7] rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-7 gap-4 px-6 py-4 bg-[#f5f5f7] border-b border-[#d2d2d7]">
            <button
              onClick={() => handleSort('authorName')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Author <SortIcon field="authorName" />
            </button>
            <button
              onClick={() => handleSort('text')}
              className="col-span-2 text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Text <SortIcon field="text" />
            </button>
            <button
              onClick={() => handleSort('teamTag')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Team <SortIcon field="teamTag" />
            </button>
            <button
              onClick={() => handleSort('likeCount')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Likes <SortIcon field="likeCount" />
            </button>
            <button
              onClick={() => handleSort('commentCount')}
              className="text-left text-[14px] font-semibold text-[#1d1d1f] hover:text-[#0071e3] transition-colors flex items-center gap-1"
            >
              Comments <SortIcon field="commentCount" />
            </button>
            <div className="text-left text-[14px] font-semibold text-[#1d1d1f]">
              Actions
            </div>
          </div>

          {/* Table Body */}
          {sortedPosts.map((post, index) => {
            const isEven = index % 2 === 0;
            const isDeleting = deletingIds.includes(post.id);
            const isExpanded = expandedPostId === post.id;
            return (
              <div key={post.id}>
                <div
                  className={`grid grid-cols-7 gap-4 px-6 py-4 ${
                    isEven ? 'bg-white' : 'bg-[#f5f5f7]'
                  } hover:bg-[#e8e8ed] transition-colors cursor-pointer`}
                  onClick={() => togglePostExpansion(post.id)}
                >
                  <div className="text-[15px] text-[#1d1d1f] flex flex-col">
                    <span className="font-medium">{post.authorName}</span>
                    <span className="text-[13px] text-[#86868b] mt-0.5">{formatDate(post.createdAt)}</span>
                  </div>
                  <div className="col-span-2 text-[15px] text-[#1d1d1f]">
                    <p className="line-clamp-3">{post.text}</p>
                  </div>
                  <div className="text-[15px] text-[#86868b]">
                    {post.teamTag || '—'}
                  </div>
                  <div className="text-[15px] font-medium text-[#1d1d1f]">
                    {post.likeCount}
                  </div>
                  <div className="text-[15px] font-medium text-[#1d1d1f]">
                    {post.commentCount}
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => deletePost(post.id)}
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

                {/* Expanded Details */}
                {isExpanded && (
                  <div className={`px-6 py-6 ${isEven ? 'bg-white' : 'bg-[#f5f5f7]'} border-t border-[#d2d2d7]`}>
                    {postDetails.loading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-6">
                        {/* Likes Section */}
                        <div>
                          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">
                            Likes ({postDetails.likes.length})
                          </h3>
                          {postDetails.likes.length === 0 ? (
                            <p className="text-[14px] text-[#86868b]">No likes yet</p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {postDetails.likes.map((like, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-white border border-[#d2d2d7] rounded-xl"
                                >
                                  <p className="text-[15px] font-medium text-[#1d1d1f]">
                                    {like.userName}
                                  </p>
                                  <p className="text-[13px] text-[#86868b] mt-0.5">
                                    {formatDate(like.createdAt)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Comments Section */}
                        <div>
                          <h3 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">
                            Comments ({postDetails.comments.length})
                          </h3>
                          {postDetails.comments.length === 0 ? (
                            <p className="text-[14px] text-[#86868b]">No comments yet</p>
                          ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {postDetails.comments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="p-3 bg-white border border-[#d2d2d7] rounded-xl"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[15px] font-medium text-[#1d1d1f]">
                                      {comment.authorName}
                                    </p>
                                    <p className="text-[12px] text-[#86868b]">
                                      {formatDate(comment.createdAt)}
                                    </p>
                                  </div>
                                  <p className="text-[14px] text-[#1d1d1f]">{comment.text}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
