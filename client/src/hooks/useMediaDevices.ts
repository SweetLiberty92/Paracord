import { useState, useEffect, useCallback } from 'react';

interface MediaDeviceState {
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  selectedAudioInput: string | null;
  selectedAudioOutput: string | null;
  selectedVideoInput: string | null;
}

export function useMediaDevices() {
  const [state, setState] = useState<MediaDeviceState>({
    audioInputDevices: [],
    audioOutputDevices: [],
    videoInputDevices: [],
    selectedAudioInput: null,
    selectedAudioOutput: null,
    selectedVideoInput: null,
  });

  const enumerate = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setState((s) => ({
        ...s,
        audioInputDevices: devices.filter((d) => d.kind === 'audioinput'),
        audioOutputDevices: devices.filter((d) => d.kind === 'audiooutput'),
        videoInputDevices: devices.filter((d) => d.kind === 'videoinput'),
      }));
    } catch {
      /* permission denied or unsupported */
    }
  }, []);

  useEffect(() => {
    enumerate();
    navigator.mediaDevices?.addEventListener('devicechange', enumerate);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', enumerate);
    };
  }, [enumerate]);

  const selectAudioInput = useCallback((deviceId: string) => {
    setState((s) => ({ ...s, selectedAudioInput: deviceId }));
  }, []);

  const selectAudioOutput = useCallback((deviceId: string) => {
    setState((s) => ({ ...s, selectedAudioOutput: deviceId }));
  }, []);

  const selectVideoInput = useCallback((deviceId: string) => {
    setState((s) => ({ ...s, selectedVideoInput: deviceId }));
  }, []);

  return {
    ...state,
    enumerate,
    selectAudioInput,
    selectAudioOutput,
    selectVideoInput,
  };
}
