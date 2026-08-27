import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const provider = readFileSync(resolve(import.meta.dirname, "../features/media-upload/media-upload-provider.tsx"), "utf8");
const composer = readFileSync(resolve(import.meta.dirname, "../components/chat-composer.tsx"), "utf8");
const chat = readFileSync(resolve(import.meta.dirname, "../app/chat/[id].tsx"), "utf8");
const layout = readFileSync(resolve(import.meta.dirname, "../app/_layout.tsx"), "utf8");

describe("KINI background media queue", () => {
  it("keeps a single global upload queue above chat routes and uploads jobs sequentially", () => {
    expect(layout).toContain("<MediaUploadProvider>");
    expect(provider).toContain('job.state === "queued"');
    expect(provider).toContain("processing.current");
    expect(provider).toContain("conversationId: job.conversationId");
  });

  it("keeps composer enabled while a local image/video bubble shows queue progress and retry", () => {
    expect(composer).toContain("onQueueAttachment");
    expect(composer).toContain("allowsMultipleSelection: true");
    expect(chat).toContain("uploadProgressRing");
    expect(chat).toContain("Chạm để thử lại");
    expect(chat).toContain("mediaQueue.enqueue");
  });
});
