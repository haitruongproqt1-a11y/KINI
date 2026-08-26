import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getApiBaseUrl } from "@/constants/oauth";
import { kiniColors } from "@/components/kini-ui";

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
    setOpening(true);
    try {
      const target = update.apkUrl || update.releaseUrl;
      await Linking.openURL(target);
    } finally {
      setOpening(false);
    }
  };

  if (!update) return null;
  return <Modal transparent animationType="fade" visible onRequestClose={() => setUpdate(null)}><View style={[styles.backdrop, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}><View style={styles.card}><View style={styles.icon}><Text style={styles.iconText}>K</Text></View><Text style={styles.title}>Có bản cập nhật mới</Text><Text style={styles.version}>KINI {update.appVersion} · {update.releaseCode}</Text><Text style={styles.notes}>{update.notes}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Tải cập nhật KINI" onPress={() => void openUpdate()} style={styles.primary} disabled={opening}>{opening ? <ActivityIndicator color={kiniColors.white} /> : <Text style={styles.primaryText}>Tải và cập nhật</Text>}</TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="Để sau" onPress={() => setUpdate(null)} style={styles.secondary}><Text style={styles.secondaryText}>Để sau</Text></TouchableOpacity><Text style={styles.hint}>Android sẽ mở trình duyệt hoặc trình cài đặt để bạn xác nhận tải và cài APK.</Text></View></View></Modal>;
}

const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "rgba(10, 26, 48, 0.46)" }, card: { borderRadius: 24, padding: 24, backgroundColor: kiniColors.white, alignItems: "center" }, icon: { width: 52, height: 52, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue }, iconText: { color: kiniColors.white, fontSize: 28, fontWeight: "900", fontStyle: "italic" }, title: { marginTop: 16, color: kiniColors.navy, fontSize: 20, fontWeight: "900" }, version: { marginTop: 7, color: kiniColors.blue, fontSize: 14, fontWeight: "800" }, notes: { marginTop: 14, color: kiniColors.muted, fontSize: 14, lineHeight: 20, textAlign: "center" }, primary: { width: "100%", minHeight: 52, marginTop: 22, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.blue }, primaryText: { color: kiniColors.white, fontSize: 16, fontWeight: "900" }, secondary: { minHeight: 42, marginTop: 6, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, secondaryText: { color: kiniColors.blue, fontSize: 14, fontWeight: "800" }, hint: { marginTop: 4, color: kiniColors.muted, fontSize: 11, lineHeight: 16, textAlign: "center" } });
