# Quản lý phiên bản KINI

KINI dùng cấu hình phát hành duy nhất tại [`app.config.ts`](../app.config.ts). Mọi bản APK mới phải thay đổi các trường `version` và `android.versionCode` **trước khi build**; màn hình **Cá nhân** đọc lại các giá trị này từ manifest runtime.

| Giá trị | Mục đích | Quy tắc |
|---|---|---|
| `version` | Số hiển thị cho người dùng và Android `versionName` | Dạng `MAJOR.MINOR.PATCH`, ví dụ `1.8.2`. |
| `android.versionCode` | Mã cập nhật nội bộ Android | Là số nguyên và **luôn tăng** so với APK đã cài gần nhất. |
| Git tag nguồn | Mốc mã nguồn kỹ thuật | Trùng với `version`, thêm tiền tố `v`, ví dụ `v1.8.3`. |
| GitHub Release | Mã phát hành để tải về | Chuỗi riêng, tăng tuần tự: `v1.1`, `v1.2`, `v1.3`… Không bắt buộc trùng `version` hay `versionCode`. |

## Khi phát hành một bản mới

1. Hoàn tất thay đổi, kiểm tra TypeScript và test.
2. Mở `app.config.ts` và tăng `version` cùng `android.versionCode`.
3. Tạo APK đã ký. Chỉ APK có `androidVersionCode` lớn hơn mới có thể cập nhật đè một APK KINI cũ.
4. Tạo Git tag nguồn trùng `version`, ví dụ `v1.8.3`.
5. Tạo GitHub Release theo mã phát hành kế tiếp, ví dụ **Release v1.1**, ghi rõ bản KINI/build mà release chứa và đính kèm APK nếu đã có.
6. Mở **Cá nhân** trong KINI để đối chiếu số phiên bản và build với ghi chú Release trước khi chia sẻ.

> Bản nguồn hiện tại dùng **KINI 1.8.3 · Build 3 · Android ổn định**. GitHub Release đầu tiên theo quy ước này là **v1.1**. Người dùng có thể xác định APK qua cả mã Release và số ứng dụng/build trong mục **Cá nhân**.
