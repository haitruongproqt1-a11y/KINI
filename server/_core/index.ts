import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { storagePut } from "../storage";
import { appRouter } from "../routers";
import * as db from "../db";
import { sdk } from "./sdk";
import crypto from "node:crypto";
import { createContext } from "./context";

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

  app.post("/api/media/upload", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Bạn cần đăng nhập để tải media." });
        return;
      }
      const { data, name, contentType, size } = req.body as { data?: string; name?: string; contentType?: string; size?: number | null };
      if (!data || typeof data !== "string" || data.length > 70_000_000) {
        res.status(400).json({ error: "Dữ liệu media không hợp lệ hoặc vượt quá giới hạn." });
        return;
      }
      const safeName = String(name || "media").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
      const type = String(contentType || "application/octet-stream").split(";")[0].slice(0, 120);
      const key = `kini/${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const uploaded = await storagePut(key, Buffer.from(data, "base64"), type);
      res.json({ url: uploaded.url, name: safeName, contentType: type, size: typeof size === "number" ? size : null });
    } catch (error) {
      console.error("[MediaUpload] failed:", error);
      res.status(500).json({ error: "Không thể tải media lên máy chủ." });
    }
  });

  app.get("/api/health", async (_req, res) => {
    const database = await db.isDatabaseReady();
    res.status(database ? 200 : 503).json({ ok: database, database, timestamp: Date.now() });
  });

  // Feed công khai cho ứng dụng kiểm tra bản Android mới mà không nhúng token GitHub vào APK.
  app.get("/api/update/latest", (_req, res) => {
    res.json({
      releaseCode: "v1.1",
      appVersion: "1.0.1",
      buildNumber: 1,
      notes: "APK hiện có trên GitHub Release. Bản tiếp theo sẽ gồm sửa kết nối API Android, cập nhật và safe area.",
      releaseUrl: "https://github.com/haitruongproqt1-a11y/KINI/releases/tag/v1.1",
      apkUrl: "https://github.com/haitruongproqt1-a11y/KINI/releases/download/v1.1/KINI-Release-v1.1.apk",
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
