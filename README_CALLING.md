# Gọi WebRTC trong KINI

KINI có mô-đun `features/webrtc-calling` riêng, dùng một hook `useWebRTC` cho gọi thoại, gọi video và chia sẻ màn hình. Tín hiệu SDP/ICE đi qua Socket.io đã xác thực bằng phiên KINI; âm thanh và hình ảnh đi trực tiếp giữa hai thiết bị qua WebRTC. Server không nhận hoặc lưu nội dung media cuộc gọi.

## Cách dùng trên Android

Người dùng cần cài APK KINI có phiên bản chứa WebRTC, đăng nhập hai tài khoản đã kết bạn, rồi mở cùng một cuộc trò chuyện riêng tư. Hai nút ở đầu cuộc trò chuyện bắt đầu gọi thoại hoặc gọi video. Màn hình gọi có thể tắt/bật micro, bật/tắt camera, đổi camera trước/sau, bật/tắt loa ngoài và kết thúc cuộc gọi.

Trong một cuộc gọi video đang kết nối, chọn **Chia sẻ màn hình**. Android sẽ hiện bảng xin phép hệ thống. KINI thay track video qua `replaceTrack`, nên không cần tạo lại peer connection. Khi người dùng dừng ở bảng hệ thống, KINI tự trả track camera.

> **Lưu ý về trạng thái nhận cuộc gọi:** phiên bản này nhận cuộc gọi khi ứng dụng của người nhận đang mở cuộc trò chuyện và kết nối tới signaling. Đổ chuông khi ứng dụng bị đóng hoặc chạy nền cần thêm dịch vụ gọi nền/FCM native và cơ chế CallKeep, không nên mô phỏng bằng thông báo thường.

> **Lưu ý về âm thanh hệ thống khi chia sẻ màn hình:** micro của người gọi vẫn được truyền. Việc Android cho phép thu âm thanh hệ thống cùng MediaProjection phụ thuộc phiên bản Android, chính sách nhà sản xuất và API native; không có bảo đảm chung cho mọi máy. Màn hình chia sẻ vẫn hoạt động độc lập với khả năng này.

## Hạ tầng signaling

Tệp `server/signaling/index.ts` khởi tạo Socket.io tại `/socket.io`. Mỗi socket phải cung cấp Bearer token phiên KINI. Trước khi relay `offer`, `answer`, ICE candidate hoặc kết thúc cuộc gọi, server kiểm tra lại người gửi là thành viên của đúng cuộc trò chuyện riêng tư. Signaling chỉ chuyển tiếp metadata kết nối, không chuyển tiếp media.

Để cuộc gọi production ổn định, backend phải chạy như một tiến trình realtime liên tục, giữ một tập room Socket.io nhất quán. Nếu hạ tầng tự co giãn nhiều instance, cần sticky sessions hoặc adapter chia sẻ room trước khi bật gọi cho người dùng đại trà.

## Cấu hình ICE/TURN

Danh sách `features/webrtc-calling/config/iceServers.ts` có STUN công khai và TURN dự phòng theo yêu cầu. TURN công khai chỉ phù hợp kiểm thử vì có thể bị giới hạn, thay đổi hoặc quá tải. Để thay TURN, thay phần tử TURN trong danh sách bằng máy chủ có URL, `username` và `credential` của bạn; không đặt thông tin đăng nhập dài hạn nhạy cảm trực tiếp trong APK.

| Thành phần | Vị trí |
|---|---|
| Hook điều khiển cuộc gọi | `features/webrtc-calling/hooks/useWebRTC.ts` |
| ICE/STUN/TURN | `features/webrtc-calling/config/iceServers.ts` |
| Signaling client | `features/webrtc-calling/services/signalingClient.ts` |
| Signaling server | `server/signaling/index.ts` |
| UI thoại/video/chia sẻ màn hình | `features/webrtc-calling/components/` |
| Cấu hình quyền Android | `app.config.ts` và `plugins/with-kini-webrtc-screen-share.js` |

## Kiểm thử trước phát hành

Expo Go không chứa native module WebRTC, vì vậy chỉ kiểm thử được bằng APK Android build mới. Trước phát hành, kiểm tra lần lượt quyền micro/camera, gọi hai máy khác mạng, bật/tắt loa ngoài, đổi camera, từ chối quyền, kết thúc từ cả hai đầu và dừng chia sẻ màn hình bằng bảng hệ thống Android.
