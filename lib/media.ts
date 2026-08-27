import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

export type UploadedMedia = {
  url: string;
  name: string;
  contentType: string;
  size?: number | null;
};

export const KINI_MEDIA_LIMITS = {
  image: 10 * 1024 * 1024,
  // Tải trực tiếp hiện dùng một PUT đã ký; chưa dùng multipart/resume cho video rất lớn.
  video: 4 * 1024 * 1024 * 1024,
  file: 2 * 1024 * 1024 * 1024,
} as const;

type MediaPresignResponse = UploadedMedia & {
  uploadUrl: string;
};

function absoluteMediaUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function getResponseError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error || "Không thể chuẩn bị tải media. Vui lòng thử lại.";
}

async function requestUploadUrl(name: string, contentType: string, size?: number | null): Promise<MediaPresignResponse> {
  const token = await Auth.getSessionToken();
  const response = await fetch(`${getApiBaseUrl().replace(/\/+$/, "")}/api/media/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name, contentType, size: size ?? 0 }),
  });

  if (!response.ok) throw new Error(await getResponseError(response));
  const payload = (await response.json()) as Partial<MediaPresignResponse>;
  if (!payload.uploadUrl || !payload.url || !payload.name || !payload.contentType) {
    throw new Error("Máy chủ trả về thông tin tải media không hợp lệ.");
  }

  return payload as MediaPresignResponse;
}

function mediaKind(contentType: string): keyof typeof KINI_MEDIA_LIMITS {
  if (contentType.toLowerCase().startsWith("image/")) return "image";
  if (contentType.toLowerCase().startsWith("video/")) return "video";
  return "file";
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${Math.floor((bytes / (1024 * 1024 * 1024)) * 10) / 10} GB`;
  return `${Math.floor(bytes / (1024 * 1024))} MB`;
}

async function resolveMediaSize(uri: string, declaredSize?: number | null) {
  if (typeof declaredSize === "number" && Number.isFinite(declaredSize) && declaredSize > 0) return declaredSize;
  if (Platform.OS !== "web") {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && typeof info.size === "number" && info.size > 0) return info.size;
  }
  return null;
}

export async function uploadMedia(
  uri: string,
  name: string,
  contentType = "application/octet-stream",
  size?: number | null,
  onProgress?: (progress: number) => void,
): Promise<UploadedMedia> {
  const normalizedContentType = contentType.split(";", 1)[0] || "application/octet-stream";
  const resolvedSize = await resolveMediaSize(uri, size);
  const kind = mediaKind(normalizedContentType);
  const limit = KINI_MEDIA_LIMITS[kind];
  if (!resolvedSize) throw new Error("Không xác định được dung lượng tệp. Hãy chọn lại tệp rồi thử lại.");
  if (resolvedSize > limit) throw new Error(`${kind === "image" ? "Ảnh" : kind === "video" ? "Video" : "Tệp"} vượt giới hạn ${formatBytes(limit)} của KINI.`);
  const presigned = await requestUploadUrl(name, normalizedContentType, resolvedSize);

  if (Platform.OS === "web") {
    const fileResponse = await fetch(uri);
    if (!fileResponse.ok) throw new Error("Không thể đọc tệp media đã chọn.");
    const blob = await fileResponse.blob();
    onProgress?.(5);
    const uploadResponse = await fetch(presigned.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": normalizedContentType },
      body: blob,
    });
    if (!uploadResponse.ok) throw new Error("Kho media không nhận được tệp. Vui lòng thử lại.");
  } else {
    const task = FileSystem.createUploadTask(
      presigned.uploadUrl,
      uri,
      {
        httpMethod: "PUT",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": normalizedContentType },
      },
      ({ totalBytesSent, totalBytesExpectedToSend }) => {
        if (totalBytesExpectedToSend > 0) {
          onProgress?.(Math.min(99, Math.round((totalBytesSent / totalBytesExpectedToSend) * 100)));
        }
      },
    );
    const response = await task.uploadAsync();
    if (!response || response.status < 200 || response.status >= 300) {
      throw new Error("Kho media không nhận được tệp. Vui lòng thử lại.");
    }
  }

  onProgress?.(100);
  return {
    url: absoluteMediaUrl(presigned.url),
    name: presigned.name,
    contentType: presigned.contentType,
    size: presigned.size,
  };
}

export function mediaExtension(name: string, contentType: string) {
  const fromName = name.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  if (fromName) return fromName.toLowerCase();
  return contentType.split("/")[1]?.split(";")[0] || "bin";
}
