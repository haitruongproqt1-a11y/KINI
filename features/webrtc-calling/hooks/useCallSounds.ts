import { useAudioPlayer } from "expo-audio";
import { useEffect } from "react";

import type { CallDirection, CallStatus } from "../services/types";

const incomingSound = require("@/assets/audio/kini-incoming-ring.mp3");
const ringbackSound = require("@/assets/audio/kini-outgoing-ringback.mp3");

/** Phát nhạc chuông/nhạc chờ cục bộ; không bao giờ chặn luồng media WebRTC. */
export function useCallSounds(status: CallStatus, direction: CallDirection) {
  const incoming = useAudioPlayer(incomingSound);
  const ringback = useAudioPlayer(ringbackSound);

  useEffect(() => {
    incoming.loop = true;
    ringback.loop = true;
  }, [incoming, ringback]);

  useEffect(() => {
    const shouldRingIncoming = status === "ringing" && direction === "incoming";
    const shouldPlayRingback = status === "ringing" && direction === "outgoing";
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
  }, [direction, incoming, ringback, status]);
}
