# Quản lý phiên bản KINI

KINI dùng cấu hình phát hành duy nhất tại [`app.config.ts`](../app.config.ts). Mọi bản APK mới phải thay đổi các trường `version` và `android.versionCode` **trước khi build**; màn hình **Cá nhân** đọc lại các giá trị này từ manifest runtime.

| Giá trị | Mục đích | Quy tắc |
|---|---|---|
| `version` | Số hiển thị cho người dùng và Android `versionName` | Dạng `MAJOR.MINOR.PATCH`, ví dụ `1.8.2`. |
| `android.versionCode` | Mã cập nhật nội bộ Android | Là số nguyên và **luôn tăng** so với APK đã cài gần nhất. |
| Git tag/Release | Tag/Release GitHub | Trùng với `version`, thêm tiền tố `v`, ví dụ `v1.8.2`. |

## Khi phát hành một bản mới

1. Hoàn tất thay đổi, kiểm tra TypeScript và test.
2. Mở `app.config.ts` và tăng `version` cùng `android.versionCode`.
3. Tạo APK đã ký. Chỉ APK có `androidVersionCode` lớn hơn mới có thể cập nhật đè một APK KINI cũ.
4. Tạo Git tag trùng `releaseId`, ví dụ `v1.8.2`.
5. Tạo GitHub Release cùng tag, ghi thay đổi chính và đính kèm đúng APK.
6. Mở **Cá nhân** trong KINI để đối chiếu số phiên bản và build với Release trước khi chia sẻ.

> Bản này dùng **KINI 1.8.2 · Build 2 · Android ổn định**. Người dùng có thể xác định đúng APK thông qua ba thông tin này.
