import type { MediaEngine, ScreenShareConfig } from './mediaEngine';

// Tauri API imports - these resolve at runtime in the Tauri environment
let invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
let listen: (event: string, handler: (event: { payload: unknown }) => void) => Promise<() => void>;

// Dynamic import to avoid bundling issues in browser builds
const tauriReady = (async () => {
  try {
    const core = await import('@tauri-apps/api/core');
    const event = await import('@tauri-apps/api/event');
    invoke = core.invoke;
    listen = event.listen;
  } catch {
    // Not in Tauri environment
  }
})();

type UnlistenFn = () => void;

/**
 * Tauri desktop media engine.
 * Communicates with the Rust native media engine via Tauri IPC commands.
 * The native side handles QUIC transport, Opus encoding, and P2P connections.
 */
export class TauriMediaEngine implements MediaEngine {
  private unlisteners: UnlistenFn[] = [];

  // Screen share state — uses getDisplayMedia in the WebView for capture
  private screenStream: MediaStream | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private screenShareEndedCb: (() => void) | null = null;

  async connect(endpoint: string, token: string): Promise<void> {
    await tauriReady;
    // Extract room_id from endpoint or pass as part of token payload
    await invoke('start_voice_session', { endpoint, token, roomId: '' });
  }

  async disconnect(): Promise<void> {
    await tauriReady;
    // Clean up screen share
    this.cleanupScreenShare();
    // Unsubscribe all event listeners
    for (const unlisten of this.unlisteners) {
      unlisten();
    }
    this.unlisteners = [];
    await invoke('stop_voice_session');
  }

  setMute(muted: boolean): void {
    invoke('voice_set_mute', { muted });
  }

  setDeaf(deafened: boolean): void {
    invoke('voice_set_deaf', { deafened });
  }

  enableVideo(enabled: boolean): void {
    invoke('voice_enable_video', { enabled });
  }

  async startScreenShare(config: ScreenShareConfig): Promise<void> {
    await tauriReady;

    // Clean up any existing screen share first
    this.cleanupScreenShare();

    // Use getDisplayMedia in the WebView to show the screen/window picker
    // and capture the screen. WebView2 (Chromium) fully supports this API.
    //
    // Do NOT constrain width/height — let the browser capture at the
    // source's full device-pixel resolution. Constraining with max values
    // causes the capture pipeline to downscale (often compounded by Windows
    // DPI scaling, e.g. a 4K monitor at 150% = 2560x1440 logical → an
    // additional downscale to 1920x1080 makes the stream look very soft).
    // The quality preset will control encoding bitrate/resolution when the
    // QUIC transport sends frames; the capture itself should always be
    // native resolution for the sharpest local preview.
    const targetFps = config.maxFrameRate ?? 30;

    const constraints: DisplayMediaStreamOptions = {
      video: {
        frameRate: { ideal: targetFps, max: targetFps },
      },
      audio: config.audio,
    };

    this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

    const videoTracks = this.screenStream.getVideoTracks();
    if (videoTracks.length === 0) {
      this.screenStream = null;
      throw new Error('No video track in screen share stream');
    }

    this.screenTrack = videoTracks[0];

    // When the user clicks "Stop sharing" in the browser's native overlay,
    // the track ends. Clean up and notify the voiceStore.
    this.screenTrack.addEventListener('ended', () => {
      this.cleanupScreenShare();
      this.screenShareEndedCb?.();
    });

    // Notify the Rust side (stub for now — will route frames to QUIC later)
    await invoke('voice_start_screen_share');
  }

  stopScreenShare(): void {
    this.cleanupScreenShare();
    invoke('voice_stop_screen_share');
  }

  getLocalScreenShareTrack(): MediaStreamTrack | null {
    return this.screenTrack;
  }

  onScreenShareEnded(cb: () => void): void {
    this.screenShareEndedCb = cb;
  }

  private cleanupScreenShare(): void {
    if (this.screenTrack) {
      this.screenTrack.stop();
      this.screenTrack = null;
    }
    if (this.screenStream) {
      for (const track of this.screenStream.getTracks()) {
        track.stop();
      }
      this.screenStream = null;
    }
  }

  onSpeakingChange(cb: (speakers: Map<string, number>) => void): void {
    tauriReady.then(async () => {
      const unlisten = await listen('media_speaking_change', (event) => {
        const payload = event.payload as Record<string, number>;
        const speakers = new Map(Object.entries(payload));
        cb(speakers);
      });
      this.unlisteners.push(unlisten);
    });
  }

  onParticipantJoin(cb: (userId: string) => void): void {
    tauriReady.then(async () => {
      const unlisten = await listen('media_participant_join', (event) => {
        cb(event.payload as string);
      });
      this.unlisteners.push(unlisten);
    });
  }

  onParticipantLeave(cb: (userId: string) => void): void {
    tauriReady.then(async () => {
      const unlisten = await listen('media_participant_leave', (event) => {
        cb(event.payload as string);
      });
      this.unlisteners.push(unlisten);
    });
  }

  subscribeVideo(userId: string, canvas: HTMLCanvasElement): void {
    // Use Tauri Channel API for streaming video frames to the canvas
    invoke('media_subscribe_video', {
      userId,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    }).then(async () => {
      const unlisten = await listen(`media_video_frame_${userId}`, (event) => {
        const frame = event.payload as { width: number; height: number; data: number[] };
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const imageData = new ImageData(
          new Uint8ClampedArray(frame.data),
          frame.width,
          frame.height,
        );
        ctx.putImageData(imageData, 0, 0);
      });
      this.unlisteners.push(unlisten);
    });
  }
}
