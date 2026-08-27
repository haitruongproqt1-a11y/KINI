import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chat = readFileSync(resolve(import.meta.dirname, "../app/chat/[id].tsx"), "utf8");
const config = readFileSync(resolve(import.meta.dirname, "../app.config.ts"), "utf8");

describe("KINI Android composer layout", () => {
  it("uses native resize and safe system bars so the composer stays visible without stale keyboard height", () => {
    expect(config).toContain('softwareKeyboardLayoutMode: "resize"');
    expect(config).toContain("edgeToEdgeEnabled: true");
    expect(chat).toContain('behavior={Platform.OS === "ios" ? "padding" : undefined}');
    expect(chat).toContain("bottomInset={insets.bottom}");
  });
});
