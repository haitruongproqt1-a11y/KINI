import * as Device from "expo-device";
import { Platform } from "react-native";

function clean(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

/** Creates a readable device label without collecting a device identifier. */
export function getKiniDeviceIdentity() {
  if (Platform.OS === "web") {
    return { platform: "web", deviceName: "Trình duyệt web" } as const;
  }

  const brand = clean(Device.brand);
  const model = clean(Device.modelName);
  const modelAlreadyIncludesBrand = Boolean(brand && model && model.toLowerCase().includes(brand.toLowerCase()));
  const modelName = [modelAlreadyIncludesBrand ? "" : brand, model].filter(Boolean).join(" ");

  if (Platform.OS === "android") {
    return { platform: "android", deviceName: modelName || "Điện thoại Android" } as const;
  }

  return { platform: "ios", deviceName: modelName || "Thiết bị iPhone/iPad" } as const;
}
