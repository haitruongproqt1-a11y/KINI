import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";

export default function TabLayout() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          display: isAuthenticated ? "flex" : "none",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tin nhắn",
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="chat-bubble" color={color} />,
        }}
      />
      <Tabs.Screen name="contacts" options={{ title: "Danh bạ", tabBarIcon: ({ color }) => <MaterialIcons size={26} name="contacts" color={color} /> }} />
      <Tabs.Screen name="discover" options={{ title: "Khám phá", tabBarIcon: ({ color }) => <MaterialIcons size={26} name="explore" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Cá nhân", tabBarIcon: ({ color }) => <MaterialIcons size={26} name="person" color={color} /> }} />
    </Tabs>
  );
}
