import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const chatScreen = readFileSync(resolve(import.meta.dirname, "../app/chat/[id].tsx"), "utf8");

describe("KINI chat timeline", () => {
  it("gộp call log và message vào cùng timeline sắp theo timestamp", () => {
    expect(chatScreen).toContain("type TimelineItem");
    expect(chatScreen).toContain('entryType: "call"');
    expect(chatScreen).toContain("new Date(call.startedAt).getTime()");
    expect(chatScreen).toContain("left.timestamp - right.timestamp");
  });

  it("không để trạng thái tải cuộc trò chuyện treo vô hạn và vẫn giữ polling realtime", () => {
    expect(chatScreen).toContain("setLoadingTimedOut(true)");
    expect(chatScreen).toContain("Kết nối đang chậm. Vui lòng thử lại.");
    expect(chatScreen).toContain("refetchInterval: 5000");
    expect(chatScreen).toContain("refetchInterval: 20_000");
    expect(chatScreen).toContain("refetchInterval: 45_000");
  });

  it("không còn render call history thành footer cố định cuối chat", () => {
    expect(chatScreen).not.toContain("ListFooterComponent={<CallHistory");
    expect(chatScreen).toContain("<CallTimelineEntry call={item.call} />");
  });
});
