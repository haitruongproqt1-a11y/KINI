# Build APK KINI trực tiếp trên máy cá nhân

Tài liệu này hướng dẫn tạo APK KINI trực tiếp trên Windows, macOS hoặc Linux, không dùng cloud build. Phương án phù hợp nhất khi cần cài thử nhanh là **Expo prebuild + Gradle**. Với bản phát hành lâu dài, nên dùng **Android Studio** để tạo APK có ký số riêng.

## Yêu cầu cài đặt

| Thành phần | Phiên bản khuyến nghị | Mục đích |
| --- | --- | --- |
| Node.js | 22 LTS | Chạy Expo và pnpm |
| pnpm | 9.x | Cài dependency đúng lockfile |
| JDK | 17 | Biên dịch Android Gradle |
| Android Studio | Bản ổn định mới nhất | Android SDK, Platform Tools và ký APK |
| Android SDK | API 35 hoặc phiên bản Android Studio đề xuất | Biên dịch APK |

Sau khi cài Android Studio, mở **SDK Manager** và cài Android SDK Platform, Android SDK Build-Tools, Android SDK Command-line Tools và Android SDK Platform-Tools. Thiết lập biến môi trường `ANDROID_HOME` trỏ tới thư mục SDK Android rồi thêm `platform-tools` vào biến `PATH`.

## Tải mã nguồn

Repository KINI là riêng tư. Đăng nhập GitHub có quyền truy cập rồi dùng một trong hai cách sau:

```bash
git clone https://github.com/haitruongproqt1-a11y/KINI.git
cd KINI
git checkout v1.7.0
```

Hoặc trên GitHub chọn **Tags**, mở tag cần dùng rồi chọn **Code → Download ZIP** và giải nén. Các tag `v1.0.0` đến `v1.7.0` là các mốc phiên bản mã nguồn.

## Tạo APK cài thử nhanh

Tại thư mục KINI, chạy lần lượt:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm exec expo prebuild --platform android
cd android
./gradlew assembleRelease
```

Trên Windows thay lệnh cuối bằng:

```powershell
.\gradlew.bat assembleRelease
```

APK thường nằm tại `android/app/build/outputs/apk/release/app-release.apk`. Chép tệp này vào điện thoại Android, mở tệp và cấp quyền **Install unknown apps** cho ứng dụng đang mở APK nếu hệ thống yêu cầu.

## Ký APK phát hành ổn định

Để nâng cấp đè các phiên bản sau này, luôn giữ nguyên package Android `com.app.kinimobile` và cùng khóa ký. Trong Android Studio, mở thư mục `android`, chọn **Build → Generate Signed Bundle / APK → APK**, tạo hoặc chọn keystore của bạn, sau đó chọn biến thể `release` để xuất APK đã ký.

> Giữ file keystore và mật khẩu ở nơi an toàn. Nếu mất khóa ký, bạn không thể cập nhật đè APK đã phát hành bằng một APK có khóa khác.

## Đưa APK lên GitHub

Sau khi có APK đã ký, tạo release trong repository KINI: chọn **Releases → Draft a new release**, chọn tag tương ứng, ví dụ `v1.7.0`, kéo thả APK vào phần file đính kèm rồi publish release. Người dùng có quyền truy cập repository sẽ tải APK trong mục **Releases**.
