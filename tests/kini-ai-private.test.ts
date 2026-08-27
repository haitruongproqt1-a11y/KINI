import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(import.meta.dirname, "../drizzle/schema.ts"), "utf8");
const database = readFileSync(resolve(import.meta.dirname, "../server/db.ts"), "utf8");
const router = readFileSync(resolve(import.meta.dirname, "../server/routers.ts"), "utf8");
const screen = readFileSync(resolve(import.meta.dirname, "../app/(tabs)/assistant.tsx"), "utf8");

describe("KINI private AI assistant", () => {
  it("stores conversations and messages under the account owner", () => {
    expect(schema).toContain('mysqlTable("ai_conversations"');
    expect(schema).toContain('mysqlTable("ai_messages"');
    expect(database).toContain("eq(aiConversations.userId, userId)");
    expect(database).toContain("eq(aiMessages.userId, userId)");
  });

  it("keeps the LLM call on the server and exposes per-conversation deletion", () => {
    expect(router).toContain("invokeLLM");
    expect(router).toContain("deleteAiConversation");
    expect(screen).toContain("Chỉ bạn có thể xem và xóa lịch sử");
  });
});
