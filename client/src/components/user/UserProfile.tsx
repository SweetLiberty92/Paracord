import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, UserPlus, Ban } from 'lucide-react';
import type { User } from '../../types/index';
import { dmApi } from '../../api/dms';
import { relationshipApi } from '../../api/relationships';
import { useChannelStore } from '../../stores/channelStore';
import { usePresenceStore } from '../../stores/presenceStore';
import {
  formatActivityElapsed,
  formatActivityLabel,
  getPrimaryActivity,
} from '../../lib/activityPresence';

interface UserProfilePopupProps {
  user: User;
  position: { x: number; y: number };
  onClose: () => void;
  roles?: Array<{ id: string; name: string; color: number }>;
}

function intToHex(color: number): string {
  if (color === 0) return 'var(--text-secondary)';
  return '#' + color.toString(16).padStart(6, '0');
}

const STATUS_COLORS: Record<'online' | 'idle' | 'dnd' | 'offline', string> = {
  online: 'var(--status-online)',
  idle: 'var(--status-idle)',
  dnd: 'var(--status-dnd)',
  offline: 'var(--status-offline)',
};

export function UserProfilePopup({ user, position, onClose, roles = [] }: UserProfilePopupProps) {
  const navigate = useNavigate();
  // Try to position to the left of the click point; fall back to the right
  const popupWidth = 344;
  const estimatedHeight = 420;
  const fitsLeft = position.x - popupWidth - 16 > 0;
  const left = fitsLeft
    ? Math.max(8, position.x - popupWidth - 12)
    : Math.min(position.x + 12, window.innerWidth - popupWidth - 8);
  const top = Math.max(8, Math.min(position.y, window.innerHeight - estimatedHeight - 8));
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const presence = usePresenceStore((state) => state.presences.get(user.id));
  const status = (presence?.status as 'online' | 'idle' | 'dnd' | 'offline') || 'offline';
  const activity = useMemo(() => getPrimaryActivity(presence), [presence]);
  const activityLabel = useMemo(() => formatActivityLabel(activity), [activity]);
  const activityElapsed = useMemo(
    () => formatActivityElapsed(activity?.started_at, now),
    [activity?.started_at, now]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`paracord:note:${user.id}`);
      if (saved) setNote(saved);
    } catch {
      /* ignore */
    }
  }, [user.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`paracord:note:${user.id}`, note);
    } catch {
      /* ignore */
    }
  }, [user.id, note]);

  useEffect(() => {
    if (!activity?.started_at) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activity?.started_at]);

  const handleMessage = async () => {
    try {
      setActionError(null);
      const { data } = await dmApi.create(user.id);
      const dmChannels = useChannelStore.getState().channelsByGuild[''] || [];
      if (!dmChannels.some((c) => c.id === data.id)) {
        useChannelStore.getState().setDmChannels([...dmChannels, data]);
      }
      useChannelStore.getState().selectChannel(data.id);
      onClose();
      navigate(`/app/dms/${data.id}`);
    } catch {
      setActionError('Could not start a DM right now.');
    }
  };

  const handleAddFriend = async () => {
    try {
      setActionError(null);
      await relationshipApi.addFriend(user.username);
      onClose();
    } catch {
      setActionError('Could not send a friend request.');
    }
  };

  const handleBlock = async () => {
    try {
      setActionError(null);
      await relationshipApi.block(user.id);
      onClose();
    } catch {
      setActionError('Could not block this user.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        className="glass-modal fixed z-50 overflow-hidden rounded-2xl border popup-enter"
        style={{
          left,
          top,
          width: '344px',
        }}
      >
        {/* Banner */}
        <div
          className="h-16"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-primary-hover) 100%)',
          }}
        />

        {/* Avatar + name */}
        <div className="px-7 pb-6">
          <div className="relative -mt-8 mb-3">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-bold text-white"
              style={{
                backgroundColor: 'var(--accent-primary)',
                borderColor: 'var(--bg-floating)',
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div
              className="absolute bottom-0 right-0 w-5 h-5 rounded-full"
              style={{
                backgroundColor: STATUS_COLORS[status],
                borderColor: 'var(--bg-floating)',
                borderWidth: '3px',
                borderStyle: 'solid',
              }}
            />
          </div>

          <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {user.display_name || user.username}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {user.username}
          </div>
          {activityLabel && (
            <div className="mt-1 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {activityElapsed ? `${activityLabel} for ${activityElapsed}` : activityLabel}
            </div>
          )}
        </div>

        <div className="mx-7 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />

        {activityLabel && (
          <div className="px-7 pt-6 pb-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
              Activity
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {activityLabel}
              {activityElapsed ? ` (${activityElapsed})` : ''}
            </div>
          </div>
        )}

        <div className="px-7 py-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            About Me
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {user.bio || 'No bio set.'}
          </div>
        </div>

        {roles.length > 0 && (
          <div className="px-7 pb-6">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
              Roles
            </div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map(role => (
                <span
                  key={role.id}
                  className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--bg-mod-subtle)',
                    color: intToHex(role.color),
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: intToHex(role.color) }}
                  />
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="px-7 pb-6">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Note
          </div>
          <input
            type="text"
            placeholder="Click to add a note"
            className="h-10 w-full rounded-lg border border-border-subtle bg-bg-mod-subtle px-3 text-sm text-text-secondary outline-none transition-colors focus:border-border-strong focus:bg-bg-mod-strong"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-4 px-7 pb-7">
          <button className="btn-primary flex-1 items-center justify-center gap-1.5" onClick={() => void handleMessage()}>
            <MessageSquare size={14} />
            Message
          </button>
          <button className="icon-btn border-border-subtle bg-bg-mod-subtle" title="Add Friend" onClick={() => void handleAddFriend()}>
            <UserPlus size={18} />
          </button>
          <button className="icon-btn border-border-subtle bg-bg-mod-subtle" title="Block" onClick={() => void handleBlock()}>
            <Ban size={18} />
          </button>
        </div>
        {actionError && (
          <div className="px-7 pb-7 text-xs font-medium" style={{ color: 'var(--accent-danger)' }}>
            {actionError}
          </div>
        )}
      </div>
    </>
  );
}
