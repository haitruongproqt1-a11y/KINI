import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const server = readFileSync(resolve(import.meta.dirname, "../server/_core/index.ts"), "utf8");

describe("KINI update feed", () => {
  it("công bố KINI 1.8.41 / Release v1.38 mà không dùng cache cũ", () => {
    expect(server).toContain('res.setHeader("Cache-Control", "no-store")');
    expect(server).toContain('releaseCode: "v1.38"');
    expect(server).toContain('appVersion: "1.8.41"');
    expect(server).toContain('KINI-Release-v1.38.apk');
  });
});
