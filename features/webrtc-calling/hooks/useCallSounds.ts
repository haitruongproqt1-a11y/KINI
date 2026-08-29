import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect } from "react";
import type { CallDirection, CallMode, CallStatus } from "../services/types";

const incomingSound = require("@/assets/audio/kini-incoming-ring.mp3");
const ringbackSound = require("@/assets/audio/kini-outgoing-ringback.mp3");

type ReleasableAudioPlayer = {
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  release: () => void;
  stop?: () => void | Promise<void>;
};

let activeCallSoundCleanup: (() => void) | null = null;

/** Dừng tức thì mọi âm thanh KINI đang thuộc về cuộc gọi hiện tại. */
export function stopCallSounds() {
  activeCallSoundCleanup?.();
}

/** Phát nhạc chuông/nhạc chờ cục bộ; không bao giờ chặn luồng media WebRTC. */
export function useCallSounds(status: CallStatus, direction: CallDirection, mode: CallMode | null, isScreenSharing = false) {
  const incoming = useAudioPlayer(incomingSound);
  const ringback = useAudioPlayer(ringbackSound);
  useEffect(() => {
    incoming.loop = true;
    ringback.loop = true;
  }, [incoming, ringback]);

  const stopPlayers = useCallback(() => {
    const stopPlayer = (player: ReleasableAudioPlayer) => {
      try {
        if (typeof player.stop === "function") {
          const result = player.stop();
          if (result && typeof (result as Promise<void>).catch === "function") void (result as Promise<void>).catch(() => undefined);
        } else {
          player.pause();
        }
      } catch {
        try { player.pause(); } catch { /* Player có thể đã được Expo giải phóng. */ }
      }
      try { void player.seekTo(0).catch(() => undefined); } catch { /* Player có thể đã được Expo giải phóng. */ }
    };
    stopPlayer(incoming as unknown as ReleasableAudioPlayer);
    stopPlayer(ringback as unknown as ReleasableAudioPlayer);
  }, [incoming, ringback]);

  useEffect(() => {
    const shouldRingIncoming = status === "ringing" && direction === "incoming";
    // Khi MediaProjection khởi động, chỉ giữ audio WebRTC; không để nhạc chờ tiếp tục chen vào.
    // Mọi ringback đều dùng file KINI; không gọi InCallManager để tránh âm thanh mặc định của hệ thống.
    const shouldPlayRingback = !isScreenSharing && status === "ringing" && direction === "outgoing";
    const setPlaying = (player: typeof incoming, shouldPlay: boolean) => {
      try {
        if (shouldPlay) {
          player.seekTo(0);
          player.play();
        } else {
          player.pause();
          player.seekTo(0);
        }
      } catch {
        // Âm thanh là feedback phụ; cuộc gọi vẫn tiếp tục nếu thiết bị chặn phát audio.
      }
    };
    setPlaying(incoming, shouldRingIncoming);
    setPlaying(ringback, shouldPlayRingback);
  }, [direction, incoming, isScreenSharing, mode, ringback, status]);

  useEffect(() => {
    activeCallSoundCleanup = stopPlayers;
    return () => {
      if (activeCallSoundCleanup === stopPlayers) activeCallSoundCleanup = null;
      stopPlayers();
      try { incoming.release(); } catch { /* Player đã được Expo release. */ }
      try { ringback.release(); } catch { /* Player đã được Expo release. */ }
    };
  }, [incoming, ringback, stopPlayers]);
}
