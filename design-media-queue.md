# Thiết kế upload media nền trong KINI

## Phạm vi

Hàng đợi tồn tại ở cấp ứng dụng, không thuộc riêng một màn trò chuyện. Vì vậy ảnh hoặc video tiếp tục tải khi người dùng mở một cuộc trò chuyện khác, quay về danh sách Tin nhắn hoặc gửi tin nhắn văn bản mới.

## Trạng thái và hiển thị

Mỗi công việc giữ `conversationId`, URI cục bộ, loại media, dung lượng, tiến trình và trạng thái `queued`, `uploading`, `failed`. Màn chat chuyển công việc đó thành bubble optimistic: thumbnail/video cục bộ hiển thị ngay, vòng tiến trình và phần trăm phủ lên chính media; khi hoàn tất, message chính thức thay thế bubble cục bộ. Tác vụ lỗi vẫn ở đúng cuộc trò chuyện để thử lại hoặc bỏ.

## Độ bền và giới hạn

Mỗi lần chỉ tải một media để tránh làm nghẽn mạng và giữ chất lượng cuộc gọi. Chuyển màn trong KINI không hủy upload vì provider toàn cục vẫn sống. Nếu Android ép dừng ứng dụng hoặc thu hồi tiến trình, upload HTTP đang chạy có thể bị hệ điều hành dừng; KINI sẽ báo lỗi/cho thử lại khi mở lại, không tuyên bố có thể vượt chính sách hệ điều hành.

## An toàn dữ liệu

File chỉ được gửi sau khi có URL PUT ký và phải qua kiểm tra kích thước hiện có. Message chỉ được tạo ở server sau khi kho xác nhận PUT thành công; vì vậy người nhận không thấy URL dang dở.
