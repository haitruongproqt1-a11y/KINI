import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const provider = readFileSync(resolve(import.meta.dirname, "../features/media-upload/media-upload-provider.tsx"), "utf8");
const chat = readFileSync(resolve(import.meta.dirname, "../app/chat/[id].tsx"), "utf8");
const callProvider = readFileSync(resolve(import.meta.dirname, "../features/webrtc-calling/call-provider.tsx"), "utf8");

describe("KINI media cancel and floating call return", () => {
  it("uses a valid UUID for chat.send and never creates a message after media was cancelled", () => {
    expect(provider).toContain('"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"');
    expect(provider).toContain("if (cancelledJobs.current.delete(job.id)) return;");
    expect(provider).toContain("cancelledJobs.current.add(id)");
    expect(chat).toContain("dismissQueuedUpload");
    expect(chat).toContain("giữ để hủy");
  });

  it("uses a compact draggable avatar call return control for active calls and screen share", () => {
    expect(callProvider).toContain("PanResponder.create");
    expect(callProvider).toContain("translation.getTranslateTransform()");
    expect(callProvider).toContain("Quay lại chia sẻ màn hình");
    expect(callProvider).toContain('width: 58, height: 58, borderRadius: 29');
  });
});
