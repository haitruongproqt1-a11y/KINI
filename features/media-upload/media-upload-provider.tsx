import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";

import { subscribeKiniSessionInvalidated } from "@/lib/kini-session-events";
import { uploadMedia } from "@/lib/media";
import { trpc } from "@/lib/trpc";

export type QueuedMediaKind = "image" | "video" | "file";
export type UploadJobState = "queued" | "uploading" | "sent" | "failed";
export type MediaUploadJob = { id: string; clientMessageId: string; conversationId: number; kind: QueuedMediaKind; uri: string; name: string; contentType: string; size?: number | null; state: UploadJobState; progress: number; error?: string; remoteUrl?: string; createdAt: string };
type EnqueueInput = Omit<MediaUploadJob, "id" | "clientMessageId" | "state" | "progress" | "createdAt" | "error" | "remoteUrl">;
type MediaUploadQueue = { jobs: MediaUploadJob[]; enqueue: (input: EnqueueInput) => void; retry: (jobId: string) => void; dismiss: (jobId: string) => void };
const MediaUploadQueueContext = createContext<MediaUploadQueue | null>(null);

function uniqueId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function MediaUploadProvider({ children }: PropsWithChildren) {
  const utils = trpc.useUtils();
  const sendMessage = trpc.chat.send.useMutation();
  const [jobs, setJobs] = useState<MediaUploadJob[]>([]);
  const processing = useRef(false);
  const update = useCallback((id: string, patch: Partial<MediaUploadJob>) => setJobs((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item)), []);
  const enqueue = useCallback((input: EnqueueInput) => setJobs((items) => [...items, { ...input, id: uniqueId("upload"), clientMessageId: uniqueId("media"), state: "queued", progress: 0, createdAt: new Date().toISOString() }]), []);
  const retry = useCallback((id: string) => update(id, { state: "queued", progress: 0, error: undefined, remoteUrl: undefined }), [update]);
  const dismiss = useCallback((id: string) => setJobs((items) => items.filter((item) => item.id !== id || item.state === "uploading")), []);

  const run = useCallback(async (job: MediaUploadJob) => {
    update(job.id, { state: "uploading", progress: Math.max(1, job.progress), error: undefined });
    try {
      const media = await uploadMedia(job.uri, job.name, job.contentType, job.size, (progress) => update(job.id, { progress }));
      await sendMessage.mutateAsync({ conversationId: job.conversationId, clientMessageId: job.clientMessageId, kind: job.kind, content: job.kind === "video" ? "Video" : job.name, attachmentName: media.name, attachmentUrl: media.url });
      update(job.id, { state: "sent", progress: 100, remoteUrl: media.url });
      await Promise.all([utils.chat.messages.invalidate({ conversationId: job.conversationId }), utils.chat.list.invalidate(), utils.notifications.summary.invalidate()]);
      setTimeout(() => setJobs((items) => items.filter((item) => item.id !== job.id || item.state !== "sent")), 15_000);
    } catch (error) {
      update(job.id, { state: "failed", error: error instanceof Error ? error.message : "Không thể tải media. Vui lòng thử lại." });
    }
  }, [sendMessage, update, utils.chat.list, utils.chat.messages, utils.notifications.summary]);

  useEffect(() => {
    const next = jobs.find((job) => job.state === "queued");
    if (!next || processing.current) return;
    processing.current = true;
    void run(next).finally(() => { processing.current = false; setJobs((items) => [...items]); });
  }, [jobs, run]);
  useEffect(() => subscribeKiniSessionInvalidated(() => setJobs([])), []);
  const value = useMemo(() => ({ jobs, enqueue, retry, dismiss }), [dismiss, enqueue, jobs, retry]);
  return <MediaUploadQueueContext.Provider value={value}>{children}</MediaUploadQueueContext.Provider>;
}

export function useKiniMediaUploadQueue() {
  const queue = useContext(MediaUploadQueueContext);
  if (!queue) throw new Error("MediaUploadProvider chưa được khởi tạo.");
  return queue;
}
