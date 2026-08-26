import { describe, expect, it } from "vitest";

const domain = process.env.METERED_TURN_DOMAIN;
const secretKey = process.env.METERED_TURN_SECRET_KEY;

describe.skipIf(!domain || !secretKey)("Metered TURN credentials", () => {
  it("tạo được credential hết hạn ngắn từ backend provider", async () => {
    const response = await fetch(`https://${domain}/api/v1/turn/credential?secretKey=${encodeURIComponent(secretKey as string)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiryInSeconds: 60, label: `kini-secret-check-${Date.now()}` }),
    });
    expect(response.ok).toBe(true);
    const body = await response.json() as { apiKey?: unknown; username?: unknown; password?: unknown };
    expect(typeof body.apiKey).toBe("string");
    expect(typeof body.username).toBe("string");
    expect(typeof body.password).toBe("string");
    const iceResponse = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${encodeURIComponent(body.apiKey as string)}&region=asia`);
    expect(iceResponse.ok).toBe(true);
    const iceServers = await iceResponse.json() as Array<{ urls?: string | string[]; username?: unknown; credential?: unknown }>;
    expect(Array.isArray(iceServers)).toBe(true);
    expect(iceServers.some((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((url) => typeof url === "string" && /^turns?:/i.test(url)) && typeof server.username === "string" && typeof server.credential === "string";
    })).toBe(true);
  }, 20_000);
});
