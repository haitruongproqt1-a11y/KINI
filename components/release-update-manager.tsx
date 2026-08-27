import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiBaseUrl } from "@/constants/oauth";
import { kiniColors } from "@/components/kini-ui";
import { createApkDownload, type ApkDownloadController } from "@/lib/app-update";

type ReleaseUpdate = {
  releaseCode: string;
  appVersion: string;
  buildNumber: number;
  notes: string;
  releaseUrl: string;
  apkUrl: string;
};

const currentBuild = Number(Constants.expoConfig?.android?.versionCode ?? Constants.nativeBuildVersion ?? 0);

/** Checks the app-owned update feed. Android opens the system installer/browser; silent APK installs are intentionally not attempted. */
export function ReleaseUpdateManager() {
  const [update, setUpdate] = useState<ReleaseUpdate | null>(null);
  const [opening, setOpening] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadPaused, setDownloadPaused] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const downloadRef = useRef<ApkDownloadController | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return;
    let active = true;
    const check = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/update/latest`);
        if (!response.ok) return;
        const latest = (await response.json()) as ReleaseUpdate;
        if (active && Number(latest.buildNumber) > currentBuild && latest.apkUrl) setUpdate(latest);
      } catch {
        // Update checks must never block authentication or normal app use.
      }
    };
    void check();
    return () => { active = false; };
  }, []);

  const openUpdate = async () => {
    if (!update) return;
    if (installReady && downloadRef.current?.isDownloaded()) {
      try { await downloadRef.current.install(); }
      catch { Alert.alert("Chưa thể mở trình cài đặt", "Hãy cho phép KINI cài ứng dụng từ nguồn này trong Cài đặt Android rồi thử lại."); }
      return;
    }
    setOpening(true);
    setDownloadPaused(false);
    setDownloadPercent(0);
    try {
      const controller = createApkDownload(update.apkUrl || update.releaseUrl, ({ percent }) => setDownloadPercent(percent));
      downloadRef.current = controller;
      await controller.start();
    } catch {
      setDownloadPercent(0);
    } finally {
      setOpening(false);
      setDownloadPaused(false);
      const ready = downloadRef.current?.isDownloaded() ?? false;
      setInstallReady(ready);
      if (!ready) downloadRef.current = null;
    }
  };
  const pauseOrResume = async () => {
    const controller = downloadRef.current;
    if (!controller) return;
    if (downloadPaused) {
      setDownloadPaused(false);
      try { await controller.resume(); }
      finally {
        setOpening(false);
        const ready = downloadRef.current?.isDownloaded() ?? false;
        setInstallReady(ready);
        if (!ready) downloadRef.current = null;
      }
      return;
    }
    await controller.pause();
    setDownloadPaused(true);
  };

  if (!update) return null;
  return <Modal transparent animationType="fade" visible onRequestClose={() => setUpdate(null)}><View style={[styles.backdrop, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}><View style={styles.card}><View style={styles.icon}><Text style={styles.iconText}>K</Text></View><Text style={styles.title}>Có bản cập nhật mới</Text><Text style={styles.version}>KINI {update.appVersion} · {update.releaseCode}</Text><Text style={styles.notes}>{update.notes}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={installReady ? "Cài đặt KINI" : "Tải cập nhật KINI"} onPress={() => opening && downloadPaused ? void pauseOrResume() : void openUpdate()} style={styles.primary} disabled={opening && !downloadPaused}>{opening ? <Text style={styles.primaryText}>{downloadPaused ? "Tiếp tục tải" : `${downloadPercent}% · Đang tải`}</Text> : <Text style={styles.primaryText}>{installReady ? "Cài đặt" : "Tải và cập nhật"}</Text>}</TouchableOpacity>{opening ? <View style={styles.progressWrap}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, downloadPercent)}%` }]} /></View><Text style={styles.progressText}>{downloadPercent}%</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={downloadPaused ? "Tiếp tục tải KINI" : "Tạm dừng tải KINI"} onPress={() => void pauseOrResume()} style={styles.pause}><Text style={styles.pauseText}>{downloadPaused ? "Tiếp tục" : "Tạm dừng"}</Text></TouchableOpacity></View> : null}<TouchableOpacity accessibilityRole="button" accessibilityLabel="Để sau" onPress={() => setUpdate(null)} style={styles.secondary}><Text style={styles.secondaryText}>Để sau</Text></TouchableOpacity><Text style={styles.hint}>{installReady ? "APK đã tải xong. Chạm Cài đặt để mở trình cài đặt Android." : "Sau khi tải xong, KINI tự mở trình cài đặt Android. Hệ điều hành có thể yêu cầu xác nhận cài đặt."}</Text></View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "rgba(10, 26, 48, 0.46)" }, card: { borderRadius: 24, padding: 24, backgroundColor: kiniColors.white, alignItems: "center" }, icon: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue }, iconText: { color: kiniColors.white, fontSize: 28, fontWeight: "900", fontStyle: "italic" }, title: { marginTop: 16, color: kiniColors.navy, fontSize: 20, fontWeight: "900" }, version: { marginTop: 7, color: kiniColors.blue, fontSize: 14, fontWeight: "800" }, notes: { marginTop: 14, color: kiniColors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }, primary: { width: "100%", minHeight: 52, marginTop: 22, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue }, primaryText: { color: kiniColors.white, fontSize: 16, fontWeight: "900" }, progressWrap: { width: "100%", marginTop: 10, gap: 4, alignItems: "center" }, progressTrack: { width: "100%", height: 7, borderRadius: 4, overflow: "hidden", backgroundColor: "#D6E5F7" }, progressFill: { height: "100%", borderRadius: 4, backgroundColor: kiniColors.blue }, progressText: { color: kiniColors.blue, fontSize: 12, fontWeight: "800", textAlign: "center" }, pause: { minHeight: 32, marginTop: 3, paddingHorizontal: 14, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.mist }, pauseText: { color: kiniColors.blue, fontSize: 12, fontWeight: "900" }, secondary: { minHeight: 42, marginTop: 6, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, secondaryText: { color: kiniColors.blue, fontSize: 14, fontWeight: "800" }, hint: { marginTop: 4, color: kiniColors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" } });
