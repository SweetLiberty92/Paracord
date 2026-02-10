import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircleMore } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { MessageList } from '../components/message/MessageList';
import { MessageInput } from '../components/message/MessageInput';
import { useChannelStore } from '../stores/channelStore';
import type { Channel, Message } from '../types';

const EMPTY_CHANNELS: Channel[] = [];

export function DMPage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const dmChannels = useChannelStore((s) => s.channelsByGuild[''] ?? EMPTY_CHANNELS);
  const dmChannel = dmChannels.find((c) => c.id === channelId);
  const recipientName = dmChannel?.recipient?.username || 'Direct Message';
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string; content: string } | null>(null);

  useEffect(() => {
    setReplyingTo(null);
  }, [channelId]);

  if (!channelId) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <TopBar isDM recipientName="Direct Messages" />
        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 md:p-6">
          <div className="pointer-events-none absolute -top-14 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-accent-primary/15 blur-3xl" />
          <div className="relative flex w-full max-w-xl flex-col items-center rounded-2xl border border-border-subtle bg-bg-mod-subtle/70 px-8 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-bg-primary/70 text-text-secondary">
              <MessageCircleMore size={21} />
            </div>
            <div className="text-base font-semibold text-text-primary">Select a conversation</div>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Pick an existing DM from the left rail, or start a new one from your friends list.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button className="btn-primary" onClick={() => navigate('/app/friends')}>
                Browse Friends
              </button>
              <button
                className="rounded-lg border border-border-subtle bg-bg-mod-subtle px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary"
                onClick={() => navigate('/app/friends')}
              >
                Start New DM
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar isDM recipientName={recipientName} />
      <MessageList
        channelId={channelId}
        onReply={(msg: Message) =>
          setReplyingTo({
            id: msg.id,
            author: msg.author.username,
            content: msg.content || '',
          })
        }
      />
      <MessageInput channelId={channelId} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} />
    </div>
  );
}
