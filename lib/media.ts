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

function absoluteMediaUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function uploadMedia(uri: string, name: string, contentType = "application/octet-stream", size?: number | null, onProgress?: (progress: number) => void): Promise<UploadedMedia> {
  const endpoint = `${getApiBaseUrl().replace(/\/+$/, "")}/api/media/upload`;
  const token = await Auth.getSessionToken();
  const headers = {
    "Content-Type": "application/octet-stream",
    "X-KINI-File-Name": name,
    "X-KINI-File-Type": contentType,
    "X-KINI-File-Size": String(size ?? 0),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let result: { url: string; name: string; contentType: string; size?: number | null };
  if (Platform.OS === "web") {
    onProgress?.(5);
    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();
    const response = await fetch(endpoint, { method: "POST", headers, body: blob });
    if (!response.ok) throw new Error((await response.json().catch(() => null) as { error?: string } | null)?.error || "Không thể tải media lên máy chủ.");
    result = await response.json() as typeof result;
  } else {
    const task = FileSystem.createUploadTask(endpoint, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers,
    }, ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (totalBytesExpectedToSend > 0) onProgress?.(Math.min(99, Math.round((totalBytesSent / totalBytesExpectedToSend) * 100)));
    });
    const response = await task.uploadAsync();
    if (!response || response.status < 200 || response.status >= 300) throw new Error("Không thể tải media lên máy chủ.");
    result = JSON.parse(response.body) as typeof result;
  }
  onProgress?.(100);
  return { ...result, url: absoluteMediaUrl(result.url) };
}

export function mediaExtension(name: string, contentType: string) {
  const fromName = name.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  if (fromName) return fromName.toLowerCase();
  return contentType.split("/")[1]?.split(";")[0] || "bin";
}
