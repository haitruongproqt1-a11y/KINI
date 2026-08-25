import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

import {
  type Account,
  type Attachment,
  type Conversation,
  createMessage,
  type Message,
} from "@/lib/kini-domain";

const initialConversations: Conversation[] = [
  { id: "linh", title: "Linh Nguyễn", initials: "LN", accent: "#FF7A8A", preview: "Bạn đã xem ảnh mình gửi", updatedAt: "09:32", unread: 2, online: true },
  { id: "team", title: "KINI Product Team", initials: "KP", accent: "#6956E8", preview: "Minh: Chốt bản thiết kế nhé mọi người", updatedAt: "08:45", unread: 0, isGroup: true },
  { id: "nam", title: "Nam Trần", initials: "NT", accent: "#00A889", preview: "Cảm ơn bạn, hẹn gặp lại!", updatedAt: "Hôm qua", unread: 0, online: true },
  { id: "family", title: "Gia đình", initials: "GĐ", accent: "#F5A524", preview: "Mẹ: Tối nay cả nhà ăn cơm nhé", updatedAt: "Thứ 2", unread: 0, isGroup: true },
];

const initialMessages: Message[] = [
  { id: "m1", conversationId: "linh", sender: "them", kind: "text", content: "Chào bạn, hôm nay thế nào rồi?", createdAt: "2026-08-25T09:24:00.000Z" },
  { id: "m2", conversationId: "linh", sender: "me", kind: "text", content: "Mình ổn, đang hoàn thiện KINI đây.", createdAt: "2026-08-25T09:26:00.000Z" },
  { id: "m3", conversationId: "linh", sender: "them", kind: "text", content: "Tuyệt quá. Gửi mình xem khi xong nhé!", createdAt: "2026-08-25T09:28:00.000Z" },
  { id: "m4", conversationId: "team", sender: "them", kind: "text", content: "Mọi người cho ý kiến phần chat nhé.", createdAt: "2026-08-25T08:40:00.000Z" },
];

type KiniContextValue = {
  account: Account | null;
  accounts: Account[];
  conversations: Conversation[];
  messages: Message[];
  signUp: (account: Account) => { ok: boolean; message?: string };
  signIn: (username: string, password: string) => boolean;
  resetPassword: (username: string, answer: string, nextPassword: string) => boolean;
  signOut: () => void;
  sendText: (conversationId: string, content: string) => void;
  sendAttachment: (conversationId: string, attachment: Attachment) => void;
  markRead: (conversationId: string) => void;
};

const KiniContext = createContext<KiniContextValue | null>(null);

export function KiniProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [conversations, setConversations] = useState(initialConversations);
  const [messages, setMessages] = useState(initialMessages);

  const updateConversation = (conversationId: string, preview: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setConversations((current) => [
      ...current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, preview, updatedAt: timestamp, unread: 0 }
          : conversation,
      ),
    ].sort((a, b) => (a.id === conversationId ? -1 : b.id === conversationId ? 1 : 0)));
  };

  const value = useMemo<KiniContextValue>(() => ({
    account,
    accounts,
    conversations,
    messages,
    signUp: (newAccount) => {
      if (accounts.some((item) => item.username.toLowerCase() === newAccount.username.toLowerCase())) {
        return { ok: false, message: "Tên đăng nhập này đã được sử dụng." };
      }
      setAccounts((current) => [...current, newAccount]);
      setAccount(newAccount);
      return { ok: true };
    },
    signIn: (username, password) => {
      const found = accounts.find(
        (item) => item.username.toLowerCase() === username.trim().toLowerCase() && item.password === password,
      );
      if (!found) return false;
      setAccount(found);
      return true;
    },
    resetPassword: (username, answer, nextPassword) => {
      let success = false;
      setAccounts((current) => current.map((item) => {
        const matches = item.username.toLowerCase() === username.trim().toLowerCase()
          && item.securityAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
        if (!matches) return item;
        success = true;
        const updated = { ...item, password: nextPassword };
        if (account?.username === item.username) setAccount(updated);
        return updated;
      }));
      return success;
    },
    signOut: () => setAccount(null),
    sendText: (conversationId, content) => {
      const clean = content.trim();
      if (!clean) return;
      setMessages((current) => [...current, createMessage(conversationId, "text", clean)]);
      updateConversation(conversationId, clean);
    },
    sendAttachment: (conversationId, attachment) => {
      const content = attachment.kind === "album"
        ? `Đã gửi album ${attachment.count ?? 1} ảnh`
        : attachment.kind === "image"
          ? "Đã gửi một ảnh"
          : attachment.kind === "file"
            ? `Đã gửi tệp ${attachment.name}`
            : attachment.name;
      setMessages((current) => [...current, createMessage(conversationId, attachment.kind, content, attachment)]);
      updateConversation(conversationId, content);
    },
    markRead: (conversationId) => setConversations((current) => current.map((conversation) =>
      conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation,
    )),
  }), [account, accounts, conversations, messages]);

  return <KiniContext.Provider value={value}>{children}</KiniContext.Provider>;
}

export function useKini() {
  const context = useContext(KiniContext);
  if (!context) throw new Error("useKini must be used inside KiniProvider");
  return context;
}
