import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor, MonitorOff, PhoneOff, Users } from 'lucide-react';
import { RoomEvent, Track } from 'livekit-client';
import { TopBar } from '../components/layout/TopBar';
import { MessageList } from '../components/message/MessageList';
import { MessageInput } from '../components/message/MessageInput';
import { StreamViewer } from '../components/voice/StreamViewer';
import { useChannelStore } from '../stores/channelStore';
import { useGuildStore } from '../stores/guildStore';
import { useVoice } from '../hooks/useVoice';
import { useStream } from '../hooks/useStream';
import { useVoiceStore } from '../stores/voiceStore';
import type { Message } from '../types';

function getStreamErrorMessage(error: unknown): string {
  const err = error as { name?: string; message?: string };
  const name = err?.name || '';
  const rawMessage = err?.message || '';
  const message = rawMessage.toLowerCase();

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Screen share permission was denied. Allow screen capture for this app and try again.';
  }
  if (name === 'NotReadableError') {
    return 'Screen capture is blocked by your OS or another app. Close protected content and retry.';
  }
  if (name === 'NotFoundError') {
    return 'No shareable display source was found.';
  }
  if (name === 'AbortError') {
    return 'Screen share prompt was closed before selecting a source.';
  }
  if (message.includes('voice connection is not ready')) {
    return 'Voice connection is not ready yet. Wait a moment and try again.';
  }
  if (message.includes('secure') || message.includes('https')) {
    return 'Screen sharing requires a secure context. Use localhost or HTTPS.';
  }

  if (name) {
    return `Unable to start stream (${name}). ${rawMessage || 'Check browser permissions and try again.'}`;
  }
  return `Unable to start stream. ${rawMessage || 'Check browser permissions and try again.'}`;
}

