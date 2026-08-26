import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { storagePresignPut, storagePut } from "../storage";
import { appRouter } from "../routers";
import * as db from "../db";
import { sdk } from "./sdk";
import crypto from "node:crypto";
import { createContext } from "./context";
import { getSigningPayloadFromGithubToken } from "../github-build-signing";
import { registerCallSignaling } from "../signaling/index";
import { getUserIceServers } from "../turn";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  registerCallSignaling(server);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "80mb" }));
  app.use(express.urlencoded({ limit: "80mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  async function authenticateKiniApi(req: express.Request, res: express.Response) {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Bạn cần đăng nhập để dùng Tìm Quanh Đây." });
        return null;
      }
      return user;
    } catch {
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại." });
      return null;
    }
  }

  app.get("/api/profile/me", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    try {
      res.json(await db.getNearbyProfile(user.id, user.name));
    } catch (error) {
      res.status(503).json({ error: error instanceof Error ? error.message : "Không thể tải hồ sơ Tìm Quanh Đây." });
    }
  });

  app.post("/api/profile/save", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    const allowedGender = ["male", "female", "other", "prefer_not"] as const;
    const allowedStatus = ["single", "dating", "married", "complicated", "prefer_not"] as const;
    const gender = allowedGender.includes(req.body?.gender) ? req.body.gender : null;
    const status = allowedStatus.includes(req.body?.status) ? req.body.status : null;
    const birthYear = req.body?.birthYear === null || req.body?.birthYear === undefined || req.body?.birthYear === "" ? null : Number(req.body.birthYear);
    if (birthYear !== null && (!Number.isInteger(birthYear))) {
      res.status(400).json({ error: "Năm sinh không hợp lệ." });
      return;
    }
    try {
      res.json(await db.saveNearbyProfile(user.id, user.name, { gender, status, birthYear, province: typeof req.body?.province === "string" ? req.body.province : null, bio: typeof req.body?.bio === "string" ? req.body.bio : null, job: typeof req.body?.job === "string" ? req.body.job : null }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
    }
  });

  app.post("/api/location/update", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    try {
      res.json(await db.updateNearbyLocation(user.id, user.name, Number(req.body?.lat), Number(req.body?.lng)));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể cập nhật vị trí." });
    }
  });

  app.post("/api/discovery/toggle", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    const duration = ["24h", "7d", "permanent"].includes(req.body?.duration) ? req.body.duration as "24h" | "7d" | "permanent" : undefined;
    if (typeof req.body?.is_discoverable !== "boolean") {
      res.status(400).json({ error: "Trạng thái hiển thị không hợp lệ." });
      return;
    }
    try {
      res.json(await db.toggleNearbyDiscovery(user.id, user.name, req.body.is_discoverable, duration));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể cập nhật quyền riêng tư." });
    }
  });

  app.get("/api/users/nearby", async (req, res) => {
    const user = await authenticateKiniApi(req, res);
    if (!user) return;
    const gender = ["male", "female", "other", "prefer_not"].includes(String(req.query.gender)) ? String(req.query.gender) as db.NearbyGender : undefined;
    const status = ["single", "dating", "married", "complicated", "prefer_not"].includes(String(req.query.status)) ? String(req.query.status) as db.NearbyStatus : undefined;
    try {
      res.json(await db.listNearbyUsers(user.id, {
        lat: Number(req.query.lat), lng: Number(req.query.lng), radius: Number(req.query.radius ?? 50), gender, status,
        province: typeof req.query.province === "string" ? req.query.province : undefined,
        ageFrom: req.query.age_from ? Number(req.query.age_from) : undefined,
        ageTo: req.query.age_to ? Number(req.query.age_to) : undefined,
        q: typeof req.query.q === "string" ? req.query.q : undefined,
        sort: req.query.sort === "far" ? "far" : "near",
        page: req.query.page ? Number(req.query.page) : 1,
      }));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Không thể tìm người quanh đây." });
    }
  });

  app.get("/api/call/ice", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại trước khi gọi." });
      return;
    }
    if (!user) {
      res.status(401).json({ error: "Bạn cần đăng nhập để thực hiện cuộc gọi." });
      return;
    }
    try {
      const iceServers = await getUserIceServers(user.id);
      res.setHeader("Cache-Control", "no-store");
      res.json({ iceServers });
    } catch (error) {
      console.warn("[CallIce]", error instanceof Error ? error.message : error);
      res.status(503).json({ error: "Không thể chuẩn bị đường truyền cuộc gọi. Hãy thử lại sau." });
    }
  });

  app.post("/api/media/presign", async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (error) {
      console.warn("[MediaPresign] authentication failed:", error instanceof Error ? error.message : error);
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại trước khi tải media." });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Bạn cần đăng nhập để tải media." });
      return;
    }

    const rawName = typeof req.body?.name === "string" ? req.body.name : "media";
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "media";
    const type = typeof req.body?.contentType === "string"
      ? req.body.contentType.split(";", 1)[0].slice(0, 120)
      : "application/octet-stream";
    const declaredSize = Number(req.body?.size);
    if (!Number.isFinite(declaredSize) || declaredSize <= 0 || declaredSize > 70_000_000) {
      res.status(400).json({ error: "Kích thước media không hợp lệ hoặc vượt quá giới hạn 70 MB." });
      return;
    }

    try {
      const key = `kini/${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const presigned = await storagePresignPut(key);
      res.setHeader("Cache-Control", "no-store");
      res.json({
        url: presigned.url,
        uploadUrl: presigned.uploadUrl,
        name: safeName,
        contentType: type || "application/octet-stream",
        size: declaredSize,
      });
    } catch (error) {
      console.error("[MediaPresign] storage failed:", error instanceof Error ? error.message : error);
      res.status(502).json({ error: "Không thể chuẩn bị kho lưu media. Vui lòng thử lại sau." });
    }
  });

  app.post("/api/media/upload", express.raw({ type: "application/octet-stream", limit: "70mb" }), async (req, res) => {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch (error) {
      console.warn("[MediaUpload] authentication failed:", error instanceof Error ? error.message : error);
      res.status(401).json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại trước khi tải media." });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Bạn cần đăng nhập để tải media." });
      return;
    }

    try {
      const binaryBody = Buffer.isBuffer(req.body) ? req.body : null;
      const legacyBody = binaryBody ? null : req.body as { data?: string; name?: string; contentType?: string; size?: number | null };
      const data = binaryBody ?? (typeof legacyBody?.data === "string" ? Buffer.from(legacyBody.data, "base64") : null);
      if (!data || data.length === 0 || data.length > 70_000_000) {
        res.status(400).json({ error: "Dữ liệu media không hợp lệ hoặc vượt quá giới hạn." });
        return;
      }
      const safeName = String(req.header("x-kini-file-name") || legacyBody?.name || "media").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      const type = String(req.header("x-kini-file-type") || legacyBody?.contentType || "application/octet-stream").split(";")[0].slice(0, 120);
      const declaredSize = Number(req.header("x-kini-file-size") || legacyBody?.size || data.length);
      const key = `kini/${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const uploaded = await storagePut(key, data, type);
      res.json({ url: uploaded.url, name: safeName, contentType: type, size: Number.isFinite(declaredSize) ? declaredSize : null });
    } catch (error) {
      console.error("[MediaUpload] failed:", error);
      res.status(500).json({ error: "Không thể tải media lên máy chủ." });
    }
  });

  // Chỉ workflow build KINI trên GitHub Actions được xác thực OIDC mới nhận khóa ký APK; không dùng GitHub Secret hay mã nguồn.
  app.post("/api/build/android-signing", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : req.header("x-kini-github-oidc") ?? req.header("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      res.status(401).json({ error: "Thiếu token xác thực GitHub Actions." });
      return;
    }
    try {
      const payload = await getSigningPayloadFromGithubToken(token);
      res.setHeader("Cache-Control", "no-store");
      res.json(payload);
    } catch (error) {
      console.error("[AndroidSigning] authorization failed:", error instanceof Error ? error.message : error);
      res.status(403).json({ error: "Workflow build không được phép nhận khóa ký." });
    }
  });

  app.get("/api/health", async (_req, res) => {
    const database = await db.isDatabaseReady();
    res.status(database ? 200 : 503).json({ ok: database, database, timestamp: Date.now() });
  });

  // Feed công khai cho ứng dụng kiểm tra bản Android mới mà không nhúng token GitHub vào APK.
  app.get("/api/update/latest", (_req, res) => {
    res.json({
      releaseCode: "v1.12",
      appVersion: "1.8.15",
      buildNumber: 15,
      notes: "Cập nhật avatar ảnh thật và đồng bộ hồ sơ nearby gần realtime; thông báo cuộc gọi Android dùng kênh ưu tiên cao để nổi bật khi KINI ở nền hoặc vừa đóng. Giữ nguyên video call, screen share và nearby; 50 km và 100 km luôn miễn phí.",
      releaseUrl: "https://github.com/haitruongproqt1-a11y/KINI/releases/tag/v1.12",
      apkUrl: "https://github.com/haitruongproqt1-a11y/KINI/releases/download/v1.12/KINI-Release-v1.12.apk",
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
