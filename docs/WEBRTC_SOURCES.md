# Nguồn kỹ thuật WebRTC cho KINI

Mô-đun gọi KINI dùng `react-native-webrtc` 124.0.6 cùng config plugin 13.0.0, là cặp phiên bản được tài liệu config plugin liệt kê cho Expo SDK 54. Thư viện WebRTC có native code nên không chạy trong Expo Go; APK build lại là bắt buộc.

Trên Android, WebRTC yêu cầu quyền camera, micro và mạng. Chia sẻ màn hình Android 14 cần foreground media-projection service cùng quyền riêng; KINI bổ sung bước này qua config plugin nội bộ trước khi build APK.

| Chủ đề | Nguồn |
|---|---|
| React Native WebRTC, Expo và khả năng audio/video/screen capture | https://github.com/react-native-webrtc/react-native-webrtc |
| Cấu hình Android, quyền và MediaProjection service | https://github.com/react-native-webrtc/react-native-webrtc/blob/master/Documentation/AndroidInstallation.md |
| Quy trình SDP/ICE và yêu cầu signaling | https://github.com/react-native-webrtc/react-native-webrtc/blob/master/Documentation/CallGuide.md |
| Bảng tương thích Expo SDK 54 / plugin WebRTC | https://github.com/expo/config-plugins/tree/main/packages/react-native-webrtc |
