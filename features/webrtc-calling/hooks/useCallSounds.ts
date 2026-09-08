import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useRef } from "react";
import type { CallDirection, CallMode, CallStatus } from "../services/types";

const incomingSound = require("@/assets/audio/kini-incoming-ring.mp3");
const ringbackSound = require("@/assets/audio/kini-outgoing-ringback.mp3");

type ReleasableAudioPlayer = {
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  release: () => void;
  play: () => void;
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
  const playbackGeneration = useRef(0);

  useEffect(() => {
    incoming.loop = true;
    ringback.loop = true;
  }, [incoming, ringback]);

  const stopPlayer = useCallback((player: ReleasableAudioPlayer) => {
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
  }, []);

  const stopPlayers = useCallback(() => {
    playbackGeneration.current += 1;
    stopPlayer(incoming as unknown as ReleasableAudioPlayer);
    stopPlayer(ringback as unknown as ReleasableAudioPlayer);
  }, [incoming, ringback, stopPlayer]);

  const startPlayer = useCallback(async (player: ReleasableAudioPlayer, generation: number) => {
    try {
      await player.seekTo(0);
      if (generation !== playbackGeneration.current) return;
      player.play();
    } catch {
      // Âm thanh là feedback phụ; cuộc gọi vẫn tiếp tục nếu thiết bị chặn phát audio.
    }
  }, []);

  useEffect(() => {
    const shouldRingIncoming = status === "ringing" && direction === "incoming";
    const shouldPlayRingback = !isScreenSharing && status === "ringing" && direction === "outgoing";
    const generation = playbackGeneration.current + 1;
    playbackGeneration.current = generation;

    stopPlayer(incoming as unknown as ReleasableAudioPlayer);
    stopPlayer(ringback as unknown as ReleasableAudioPlayer);
    if (shouldRingIncoming) void startPlayer(incoming as unknown as ReleasableAudioPlayer, generation);
    if (shouldPlayRingback) void startPlayer(ringback as unknown as ReleasableAudioPlayer, generation);

    return () => {
      if (playbackGeneration.current === generation) stopPlayers();
    };
  }, [direction, incoming, isScreenSharing, mode, ringback, startPlayer, status, stopPlayer, stopPlayers]);

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
