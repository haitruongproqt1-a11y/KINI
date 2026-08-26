# Bảo mật build APK tự động

Workflow `.github/workflows/build-release.yml` chỉ nhận khóa ký Android sau khi đổi token OIDC ngắn hạn của GitHub Actions tại endpoint production `/api/build/android-signing`.

Máy chủ kiểm tra các claim `issuer`, `audience`, `repository`, `workflow_ref`, `ref` và `event_name`; chỉ workflow KINI chạy thủ công từ nhánh `main` được phép nhận khóa. Khóa ký không được ghi vào Git, artifact hay GitHub Secrets.

Tài liệu tham chiếu chính thức: <https://docs.github.com/actions/reference/openid-connect-reference> và <https://docs.github.com/en/actions/concepts/security/openid-connect>.
