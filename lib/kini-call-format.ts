export function formatCallDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatCallPing(pingMs: number | null) {
  if (pingMs === null || !Number.isFinite(pingMs)) return "Đang đo ping…";
  return `Ping ${Math.max(0, Math.round(pingMs))} ms`;
}
