import { useCallback } from 'react';
import { useVoiceStore } from '../stores/voiceStore';
import { gateway } from '../gateway/connection';

export function useVoice() {
  const connected = useVoiceStore((s) => s.connected);
  const joining = useVoiceStore((s) => s.joining);
  const joiningChannelId = useVoiceStore((s) => s.joiningChannelId);
  const connectionError = useVoiceStore((s) => s.connectionError);
  const connectionErrorChannelId = useVoiceStore((s) => s.connectionErrorChannelId);
  const channelId = useVoiceStore((s) => s.channelId);
  const guildId = useVoiceStore((s) => s.guildId);
  const selfMute = useVoiceStore((s) => s.selfMute);
  const selfDeaf = useVoiceStore((s) => s.selfDeaf);
  const selfStream = useVoiceStore((s) => s.selfStream);
  const participants = useVoiceStore((s) => s.participants);
  const livekitToken = useVoiceStore((s) => s.livekitToken);
  const livekitUrl = useVoiceStore((s) => s.livekitUrl);
  const startStreamStore = useVoiceStore((s) => s.startStream);
  const stopStreamStore = useVoiceStore((s) => s.stopStream);
  const clearConnectionError = useVoiceStore((s) => s.clearConnectionError);

  const joinChannel = useCallback(
    async (targetChannelId: string, targetGuildId?: string) => {
      try {
        await useVoiceStore.getState().joinChannel(targetChannelId, targetGuildId);
        gateway.updateVoiceState(
          targetGuildId || null,
          targetChannelId,
          false,
          false
        );
      } catch (err) {
        console.error('[voice] Failed to join channel:', err);
      }
    },
    []
  );

  const leaveChannel = useCallback(async () => {
    gateway.updateVoiceState(guildId, null, false, false);
    await useVoiceStore.getState().leaveChannel();
  }, [guildId]);

  const toggleMute = useCallback(() => {
    useVoiceStore.getState().toggleMute();
    const state = useVoiceStore.getState();
    gateway.updateVoiceState(
      state.guildId,
      state.channelId,
      state.selfMute,
      state.selfDeaf
    );
  }, []);

  const toggleDeaf = useCallback(() => {
    useVoiceStore.getState().toggleDeaf();
    const state = useVoiceStore.getState();
    gateway.updateVoiceState(
      state.guildId,
      state.channelId,
      state.selfMute,
      state.selfDeaf
    );
  }, []);

  const startStream = useCallback(async (qualityPreset?: string) => {
    await startStreamStore(qualityPreset);
  }, [startStreamStore]);

  const stopStream = useCallback(() => {
    stopStreamStore();
  }, [stopStreamStore]);

  return {
    connected,
    joining,
    joiningChannelId,
    connectionError,
    connectionErrorChannelId,
    channelId,
    guildId,
    selfMute,
    selfDeaf,
    selfStream,
    participants,
    livekitToken,
    livekitUrl,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleDeaf,
    startStream,
    stopStream,
    clearConnectionError,
  };
}
