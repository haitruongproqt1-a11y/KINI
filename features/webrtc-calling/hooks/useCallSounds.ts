import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import InCallManager from "react-native-incall-manager";

import type { CallDirection, CallMode, CallStatus } from "../services/types";

const incomingSound = require("@/assets/audio/kini-incoming-ring.mp3");
const ringbackSound = require("@/assets/audio/kini-outgoing-ringback.mp3");

/** Phát nhạc chuông/nhạc chờ cục bộ; không bao giờ chặn luồng media WebRTC. */
export function useCallSounds(status: CallStatus, direction: CallDirection, mode: CallMode | null) {
  const incoming = useAudioPlayer(incomingSound);
  const ringback = useAudioPlayer(ringbackSound);
  const nativeVoiceRingback = useRef(false);

  useEffect(() => {
    incoming.loop = true;
    ringback.loop = true;
  }, [incoming, ringback]);

  useEffect(() => {
    const shouldRingIncoming = status === "ringing" && direction === "incoming";
    const shouldPlayVoiceRingback = Platform.OS === "android" && mode === "voice" && status === "ringing" && direction === "outgoing";
    const shouldPlayRingback = status === "ringing" && direction === "outgoing" && !shouldPlayVoiceRingback;
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
    try {
      if (shouldPlayVoiceRingback && !nativeVoiceRingback.current) {
        InCallManager.startRingback("_DTMF_");
        nativeVoiceRingback.current = true;
      } else if (!shouldPlayVoiceRingback && nativeVoiceRingback.current) {
        InCallManager.stopRingback();
        nativeVoiceRingback.current = false;
      }
    } catch { /* Thiết bị vẫn có thể phát ringback Expo hoặc tiếp tục cuộc gọi nếu native tone bị chặn. */ }
  }, [direction, incoming, mode, ringback, status]);

  useEffect(() => () => {
    if (!nativeVoiceRingback.current) return;
    try { InCallManager.stopRingback(); } catch { /* Native audio đã được giải phóng. */ }
    nativeVoiceRingback.current = false;
  }, []);
}
