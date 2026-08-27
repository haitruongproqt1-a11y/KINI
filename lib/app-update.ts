import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

export type DownloadProgress = { loaded: number; total: number; percent: number };

export type ApkDownloadController = {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  install: () => Promise<void>;
  isDownloaded: () => boolean;
  isPaused: () => boolean;
};

export function createApkDownload(url: string, onProgress: (progress: DownloadProgress) => void): ApkDownloadController {
  let task: FileSystem.DownloadResumable | null = null;
  let paused = false;
  let downloadedUri: string | null = null;
  const openInstaller = async () => {
    if (!downloadedUri) throw new Error("Chưa có tệp APK để cài đặt.");
    const contentUri = await FileSystem.getContentUriAsync(downloadedUri);
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      type: "application/vnd.android.package-archive",
      flags: 1,
    });
  };
  const finish = async (result: FileSystem.FileSystemDownloadResult | undefined) => {
    if (!result?.uri) throw new Error("Không nhận được tệp APK sau khi tải.");
    downloadedUri = result.uri;
    await openInstaller();
  };
  const createTask = async () => {
    const target = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}KINI-update.apk`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    task = FileSystem.createDownloadResumable(url, target, { cache: false }, (event) => {
      const total = event.totalBytesExpectedToWrite;
      const loaded = event.totalBytesWritten;
      onProgress({ loaded, total, percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0 });
    });
  };
  return {
    start: async () => {
      if (Platform.OS !== "android") {
        await Linking.openURL(url);
        return;
      }
      if (!task) await createTask();
      paused = false;
      await finish(await task?.downloadAsync());
    },
    pause: async () => {
      if (!task || paused) return;
      await task.pauseAsync();
      paused = true;
    },
    resume: async () => {
      if (!task || !paused) return;
      paused = false;
      await finish(await task.resumeAsync());
    },
    install: openInstaller,
    isDownloaded: () => Boolean(downloadedUri),
    isPaused: () => paused,
  };
}

/** Kept for callers that only need a one-shot download. */
export async function downloadAndOpenApk(url: string, onProgress: (progress: DownloadProgress) => void) {
  if (Platform.OS !== "android") {
    await Linking.openURL(url);
    return;
  }
  await createApkDownload(url, onProgress).start();
}
