# Cài đặt KINI trên Android và tải các phiên bản từ GitHub

KINI được cấu hình theo định hướng **Android-first**. Mã nguồn và lịch sử thay đổi nằm tại repository riêng tư [KINI trên GitHub](https://github.com/haitruongproqt1-a11y/KINI). Repository hiện là riêng tư, vì vậy tài khoản GitHub của bạn cần có quyền truy cập trước khi tải bất kỳ nội dung nào.

## Tải mã nguồn của một phiên bản

Trên trang GitHub của KINI, chọn mục **Commits** để xem toàn bộ lịch sử checkpoint. Mỗi commit là một mốc phiên bản của ứng dụng. Chọn commit cần xem, sau đó dùng nút **Browse files** để xem mã hoặc nút **Code → Download ZIP** để tải toàn bộ mã nguồn tại mốc đó.

Các tag sau đã được tạo để chọn phiên bản nhanh qua mục **Tags**:

| Tag | Nội dung chính |
| --- | --- |
| `v1.0.0` | Chat cơ bản |
| `v1.1.0` | Tài khoản thật, bạn bè và hội thoại đồng bộ |
| `v1.2.0` | Xác thực tên đăng nhập, câu hỏi bảo mật và push |
| `v1.2.3` | Cập nhật bảo mật hồ sơ |
| `v1.3.0` | Lịch sử thiết bị và đăng xuất từ xa |
| `v1.4.0` | Tối ưu hiệu năng và xóa hội thoại |
| `v1.5.0` | Media ảnh/video, xem và lưu thiết bị |
| `v1.6.0` | Phần trăm upload và album nhiều ảnh |

> Mã nguồn ZIP không phải là tệp cài đặt Android. Để cài trực tiếp trên điện thoại, bạn cần tệp `.apk` được tạo từ profile `preview`.

## Tạo và tải APK cài trực tiếp

1. Trong giao diện quản lý dự án KINI, mở checkpoint mới nhất và bấm **Publish**.
2. Chọn luồng build **Android APK / Internal distribution**. Cấu hình `eas.json` đã đặt profile `preview` để tạo tệp `.apk` cài trực tiếp.
3. Khi build hoàn tất, tải tệp `.apk` về điện thoại Android.
4. Trên Android, mở tệp APK và cấp quyền **Install unknown apps** cho trình duyệt hoặc ứng dụng quản lý tệp đang dùng, nếu hệ thống yêu cầu.
5. Nhấn **Install**, sau đó mở KINI. Khi cài bản mới hơn, Android sẽ cập nhật đè nếu package name và chữ ký build giữ nguyên.

## Lưu APK cho từng phiên bản trên GitHub

Sau khi tạo APK, vào trang GitHub của KINI, chọn **Releases → Draft a new release**. Đặt tag theo phiên bản, ví dụ `v1.0.0`, nhập mô tả thay đổi, rồi kéo thả tệp APK vào phần đính kèm và xuất bản release. Người dùng có quyền truy cập repository có thể tải đúng APK tại **Releases**, thay vì phải tìm qua lịch sử commit.

## Lưu ý khi cài đặt

Để bảo đảm cập nhật không lỗi, hãy luôn dùng cùng package Android `com.app.kinimobile` và cùng khóa ký. Không gỡ bản cũ nếu bạn muốn giữ dữ liệu cục bộ. Chỉ tải APK từ release GitHub của KINI hoặc đường dẫn build chính thức mà bạn kiểm soát.
