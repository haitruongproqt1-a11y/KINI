import * as FileSystem from "expo-file-system/legacy";

import { getApiBaseUrl } from "@/constants/oauth";
import { apiCall } from "@/lib/_core/api";

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

export async function uploadMedia(uri: string, name: string, contentType = "application/octet-stream", size?: number | null): Promise<UploadedMedia> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const result = await apiCall<{ url: string; name: string; contentType: string; size?: number | null }>("/api/media/upload", {
    method: "POST",
    body: JSON.stringify({ data: base64, name, contentType, size: size ?? null }),
  });
  return { ...result, url: absoluteMediaUrl(result.url) };
}

export function mediaExtension(name: string, contentType: string) {
  const fromName = name.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  if (fromName) return fromName.toLowerCase();
  return contentType.split("/")[1]?.split(";")[0] || "bin";
}
