import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { kiniColors } from "@/components/kini-ui";
import { getApiBaseUrl } from "@/constants/oauth";
import { createApkDownload, type ApkDownloadController } from "@/lib/app-update";

type ReleaseUpdate = {
  releaseCode: string;
  appVersion: string;
  buildNumber: number;
  notes: string;
  releaseUrl: string;
  apkUrl: string;
};

export function ReleaseUpdateCard({ currentBuild }: { currentBuild: number }) {
  const [update, setUpdate] = useState<ReleaseUpdate | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadPaused, setDownloadPaused] = useState(false);
  const downloadRef = useRef<ApkDownloadController | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(`${getApiBaseUrl().replace(/\/+$/, "")}/api/update/latest`);
      if (!response.ok) throw new Error("Máy chủ cập nhật chưa phản hồi.");
      const latest = await response.json() as ReleaseUpdate;
      setUpdate(Number(latest.buildNumber) > currentBuild && latest.apkUrl ? latest : null);
    } catch {
      setError("Chưa thể kiểm tra bản cập nhật. Hãy thử lại khi có mạng.");
    } finally {
      setChecking(false);
    }
  }, [currentBuild]);

  useEffect(() => { void check(); }, [check]);

  const openUpdate = async () => {
    if (!update) return;
    setOpening(true);
    setDownloadPaused(false);
    setDownloadPercent(0);
    try {
      const controller = createApkDownload(update.apkUrl || update.releaseUrl, ({ percent }) => setDownloadPercent(percent));
      downloadRef.current = controller;
      await controller.start();
    } catch {
      Alert.alert("Không thể tải cập nhật", "Hãy kiểm tra mạng và quyền cài đặt ứng dụng từ nguồn này trên Android.");
    } finally {
      setOpening(false);
      setDownloadPaused(false);
      downloadRef.current = null;
    }
  };
  const pauseOrResume = async () => {
    const controller = downloadRef.current;
    if (!controller) return;
    if (downloadPaused) {
      setDownloadPaused(false);
      try { await controller.resume(); }
      catch { Alert.alert("Không thể tiếp tục tải", "Hãy thử tải lại bản cập nhật."); }
      finally { setOpening(false); downloadRef.current = null; }
      return;
    }
    try { await controller.pause(); setDownloadPaused(true); }
    catch { Alert.alert("Không thể tạm dừng", "Kết nối đang thay đổi, vui lòng thử lại."); }
  };

  return <View style={[styles.card, update ? styles.updateCard : styles.currentCard]}>
    <View style={[styles.icon, update ? styles.updateIcon : styles.currentIcon]}><MaterialIcons name={update ? "system-update" : "verified"} size={21} color={update ? kiniColors.white : kiniColors.green} /></View>
    <View style={styles.copy}>
      <Text style={styles.title}>{update ? "Có bản KINI mới" : "Cập nhật ứng dụng"}</Text>
      <Text style={styles.description}>{checking ? "Đang kiểm tra GitHub Release…" : error ?? (update ? `KINI ${update.appVersion} · ${update.releaseCode}` : "Bạn đang dùng bản APK mới nhất được phát hành.")}</Text>
      {update ? <Text numberOfLines={2} style={styles.notes}>{update.notes}</Text> : null}
      {opening ? <View style={styles.progressWrap}><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, downloadPercent)}%` }]} /></View><Text style={styles.progressText}>{downloadPercent}% · Đang tải APK</Text></View> : null}
    </View>
    {update ? <View style={styles.updateActions}>{opening ? <TouchableOpacity style={styles.pauseButton} accessibilityRole="button" accessibilityLabel={downloadPaused ? "Tiếp tục tải KINI" : "Tạm dừng tải KINI"} onPress={() => void pauseOrResume()}><Text style={styles.pauseButtonText}>{downloadPaused ? "Tiếp tục" : "Tạm dừng"}</Text></TouchableOpacity> : null}<TouchableOpacity style={styles.updateButton} accessibilityRole="button" accessibilityLabel="Tải và cập nhật KINI" disabled={opening && !downloadPaused} onPress={() => opening && downloadPaused ? void pauseOrResume() : void openUpdate()}>{opening ? <Text style={styles.updateButtonText}>{downloadPaused ? "Tiếp tục" : `${downloadPercent}%`}</Text> : <Text style={styles.updateButtonText}>Cập nhật</Text>}</TouchableOpacity></View> : <TouchableOpacity style={styles.checkButton} accessibilityRole="button" accessibilityLabel="Kiểm tra cập nhật KINI" disabled={checking} onPress={() => void check()}>{checking ? <ActivityIndicator color={kiniColors.blue} size="small" /> : <MaterialIcons name="refresh" size={20} color={kiniColors.blue} />}</TouchableOpacity>}
    {error ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Thử lại kiểm tra cập nhật" onPress={() => void check()} style={styles.retry}><Text style={styles.retryText}>Thử lại</Text></TouchableOpacity> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { marginTop: 14, minHeight: 82, borderRadius: 17, padding: 13, flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  currentCard: { backgroundColor: "#F2FBF6", borderWidth: 1, borderColor: "#D7F1E2" }, updateCard: { backgroundColor: "#ECF4FF", borderWidth: 1, borderColor: "#CFE2FF" },
  icon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" }, currentIcon: { backgroundColor: kiniColors.white }, updateIcon: { backgroundColor: kiniColors.blue },
  copy: { flex: 1, gap: 3, minWidth: 170 }, title: { color: kiniColors.navy, fontSize: 14, fontWeight: "900" }, description: { color: kiniColors.muted, fontSize: 11, lineHeight: 16 }, notes: { color: kiniColors.blue, fontSize: 10, lineHeight: 14 },
  checkButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.white }, progressWrap: { width: "100%", paddingLeft: 49, gap: 3 }, progressTrack: { height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: "#D6E5F7" }, progressFill: { height: "100%", borderRadius: 3, backgroundColor: kiniColors.blue }, progressText: { color: kiniColors.blue, fontSize: 10, fontWeight: "800" }, updateActions: { alignItems: "flex-end", gap: 6 }, updateButton: { minWidth: 87, height: 37, borderRadius: 12, backgroundColor: kiniColors.blue, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 }, updateButtonText: { color: kiniColors.white, fontSize: 12, fontWeight: "900" }, pauseButton: { minWidth: 72, minHeight: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, backgroundColor: kiniColors.mist }, pauseButtonText: { color: kiniColors.blue, fontSize: 10, fontWeight: "900" }, retry: { width: "100%", paddingLeft: 49 }, retryText: { color: kiniColors.blue, fontSize: 12, fontWeight: "800" },
});
