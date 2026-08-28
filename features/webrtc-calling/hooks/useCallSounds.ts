import { useAudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { Platform } from "react-native";

import type { CallDirection, CallMode, CallStatus } from "../services/types";

const incomingSound = require("@/assets/audio/kini-incoming-ring.mp3");
const ringbackSound = require("@/assets/audio/kini-outgoing-ringback.mp3");

/** Phát nhạc chuông/nhạc chờ cục bộ; không bao giờ chặn luồng media WebRTC. */
export function useCallSounds(status: CallStatus, direction: CallDirection, mode: CallMode | null, isScreenSharing = false) {
  const incoming = useAudioPlayer(incomingSound);
  const ringback = useAudioPlayer(ringbackSound);
  useEffect(() => {
    incoming.loop = true;
    ringback.loop = true;
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

  useEffect(() => () => {
    // Cleanup này là lớp bảo vệ cuối cùng: dừng player Expo nếu Provider bị unmount
    // trước khi effect trạng thái kịp chạy lại.
    try { incoming.pause(); incoming.seekTo(0); } catch { /* Player đã release. */ }
    try { ringback.pause(); ringback.seekTo(0); } catch { /* Player đã release. */ }
  }, [incoming, ringback]);
}
