# KINI · Thiết kế đợt mở rộng ổn định

## Nguyên tắc không phá chức năng

Các luồng gọi thoại, gọi video, chia sẻ màn hình, chat, Nearby và cập nhật APK giữ nguyên API hiện có. Tính năng mới được thêm bằng state độc lập, tRPC protected procedure và migration bổ sung; không đổi khóa định danh hội thoại, call ID, token phiên hoặc định dạng media cũ.

## Media và liên hệ Nearby

Ảnh được kiểm tra cả máy khách lẫn server ở **10 MB**. Tệp thông thường được chuẩn bị cho mức **2 GB** thông qua URL tải trực tiếp; giao diện luôn hiển thị lỗi rõ ràng trước khi upload vượt hạn mức. Video 500 GB không thể truyền bằng một URL PUT đơn lẻ (cơ chế này có giới hạn đối tượng và không có multipart/resume server-side), vì vậy chỉ mở video ở mức hạ tầng xác minh được; không hiển thị cam kết “không giới hạn”.

Hồ sơ Nearby mở Bottom Sheet chi tiết gồm avatar, tên, tỉnh, khoảng cách, giới tính, độ tuổi, tình trạng, giới thiệu và công việc. Ở cuối sheet có hành động **Kết bạn** theo relation thật hoặc **Nhắn tin** khi hai người đã là bạn, tái sử dụng mutation friends/chat hiện có.

## Cuộc gọi và chia sẻ màn hình

Mỗi call overlay có state `minimized`. Khi thu nhỏ, modal không còn che màn chat; một chip nổi chạm bằng một tay hiển thị avatar, tên, thời lượng và trạng thái chia sẻ. Chạm chip sẽ phóng to lại. Khi chia sẻ màn hình, một CTA **Quay lại cuộc gọi** thu nhỏ/đưa về control để người dùng dừng share hoặc kết thúc mà không thoát call.

Audio Android được cấu hình nhất quán bằng InCallManager cho cả voice/video, với audio-processing constraints (`echoCancellation`, `noiseSuppression`, `autoGainControl`). Ping được hiển thị theo trạng thái: tốt, trung bình hoặc yếu; không thay đổi ICE/TURN contract hiện có. Cần xác minh thực hai Android do echo và route loa phụ thuộc phần cứng/ROM.

## Trợ lý AI riêng tư

Tab **Trợ lý AI** dùng giao diện KINI, chữ dễ đọc và bố cục portrait. Mỗi tài khoản có bảng `ai_conversations` và `ai_messages` gắn `userId`; mọi query, gửi và xóa đều `protectedProcedure` + lọc `userId`. Danh sách lưu theo từng cuộc trao đổi, cho phép mở lại hoặc xóa riêng từng cuộc. Phản hồi AI chạy server-side qua catalog LLM hiện có, không để token trên APK; nội dung có loading, retry rõ và giới hạn lịch sử gửi vào model để đáp ứng nhanh.

## Chat và khả năng đọc

Text chat/header/list tăng có chọn lọc về cỡ gần giao diện Zalo, vẫn tôn trọng font scale Android. Link HTTP(S) được phân đoạn thành link có thể bấm/mở bằng trình duyệt và sao chép; link preview chỉ hiển thị metadata an toàn sau này, không tự tải nội dung tùy ý. Composer dùng vị trí keyboard + reset focus/layout sau gửi để trở về sát thanh điều hướng như trạng thái ban đầu.
