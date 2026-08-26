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

export async function uploadMedia(
  uri: string,
  name: string,
  contentType = "application/octet-stream",
  size?: number | null,
  onProgress?: (progress: number) => void,
): Promise<UploadedMedia> {
  const normalizedContentType = contentType.split(";", 1)[0] || "application/octet-stream";
  const presigned = await requestUploadUrl(name, normalizedContentType, size);

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