export function GuildPage() {
  const { guildId, channelId } = useParams();
  const selectGuild = useGuildStore((s) => s.selectGuild);
  const channels = useChannelStore((s) => s.channels);
  const fetchChannels = useChannelStore((s) => s.fetchChannels);
  const isLoading = useChannelStore((s) => s.isLoading);
  const selectChannel = useChannelStore((s) => s.selectChannel);
  const channel = channels.find(c => c.id === channelId);
  const {
    connected: voiceConnected,
    joining: voiceJoining,
    joiningChannelId,
    connectionError,
    connectionErrorChannelId,
    channelId: voiceChannelId,
    participants,
    joinChannel,
    leaveChannel,
    clearConnectionError,
  } = useVoice();
  const { selfStream, startStream, stopStream } = useStream();
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string; content: string } | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamStarting, setStreamStarting] = useState(false);
  const [captureQuality, setCaptureQuality] = useState('1080p60');
  const [roomTrackStreaming, setRoomTrackStreaming] = useState(false);
  const room = useVoiceStore((s) => s.room);

  const channelName = channel?.name || 'general';
  const isVoice = channel?.type === 2;
  const inSelectedVoiceChannel = Boolean(isVoice && voiceConnected && voiceChannelId === channelId);
  const voiceJoinPending = Boolean(isVoice && voiceJoining && joiningChannelId === channelId);
  const voiceJoinError = connectionErrorChannelId === channelId ? connectionError : null;
  const participantCount = Array.from(participants.values()).filter((p) => p.channel_id === channelId).length;
  const remoteStreamActive = Array.from(participants.values()).some(
    (p) => p.channel_id === channelId && p.self_stream
  );
  const anyStreamActive = selfStream || remoteStreamActive || roomTrackStreaming;

  // Fetch channels when guildId changes
  useEffect(() => {
    if (guildId) {
      selectGuild(guildId);
      useChannelStore.getState().selectGuild(guildId);
      fetchChannels(guildId);
    }
  }, [guildId, fetchChannels, selectGuild]);

  useEffect(() => {
    if (channelId) {
      selectChannel(channelId);
      setReplyingTo(null);
      setStreamError(null);
    }
  }, [channelId, selectChannel]);

  useEffect(() => {
    if (!room || !inSelectedVoiceChannel) {
      setRoomTrackStreaming(false);
      return;
    }

    const recomputeStreamState = () => {
      let hasScreenTrack = false;

      for (const publication of room.localParticipant.videoTrackPublications.values()) {
        if (publication.source === Track.Source.ScreenShare && publication.track) {
          hasScreenTrack = true;
          break;
        }
      }

      if (!hasScreenTrack) {
        for (const participant of room.remoteParticipants.values()) {
          for (const publication of participant.videoTrackPublications.values()) {
            if (publication.source === Track.Source.ScreenShare && publication.track) {
              hasScreenTrack = true;
              break;
            }
          }
          if (hasScreenTrack) break;
        }
      }

      setRoomTrackStreaming(hasScreenTrack);
    };

    recomputeStreamState();
    room.on(RoomEvent.TrackSubscribed, recomputeStreamState);
    room.on(RoomEvent.TrackUnsubscribed, recomputeStreamState);
    room.on(RoomEvent.ParticipantConnected, recomputeStreamState);
    room.on(RoomEvent.ParticipantDisconnected, recomputeStreamState);
    room.on(RoomEvent.LocalTrackPublished, recomputeStreamState);
    room.on(RoomEvent.LocalTrackUnpublished, recomputeStreamState);

    return () => {
      room.off(RoomEvent.TrackSubscribed, recomputeStreamState);
      room.off(RoomEvent.TrackUnsubscribed, recomputeStreamState);
      room.off(RoomEvent.ParticipantConnected, recomputeStreamState);
      room.off(RoomEvent.ParticipantDisconnected, recomputeStreamState);
      room.off(RoomEvent.LocalTrackPublished, recomputeStreamState);
      room.off(RoomEvent.LocalTrackUnpublished, recomputeStreamState);
    };
  }, [room, inSelectedVoiceChannel]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <TopBar channelName="Loading..." />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
              style={{ borderColor: 'var(--text-muted)', borderTopColor: 'var(--accent-primary)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading channels...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar
        channelName={channelName}
        channelTopic={channel?.topic}
        isVoice={isVoice}
      />
      {isVoice ? (
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-5 text-text-muted">
          <div className="glass-panel rounded-2xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle bg-bg-mod-subtle text-text-secondary">
                  <Users size={19} />
                </div>
                <div>
                  <div className="text-base font-semibold leading-tight text-text-primary">{channelName}</div>
                  <div className="text-xs leading-tight text-text-secondary">Participants: {participantCount}</div>
                </div>
              </div>
              {inSelectedVoiceChannel ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    className="control-pill-btn min-w-[132px]"
                    onClick={() => void leaveChannel()}
                  >
                    <PhoneOff size={16} />
                    Leave Voice
                  </button>
                  {!selfStream ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={captureQuality}
                        onChange={(e) => setCaptureQuality(e.target.value)}
                        className="h-10 rounded-xl border border-border-subtle bg-bg-mod-subtle px-3.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:bg-bg-mod-faint"
                        title="Capture quality"
                        disabled={streamStarting}
                      >
                        <option value="720p30">720p 30fps</option>
                        <option value="1080p60">1080p 60fps</option>
                        <option value="1440p60">1440p 60fps</option>
                        <option value="4k60">4K 60fps</option>
                      </select>
                      <button
                        className="control-pill-btn min-w-[146px] border-accent-primary/50 bg-accent-primary/15 hover:bg-accent-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={streamStarting}
                        onClick={async () => {
                          setStreamError(null);
                          setStreamStarting(true);
                          try {
                            await startStream(captureQuality);
                          } catch (error) {
                            setStreamError(getStreamErrorMessage(error));
                          } finally {
                            setStreamStarting(false);
                          }
                        }}
                      >
                        <Monitor size={16} />
                        {streamStarting ? 'Starting...' : 'Start Stream'}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="control-pill-btn min-w-[146px] border-accent-primary/50 bg-accent-primary/20 hover:bg-accent-primary/30"
                      onClick={() => {
                        stopStream();
                        setStreamError(null);
                      }}
                    >
                      <MonitorOff size={16} />
                      Stop Stream
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="rounded-xl border border-border-subtle bg-bg-mod-subtle px-3.5 py-2.5 text-sm font-medium text-text-secondary">
                    {voiceJoinPending
                      ? 'Connecting to voice...'
                      : voiceJoinError
                        ? `Voice join failed: ${voiceJoinError}`
                        : 'Join from the channel rail to start speaking or screen sharing.'}
                  </div>
                  {voiceJoinError && channelId && guildId && (
                    <button
                      className="control-pill-btn min-w-[120px]"
                      onClick={() => {
                        clearConnectionError();
                        void joinChannel(channelId, guildId);
                      }}
                    >
                      Retry Join
                    </button>
                  )}
                </div>
              )}
            </div>
            {streamError && (
              <div className="mt-3 rounded-xl border border-accent-danger/50 bg-accent-danger/10 px-3.5 py-2.5 text-sm font-medium text-accent-danger">
                {streamError}
              </div>
            )}
          </div>
          {inSelectedVoiceChannel && anyStreamActive && (
            <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border-subtle" style={{ minHeight: '300px' }}>
              <StreamViewer
                expectingStream={selfStream && !roomTrackStreaming}
                onStopStream={() => {
                  stopStream();
                  setStreamError(null);
                }}
              />
            </div>
          )}
          {inSelectedVoiceChannel && !anyStreamActive && (
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-border-subtle bg-bg-mod-subtle/30">
              <div className="pointer-events-none absolute -top-12 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent-primary/15 blur-3xl" />
              <div className="relative mx-4 flex w-full max-w-md flex-col items-center rounded-2xl border border-border-subtle bg-bg-mod-subtle/70 px-7 py-7 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-border-subtle bg-bg-primary/70 text-text-secondary">
                  <Monitor size={20} />
                </div>
                <div className="text-base font-semibold text-text-primary">No active stream</div>
                <div className="mt-1 text-sm text-text-secondary">
                  Share your screen to present docs, demos, or code walkthroughs in this voice room.
                </div>
                <div className="mt-4 text-xs text-text-muted">
                  Stream controls appear automatically once a stream is live.
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <MessageList
            channelId={channelId!}
            onReply={(msg: Message) =>
              setReplyingTo({
                id: msg.id,
                author: msg.author.username,
                content: msg.content || '',
              })
            }
          />
          <MessageInput
            channelId={channelId!}
            guildId={guildId}
            channelName={channelName}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        </>
      )}
    </div>
  );
}
