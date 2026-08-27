import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const media = readFileSync(resolve(import.meta.dirname, "../lib/media.ts"), "utf8");
const api = readFileSync(resolve(import.meta.dirname, "../server/_core/index.ts"), "utf8");
const composer = readFileSync(resolve(import.meta.dirname, "../components/chat-composer.tsx"), "utf8");

describe("KINI media upload limits", () => {
  it("giới hạn ảnh ở 10 MB và tệp ở 2 GB trên cả app và server", () => {
    expect(media).toContain("image: 10 * 1024 * 1024");
    expect(media).toContain("file: 2 * 1024 * 1024 * 1024");
    expect(api).toContain('isImage ? 10 * 1024 * 1024');
    expect(api).toContain(': 2 * 1024 * 1024 * 1024');
  });

  it("không áp giới hạn thời lượng video nhân tạo và luôn kiểm tra dung lượng trước upload", () => {
    expect(composer).not.toContain("videoMaxDuration");
    expect(media).toContain("resolveMediaSize");
    expect(media).toContain("vượt giới hạn");
  });
});
