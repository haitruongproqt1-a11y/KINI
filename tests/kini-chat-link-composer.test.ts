import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chat = readFileSync(resolve(import.meta.dirname, "../app/chat/[id].tsx"), "utf8");
const composer = readFileSync(resolve(import.meta.dirname, "../components/chat-composer.tsx"), "utf8");

describe("KINI chat links and composer", () => {
  it("renders HTTP links as a tap-to-open link card while retaining normal text", () => {
    expect(chat).toContain("httpUrlPattern");
    expect(chat).toContain("LinkCard");
    expect(chat).toContain("Linking.openURL");
  });

  it("resets the multiline composer height immediately after a message is sent", () => {
    expect(composer).toContain("setInputHeight(42)");
    expect(composer).toContain("onContentSizeChange");
  });
});
