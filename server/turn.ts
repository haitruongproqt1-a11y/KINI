type IceServer = { urls: string | string[]; username?: string; credential?: string };

type CachedCredential = {
  expiresAt: number;
  iceServers: IceServer[];
};

const cache = new Map<number, CachedCredential>();
const TURN_DOMAIN_PATTERN = /^[a-z0-9][a-z0-9.-]*\.metered\.live$/i;

function configuration() {
  const domain = process.env.METERED_TURN_DOMAIN?.trim().toLowerCase();
  const secretKey = process.env.METERED_TURN_SECRET_KEY?.trim();
  if (!domain || !secretKey || !TURN_DOMAIN_PATTERN.test(domain)) {
    throw new Error("TURN KINI chưa được cấu hình hợp lệ.");
  }
  return { domain, secretKey };
}

function normalizeIceServers(value: unknown): IceServer[] {
  if (!Array.isArray(value)) throw new Error("Provider TURN trả về danh sách ICE không hợp lệ.");
  const servers = value.flatMap((item): IceServer[] => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const urls = typeof source.urls === "string" || Array.isArray(source.urls) ? source.urls : null;
    if (!urls) return [];
    const cleanUrls = Array.isArray(urls) ? urls.filter((url): url is string => typeof url === "string" && /^(stun|turn|turns):/i.test(url)) : /^(stun|turn|turns):/i.test(urls) ? urls : null;
    if (!cleanUrls || (Array.isArray(cleanUrls) && cleanUrls.length === 0)) return [];
    return [{
      urls: cleanUrls,
      ...(typeof source.username === "string" ? { username: source.username } : {}),
      ...(typeof source.credential === "string" ? { credential: source.credential } : {}),
    }];
  });
  if (!servers.some((server) => (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url) => /^turns?:/i.test(url)))) {
    throw new Error("Provider TURN không trả về relay media.");
  }
  return servers.slice(0, 8);
}

/** Cấp credential TURN ngắn hạn; Secret Key chỉ tồn tại ở backend. */
export async function getUserIceServers(userId: number): Promise<IceServer[]> {
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.iceServers;
  const { domain, secretKey } = configuration();
  const create = await fetch(`https://${domain}/api/v1/turn/credential?secretKey=${encodeURIComponent(secretKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiryInSeconds: 1_800, label: `kini-user-${userId}` }),
  });
  if (!create.ok) throw new Error("Không thể cấp credential TURN từ provider.");
  const credential = await create.json() as { apiKey?: unknown };
  if (typeof credential.apiKey !== "string" || !credential.apiKey) throw new Error("Provider TURN không trả API key hợp lệ.");
  const response = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(credential.apiKey)}&region=asia`);
  if (!response.ok) throw new Error("Không thể lấy danh sách TURN relay.");
  const iceServers = normalizeIceServers(await response.json());
  cache.set(userId, { iceServers, expiresAt: Date.now() + 15 * 60_000 });
  return iceServers;
}
