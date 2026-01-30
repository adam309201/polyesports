'use client';

import { useState, useEffect } from 'react';

interface CommentProfile {
  pfp?: string;
  name?: string;
  username?: string;
}

interface Comment {
  id: string;
  body: string;
  userAddress: string;
  createdAt: string;
  reactionCount: number;
  profile?: CommentProfile;
}

interface CommentsTabProps {
  eventId: string;
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const shortenAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export default function CommentsTab({ eventId }: CommentsTabProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/polymarket/comments?asset_id=${eventId}&limit=30`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setComments(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load comments');
      } finally {
        setLoading(false);
      }
    };
    if (eventId) fetchComments();
  }, [eventId]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-[var(--bg-elevated)]" />
              <div className="h-4 w-full rounded bg-[var(--bg-elevated)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-[var(--text-muted)] text-sm">{error}</div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="p-8 text-center">
        <svg className="mx-auto mb-3 text-[var(--text-muted)]" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <div className="text-sm text-[var(--text-muted)]">No comments yet</div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border-default)]">
      {comments.map(comment => (
        <div key={comment.id} className="flex gap-3 p-4 hover:bg-[var(--bg-secondary)]/50 transition-colors">
          {/* Avatar */}
          <div className="shrink-0">
            {comment.profile?.pfp ? (
              <img src={comment.profile.pfp} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)]">
                {(comment.profile?.name || comment.userAddress)?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {comment.profile?.name || comment.profile?.username || shortenAddress(comment.userAddress)}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                {timeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] break-words">{comment.body}</p>
            {comment.reactionCount > 0 && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                  <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
                {comment.reactionCount}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
