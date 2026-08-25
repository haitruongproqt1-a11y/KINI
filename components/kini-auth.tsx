import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AuthLink, FormField, kiniColors, PrimaryButton } from "@/components/kini-ui";
import { useKini } from "@/lib/kini-context";

type AuthMode = "welcome" | "signin" | "signup" | "recover";

export function KiniAuth() {
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [question, setQuestion] = useState("Tên trường tiểu học đầu tiên của bạn là gì?");
  const [answer, setAnswer] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const { accounts, signIn, signUp, resetPassword } = useKini();

  const notify = (title: string, message: string) => Alert.alert(title, message);
  const back = () => setMode("welcome");

  const handleSignIn = () => {
    if (!username.trim() || !password) return notify("Thiếu thông tin", "Vui lòng nhập tên đăng nhập và mật khẩu.");
    if (!signIn(username, password)) return notify("Không thể đăng nhập", "Thông tin đăng nhập chưa đúng. Bạn có thể tạo tài khoản mới hoặc khôi phục mật khẩu.");
  };

  const handleSignUp = () => {
    if (!username.trim() || !password || !displayName.trim() || !question.trim() || !answer.trim()) {
      return notify("Thiếu thông tin", "Hãy hoàn tất toàn bộ trường để bảo vệ tài khoản KINI của bạn.");
    }
    if (password.length < 6) return notify("Mật khẩu quá ngắn", "Mật khẩu cần có ít nhất 6 ký tự.");
    const result = signUp({ username: username.trim(), password, displayName: displayName.trim(), securityQuestion: question.trim(), securityAnswer: answer.trim() });
    if (!result.ok) return notify("Không thể tạo tài khoản", result.message ?? "Đã xảy ra lỗi.");
  };

  const handleRecovery = () => {
    const found = accounts.find((item) => item.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) return notify("Chưa tìm thấy tài khoản", "Kiểm tra lại tên đăng nhập hoặc tạo tài khoản mới.");
    if (!answer.trim() || !nextPassword) return notify("Thiếu thông tin", `Hãy trả lời: ${found.securityQuestion}`);
    if (nextPassword.length < 6) return notify("Mật khẩu quá ngắn", "Mật khẩu mới cần có ít nhất 6 ký tự.");
    if (!resetPassword(username, answer, nextPassword)) return notify("Câu trả lời chưa đúng", "Vui lòng trả lời đúng câu hỏi bảo mật đã đăng ký.");
    notify("Đã đặt lại mật khẩu", "Bạn có thể đăng nhập bằng mật khẩu mới.");
    setPassword(nextPassword);
    setMode("signin");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {mode !== "welcome" && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Quay lại" onPress={back} style={styles.back}><MaterialIcons name="arrow-back" size={22} color={kiniColors.navy} /></TouchableOpacity>}
        <View style={styles.hero}>
          <View style={styles.mark}><Text style={styles.markText}>K</Text><View style={styles.markBubble} /></View>
          <Text style={styles.brand}>KINI</Text>
          <Text style={styles.tagline}>Kết nối gần hơn, trò chuyện theo cách của bạn.</Text>
        </View>
        {mode === "welcome" && (
          <View style={styles.welcomeActions}>
            <PrimaryButton label="Đăng nhập" onPress={() => setMode("signin")} />
            <TouchableOpacity onPress={() => setMode("signup")} activeOpacity={0.72} style={styles.outlineButton}><Text style={styles.outlineButtonText}>Tạo tài khoản</Text></TouchableOpacity>
            <Text style={styles.note}>Dữ liệu demo được lưu trong phiên ứng dụng này.</Text>
          </View>
        )}
        {mode === "signin" && (
          <View style={styles.panel}>
            <View><Text style={styles.title}>Chào mừng trở lại</Text><Text style={styles.subtitle}>Đăng nhập để tiếp tục trò chuyện trên KINI.</Text></View>
            <View style={styles.form}><FormField label="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Ví dụ: minhnguyen" returnKeyType="next" /><FormField label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="Nhập mật khẩu" returnKeyType="done" onSubmitEditing={handleSignIn} /><PrimaryButton label="Đăng nhập" onPress={handleSignIn} /><AuthLink onPress={() => setMode("recover")}>Quên mật khẩu?</AuthLink><Text style={styles.dividerText}>hoặc</Text><AuthLink onPress={() => setMode("signup")}>Tạo tài khoản KINI mới</AuthLink></View>
          </View>
        )}
        {mode === "signup" && (
          <View style={styles.panel}>
            <View><Text style={styles.title}>Tạo tài khoản</Text><Text style={styles.subtitle}>Thiết lập thông tin khôi phục để bạn luôn giữ quyền truy cập.</Text></View>
            <View style={styles.form}><FormField label="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Không dấu, dễ nhớ" /><FormField label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="Tối thiểu 6 ký tự" /><FormField label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} placeholder="Tên bạn muốn mọi người thấy" /><FormField label="Câu hỏi bảo mật" value={question} onChangeText={setQuestion} placeholder="Nhập câu hỏi của bạn" /><FormField label="Câu trả lời bảo mật" value={answer} onChangeText={setAnswer} placeholder="Câu trả lời dùng để khôi phục mật khẩu" /><PrimaryButton label="Tạo tài khoản" onPress={handleSignUp} /><AuthLink onPress={() => setMode("signin")}>Đã có tài khoản? Đăng nhập</AuthLink></View>
          </View>
        )}
        {mode === "recover" && (
          <View style={styles.panel}>
            <View><Text style={styles.title}>Khôi phục mật khẩu</Text><Text style={styles.subtitle}>Xác minh bằng tên đăng nhập và câu trả lời bảo mật.</Text></View>
            <View style={styles.form}><FormField label="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Nhập tên đăng nhập" /><View style={styles.questionBox}><Text style={styles.questionLabel}>Câu hỏi bảo mật</Text><Text style={styles.questionText}>{accounts.find((item) => item.username.toLowerCase() === username.trim().toLowerCase())?.securityQuestion ?? "Nhập tên đăng nhập để xem câu hỏi đã đăng ký."}</Text></View><FormField label="Câu trả lời" value={answer} onChangeText={setAnswer} placeholder="Nhập câu trả lời của bạn" /><FormField label="Mật khẩu mới" value={nextPassword} onChangeText={setNextPassword} secureTextEntry placeholder="Tối thiểu 6 ký tự" /><PrimaryButton label="Đặt lại mật khẩu" onPress={handleRecovery} /></View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: kiniColors.cloud },
  scroll: { flexGrow: 1, padding: 24, justifyContent: "center" },
  back: { width: 42, height: 42, borderRadius: 21, backgroundColor: kiniColors.white, alignItems: "center", justifyContent: "center", position: "absolute", top: 18, left: 18, zIndex: 3 },
  hero: { alignItems: "center", marginBottom: 34 },
  mark: { width: 76, height: 76, borderRadius: 25, backgroundColor: kiniColors.blue, alignItems: "center", justifyContent: "center", shadowColor: kiniColors.blue, shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  markText: { color: kiniColors.white, fontSize: 43, fontWeight: "900", fontStyle: "italic", marginLeft: -2 },
  markBubble: { position: "absolute", width: 13, height: 13, borderRadius: 7, right: 12, bottom: 12, backgroundColor: "#55E3D0", borderWidth: 2, borderColor: kiniColors.white },
  brand: { color: kiniColors.navy, fontSize: 32, letterSpacing: 4, fontWeight: "900", marginTop: 16 },
  tagline: { color: kiniColors.muted, fontSize: 15, textAlign: "center", marginTop: 8, lineHeight: 22, maxWidth: 280 },
  welcomeActions: { gap: 14, width: "100%" },
  outlineButton: { height: 54, borderRadius: 16, borderWidth: 1.5, borderColor: kiniColors.blue, alignItems: "center", justifyContent: "center", backgroundColor: kiniColors.white },
  outlineButtonText: { color: kiniColors.blue, fontSize: 16, fontWeight: "800" },
  note: { color: kiniColors.muted, textAlign: "center", fontSize: 12, marginTop: 6 },
  panel: { gap: 28 },
  title: { color: kiniColors.navy, fontSize: 27, fontWeight: "900", letterSpacing: -0.4 },
  subtitle: { color: kiniColors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  form: { gap: 16 },
  dividerText: { color: "#A1ACBA", textAlign: "center", fontSize: 12, fontWeight: "700" },
  questionBox: { padding: 14, borderRadius: 14, backgroundColor: kiniColors.mist, gap: 4 },
  questionLabel: { color: kiniColors.blue, fontSize: 12, fontWeight: "800" },
  questionText: { color: kiniColors.navy, fontSize: 14, lineHeight: 20 },
});
