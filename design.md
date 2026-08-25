# Thiết kế trải nghiệm KINI

## Mục tiêu trải nghiệm

KINI là ứng dụng nhắn tin tiếng Việt với phong cách rõ ràng, riêng tư và gọn gàng. Thiết kế ưu tiên tư thế cầm một tay trên màn hình dọc 9:16, các thao tác chính nằm trong vùng với tới của ngón cái và tuân theo nguyên tắc điều hướng, phân cấp, phản hồi chạm của iOS Human Interface Guidelines.

## Danh sách màn hình

| Màn hình | Nội dung chính | Chức năng |
| --- | --- | --- |
| Chào mừng | Nhận diện KINI, nút Đăng nhập và Tạo tài khoản | Dẫn người dùng đến xác thực |
| Đăng ký | Tên đăng nhập, mật khẩu, tên hiển thị, câu hỏi và câu trả lời bảo mật | Tạo hồ sơ cục bộ mẫu, kiểm tra trường bắt buộc |
| Quên mật khẩu | Tên đăng nhập, câu hỏi bảo mật, câu trả lời, mật khẩu mới | Mô phỏng xác minh và đặt lại mật khẩu |
| Tin nhắn | Thanh tìm kiếm, nút tạo cuộc trò chuyện, danh sách hội thoại có trạng thái đọc | Mở hội thoại, tìm kiếm, hiển thị tin nhắn mới |
| Trò chuyện | Tiêu đề liên hệ, bong bóng tin nhắn, ô soạn thảo, nút đính kèm và sticker | Gửi tin nhắn; mở bảng chọn ảnh, tệp, album và sticker |
| Danh bạ | Danh sách liên hệ, nút thêm bạn, nhóm | Truy cập cuộc trò chuyện, xem danh bạ |
| Khám phá | Câu chuyện, tiện ích trò chuyện và album dùng chung | Điều hướng các khu vực phụ trợ |
| Cá nhân | Hồ sơ, ảnh đại diện, lối tắt cài đặt và bảo mật | Quản lý tài khoản mẫu |

## Luồng chính

1. Người dùng mở KINI, chọn **Tạo tài khoản**, nhập tên đăng nhập, mật khẩu, tên hiển thị, câu hỏi và câu trả lời bảo mật, rồi xác nhận để vào khu vực Tin nhắn.
2. Khi quên mật khẩu, người dùng nhập tên đăng nhập, trả lời câu hỏi bảo mật và đặt mật khẩu mới.
3. Từ Tin nhắn, người dùng chạm một hội thoại để vào màn hình Trò chuyện, nhập nội dung và chạm nút gửi.
4. Trong Trò chuyện, người dùng chạm biểu tượng dấu cộng để mở hành động gửi **ảnh**, **album ảnh** hoặc **tệp**; chạm biểu tượng sticker để chọn và gửi sticker.
5. Người dùng chuyển nhanh giữa Tin nhắn, Danh bạ, Khám phá và Cá nhân bằng thanh tab dưới cùng.

## Dữ liệu miền cốt lõi

| Thực thể | Thuộc tính chính | Mục đích |
| --- | --- | --- |
| UserAccount | username, passwordHash, displayName, securityQuestion, securityAnswerHash | Tài khoản và khôi phục mật khẩu |
| Conversation | id, title, avatar, lastMessage, updatedAt, unreadCount | Đại diện một cuộc trò chuyện hoặc nhóm |
| ChatMessage | id, conversationId, senderId, type, content, createdAt, status | Tin nhắn văn bản, ảnh, album, tệp hoặc sticker |
| Attachment | id, type, name, uri, size, thumbnailUri | Mô tả ảnh, album và tệp được gửi |
| Sticker | id, label, assetKey | Bộ sticker có thể chọn trong hội thoại |

## Màu sắc và phong cách

| Vai trò | Màu | Ứng dụng |
| --- | --- | --- |
| KINI Blue | `#1677FF` | Tin nhắn gửi đi, nút hành động, điểm nhấn |
| Navy Ink | `#12263F` | Tiêu đề, văn bản chính |
| Mist Blue | `#EAF3FF` | Nền lựa chọn, bong bóng tin nhắn đến |
| Cloud | `#F6F8FC` | Nền màn hình và vùng phân cách |
| Success Green | `#24B47E` | Trạng thái trực tuyến, xác nhận |
| Alert Coral | `#F05B61` | Báo lỗi và số thông báo |

Giao diện sử dụng nền sáng, thẻ bo góc vừa phải, nhịp khoảng cách 8 điểm và chữ rõ nét. Không mô phỏng nhận diện thương hiệu hoặc chi tiết riêng của bất kỳ dịch vụ khác; trải nghiệm được thiết kế độc lập theo mô hình ứng dụng nhắn tin phổ biến.
