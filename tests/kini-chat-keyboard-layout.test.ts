import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chat = readFileSync(resolve(import.meta.dirname, "../app/chat/[id].tsx"), "utf8");
const config = readFileSync(resolve(import.meta.dirname, "../app.config.ts"), "utf8");

describe("KINI Android composer layout", () => {
  it("uses native resize on Android and keeps the composer above system navigation without stale keyboard height", () => {
    expect(config).toContain('softwareKeyboardLayoutMode: "resize"');
    expect(chat).toContain('behavior={Platform.OS === "ios" ? "padding" : undefined}');
    expect(chat).toContain('bottomInset={Platform.OS === "android" ? 0 : insets.bottom}');
  });
});
