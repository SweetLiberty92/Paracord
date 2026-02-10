import { useRef, useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, Smile, Reply, MoreHorizontal, Hash } from 'lucide-react';
import { useMessages } from '../../hooks/useMessages';
import { useTypingStore } from '../../stores/typingStore';
import { useAuthStore } from '../../stores/authStore';
import { useMessageStore } from '../../stores/messageStore';
import { useChannelStore } from '../../stores/channelStore';
import { channelApi } from '../../api/channels';
import { Permissions, hasPermission, type Message } from '../../types';
import { UserProfilePopup } from '../user/UserProfile';
import { EmojiPicker } from '../ui/EmojiPicker';
import { usePermissions } from '../../hooks/usePermissions';
import { API_BASE_URL } from '../../lib/apiBaseUrl';

const EMPTY_TYPING: string[] = [];

interface MessageListProps {
  channelId: string;
  onReply?: (message: Message) => void;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isToday) return `Today at ${time}`;
    if (isYesterday) return `Yesterday at ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function getTimestamp(msg: { timestamp?: string; created_at?: string }): string {
  return msg.timestamp || msg.created_at || '';
}

function shouldGroup(prev: { author: { id: string }; timestamp?: string; created_at?: string } | null, curr: { author: { id: string }; timestamp?: string; created_at?: string }): boolean {
  if (!prev) return false;
  if (prev.author.id !== curr.author.id) return false;
  const prevTs = getTimestamp(prev);
  const currTs = getTimestamp(curr);
  if (!prevTs || !currTs) return false;
  const diff = new Date(currTs).getTime() - new Date(prevTs).getTime();
  return diff < 7 * 60 * 1000;
}

function isDifferentDay(a: string, b: string): boolean {
  try {
    return new Date(a).toDateString() !== new Date(b).toDateString();
  } catch {
    return false;
  }
}

export function MessageList({ channelId, onReply }: MessageListProps) {
  const { messages } = useMessages(channelId);
  const addReaction = useMessageStore((s) => s.addReaction);
  const removeReaction = useMessageStore((s) => s.removeReaction);
  const deleteMessage = useMessageStore((s) => s.deleteMessage);
  const editMessage = useMessageStore((s) => s.editMessage);
  const pinMessage = useMessageStore((s) => s.pinMessage);
  const unpinMessage = useMessageStore((s) => s.unpinMessage);
  const channelsByGuild = useChannelStore((s) => s.channelsByGuild);
  const typingUsers = useTypingStore((s) => s.typingByChannel[channelId] ?? EMPTY_TYPING);
  const me = useAuthStore((s) => s.user?.id);
  const activeChannel = Object.values(channelsByGuild).flat().find((channel) => channel.id === channelId);
  const { permissions, isAdmin } = usePermissions(activeChannel?.guild_id || null);
  const canManageMessages = isAdmin || hasPermission(permissions, Permissions.MANAGE_MESSAGES);
  const activeTyping = typingUsers.filter((id) => id !== me);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<Message['author'] | null>(null);
  const [profilePos, setProfilePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [emojiPickerFor, setEmojiPickerFor] = useState<{ messageId: string; position: { x: number; y: number } } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.id) {
      channelApi.updateReadState(channelId, lastMessage.id).catch(() => {
        /* ignore */
      });
    }
  }, [messages.length, channelId]);

  useEffect(() => {
    if (!window.location.hash.startsWith('#msg-')) return;
    const el = document.getElementById(window.location.hash.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollButton(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const openReactionPicker = (e: React.MouseEvent, messageId: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setEmojiPickerFor({
      messageId,
      position: { x: rect.left, y: rect.bottom + 4 },
    });
  };

  const handleReactionSelect = async (emoji: string) => {
    if (!emojiPickerFor) return;
    const msgId = emojiPickerFor.messageId;
    setEmojiPickerFor(null);
    await addReaction(channelId, msgId, emoji);
    await useMessageStore.getState().fetchMessages(channelId);
  };

  const handleEditMessage = async (msg: Message) => {
    const next = window.prompt('Edit message', msg.content || '');
    if (next == null || next === msg.content) return;
    await editMessage(channelId, msg.id, next);
    setMenuMessageId(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Delete this message?')) return;
    await deleteMessage(channelId, messageId);
    setMenuMessageId(null);
  };

  const openAuthorProfile = (event: MouseEvent<HTMLElement>, msg: Message) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setProfilePos({ x: rect.left, y: rect.top });
    setProfileUser(msg.author);
  };

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto px-5"
        onScroll={handleScroll}
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border-subtle bg-bg-mod-subtle"
            >
              <Hash size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Welcome to the channel!
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              This is the start of the conversation. Say something!
            </p>
          </div>
        ) : (
          <div className="py-6">
            <div className="mb-7 rounded-2xl border border-border-subtle bg-bg-mod-subtle/60 p-4">
              <div
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-subtle bg-bg-mod-subtle"
              >
                <Hash size={28} style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-[1.35rem] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                Welcome to the channel!
              </h3>
              <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-muted)' }}>
                This is the beginning of the channel.
              </p>
            </div>

            {messages.map((msg, i) => {
              const prevMsg = i > 0 ? messages[i - 1] : null;
              const isGrouped = shouldGroup(prevMsg, msg);
              const showDateSep = prevMsg && isDifferentDay(getTimestamp(prevMsg), getTimestamp(msg));
              const isOwnMessage = msg.author.id === me;
              const canEditMessage = isOwnMessage;
              const canDeleteMessage = isOwnMessage || canManageMessages;
              const canPinMessage = canManageMessages || !activeChannel?.guild_id;
              const canOpenMessageMenu = canEditMessage || canDeleteMessage || canPinMessage;

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="my-5 flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                      <span className="rounded-full border border-border-subtle bg-bg-mod-subtle px-3 py-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(getTimestamp(msg))}
                      </span>
                      <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
                    </div>
                  )}

                  <div
                    id={`msg-${msg.id}`}
                    className="group relative -mx-2.5 flex gap-4 rounded-xl px-3 py-0.5 transition-colors"
                    style={{
                      marginTop: isGrouped ? '2px' : '1.0625rem',
                      backgroundColor: hoveredMessageId === msg.id ? 'var(--bg-mod-subtle)' : 'transparent',
                    }}
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    {isGrouped ? (
                      <div className="flex w-10 flex-shrink-0 items-start justify-center pt-0.5">
                        <span
                          className="text-[11px] opacity-0 transition-opacity group-hover:opacity-100"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {new Date(getTimestamp(msg)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm"
                        style={{ backgroundColor: 'var(--accent-primary)' }}
                        onClick={(e) => openAuthorProfile(e, msg)}
                      >
                        {msg.author.username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {!isGrouped && (
                        <div className="flex items-baseline gap-2">
                          <span
                            className="font-medium text-sm cursor-pointer hover:underline"
                            style={{ color: 'var(--text-primary)' }}
                            onClick={(e) => openAuthorProfile(e, msg)}
                          >
                            {msg.author.username}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatTimestamp(getTimestamp(msg))}
                          </span>
                          {(msg.edited_timestamp || msg.edited_at) && (
                            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }} title={`Edited: ${formatTimestamp(msg.edited_timestamp || msg.edited_at || '')}`}>
                              (edited)
                            </span>
                          )}
                        </div>
                      )}
                      <p className="break-words text-[15px]" style={{ color: 'var(--text-secondary)', lineHeight: '1.48rem' }}>
                        {msg.content}
                      </p>
                      {/* Reactions */}
                      {msg.reactions && Array.isArray(msg.reactions) && msg.reactions.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(msg.reactions as Array<{emoji: string; count: number; me: boolean}>).map((r) => (
                            <button
                              key={r.emoji}
                              onClick={async () => {
                                if (r.me) {
                                  await removeReaction(channelId, msg.id, r.emoji);
                                } else {
                                  await addReaction(channelId, msg.id, r.emoji);
                                }
                                await useMessageStore.getState().fetchMessages(channelId);
                              }}
                              className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors hover:bg-bg-mod-subtle"
                              style={{
                                borderColor: r.me ? 'var(--accent-primary)' : 'var(--border-subtle)',
                                backgroundColor: r.me ? 'rgba(111, 134, 255, 0.15)' : 'transparent',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <span>{r.emoji}</span>
                              <span className="font-medium">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-1.5 flex flex-col gap-2">
                          {msg.attachments.map((att) => {
                            const src = att.url.startsWith('http') ? att.url : `${API_BASE_URL}${att.url}`;
                            if (att.content_type?.startsWith('image/')) {
                              return (
                                <a key={att.id} href={src} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={src}
                                    alt={att.filename}
                                    className="max-w-[400px] rounded-lg border border-border-subtle"
                                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                                  />
                                </a>
                              );
                            }
                            return (
                              <a
                                key={att.id}
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-mod-subtle px-3 py-2 text-sm transition-colors hover:bg-bg-mod-strong"
                                style={{ color: 'var(--text-link)', maxWidth: 'fit-content' }}
                              >
                                <span>{att.filename}</span>
                                {att.size && <span className="text-xs text-text-muted">({(att.size / 1024).toFixed(1)} KB)</span>}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {hoveredMessageId === msg.id && (
                      <div className="message-actions rounded-xl border border-border-subtle bg-bg-floating p-0.5">
                        <button className="hover-action-btn rounded-lg" title="Add Reaction" onClick={(e) => openReactionPicker(e, msg.id)}>
                          <Smile size={16} />
                        </button>
                        <button className="hover-action-btn rounded-lg" title="Reply" onClick={() => onReply?.(msg)}>
                          <Reply size={16} />
                        </button>
                        {canOpenMessageMenu && (
                          <button
                            className="hover-action-btn rounded-lg"
                            title="More"
                            onClick={() => setMenuMessageId((curr) => (curr === msg.id ? null : msg.id))}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        )}
                      </div>
                    )}
                    {menuMessageId === msg.id && canOpenMessageMenu && (
                      <div
                        className="glass-modal absolute right-2 top-11 z-10 rounded-xl p-2"
                      >
                        {canEditMessage && (
                          <button className="context-menu-item w-full text-left" onClick={() => void handleEditMessage(msg)}>
                            Edit
                          </button>
                        )}
                        {canPinMessage && (
                          <button
                            className="context-menu-item w-full text-left"
                            onClick={() => void (msg.pinned ? unpinMessage(channelId, msg.id) : pinMessage(channelId, msg.id))}
                          >
                            {msg.pinned ? 'Unpin' : 'Pin'}
                          </button>
                        )}
                        {canDeleteMessage && (
                          <button className="context-menu-item danger w-full text-left" onClick={() => void handleDeleteMessage(msg.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {activeTyping.length > 0 && (
              <div className="px-3 py-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                {activeTyping.length === 1
                  ? 'Someone is typing...'
                  : `${activeTyping.length} people are typing...`}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-subtle bg-bg-floating px-4 py-2 text-sm text-text-primary shadow-lg transition-all hover:bg-bg-mod-subtle"
          style={{
            backdropFilter: 'blur(12px)',
          }}
        >
          <ArrowDown size={16} />
          New Messages
        </button>
      )}
      {emojiPickerFor && createPortal(
        <EmojiPicker
          position={emojiPickerFor.position}
          onSelect={(emoji) => void handleReactionSelect(emoji)}
          onClose={() => setEmojiPickerFor(null)}
        />,
        document.body
      )}
      {profileUser && createPortal(
        <UserProfilePopup
          user={{
            id: profileUser.id,
            username: profileUser.username,
            discriminator: profileUser.discriminator,
            avatar_hash: profileUser.avatar_hash || null,
            display_name: null,
            bot: false,
            system: false,
            flags: 0,
            created_at: '',
          }}
          position={profilePos}
          onClose={() => setProfileUser(null)}
        />,
        document.body
      )}
    </div>
  );
}
