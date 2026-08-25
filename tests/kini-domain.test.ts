import { describe, expect, it } from "vitest";

import { attachmentLabel, createMessage } from "../lib/kini-domain";

describe("KINI messaging domain", () => {
  it("tạo tin nhắn văn bản cho đúng hội thoại", () => {
    const message = createMessage("linh", "text", "Xin chào");
    expect(message.conversationId).toBe("linh");
    expect(message.sender).toBe("me");
    expect(message.content).toBe("Xin chào");
  });

  it("trình bày nhãn album theo số lượng ảnh", () => {
    expect(attachmentLabel({ id: "album-1", kind: "album", name: "Album ảnh", count: 3 })).toBe("Album ảnh · 3 ảnh");
  });
});
