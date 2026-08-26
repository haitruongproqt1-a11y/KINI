import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export type DownloadProgress = { loaded: number; total: number; percent: number };

export async function downloadAndOpenApk(url: string, onProgress: (progress: DownloadProgress) => void) {
  if (Platform.OS !== "android") {
    await Linking.openURL(url);
    return;
  }
  const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}KINI-update.apk`;
  await FileSystem.deleteAsync(target, { idempotent: true });
  const task = FileSystem.createDownloadResumable(
    url,
    target,
    { cache: false },
    (event) => {
      const total = event.totalBytesExpectedToWrite;
      const loaded = event.totalBytesWritten;
      onProgress({ loaded, total, percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0 });
    },
  );
  const result = await task.downloadAsync();
  if (!result?.uri) throw new Error("Không nhận được tệp APK sau khi tải.");
  const contentUri = await FileSystem.getContentUriAsync(result.uri);
  await Linking.openURL(contentUri);
}
