import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const server = readFileSync(resolve(import.meta.dirname, "../server/_core/index.ts"), "utf8");

describe("KINI update feed", () => {
  it("công bố KINI 1.8.34 / Release v1.31 mà không dùng cache cũ", () => {
    expect(server).toContain('res.setHeader("Cache-Control", "no-store")');
    expect(server).toContain('releaseCode: "v1.31"');
    expect(server).toContain('appVersion: "1.8.34"');
    expect(server).toContain('KINI-Release-v1.31.apk');
  });
});
