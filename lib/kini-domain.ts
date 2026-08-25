export type AttachmentKind = "image" | "album" | "file" | "sticker";

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  uri?: string;
  size?: number | null;
  count?: number;
};

export type Message = {
  id: string;
  conversationId: string;
  sender: "me" | "them";
  kind: "text" | AttachmentKind;
  content: string;
  createdAt: string;
  attachment?: Attachment;
};

export type Conversation = {
  id: string;
  title: string;
  initials: string;
  accent: string;
  preview: string;
  updatedAt: string;
  unread: number;
  online?: boolean;
  isGroup?: boolean;
};

export type Account = {
  username: string;
  password: string;
  displayName: string;
  securityQuestion: string;
  securityAnswer: string;
};

export function createMessage(
  conversationId: string,
  kind: Message["kind"],
  content: string,
  attachment?: Attachment,
): Message {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    conversationId,
    sender: "me",
    kind,
    content,
    createdAt: new Date().toISOString(),
    attachment,
  };
}

export function attachmentLabel(attachment: Attachment): string {
  if (attachment.kind === "album") return `Album ảnh · ${attachment.count ?? 1} ảnh`;
  if (attachment.kind === "image") return attachment.name;
  if (attachment.kind === "file") return attachment.name;
  return attachment.name;
}
