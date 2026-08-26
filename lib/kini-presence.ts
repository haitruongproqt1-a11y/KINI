export type KiniPresence = {
  isOnline: boolean;
  lastActiveAt: Date | string | null;
} | null | undefined;

function timeLabel(value: Date) {
  return value.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

/** Chuẩn hóa trạng thái cho đầu cuộc trò chuyện, dựa trên thời điểm hoạt động thật từ server. */
export function formatKiniPresence(presence: KiniPresence, now = new Date()) {
  if (presence?.isOnline) return "Đang online";
  if (!presence?.lastActiveAt) return "Đang offline";

  const lastActive = new Date(presence.lastActiveAt);
  const elapsed = now.getTime() - lastActive.getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "Đang offline";
  if (elapsed < 60_000) return "Offline • vừa hoạt động";

  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `Offline • ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Offline • ${hours} giờ trước`;

  const date = lastActive.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `Offline • ${date} lúc ${timeLabel(lastActive)}`;
}
