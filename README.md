# 20/10 — Trình tạo thiệp chúc mừng

Một dự án web tĩnh để tự thiết kế thiệp 20/10 bằng lời nhắn, ảnh, màu giấy và sticker. Giao diện tiếng Việt; có hiệu ứng mở phong bì, nhạc nền, chế độ giảm chuyển động và khả năng chia sẻ thiệp.

**Bản demo:** [Mở thiệp 20/10](https://20-10-open-source.vercel.app/20_10) · [Trang chủ](https://20-10-open-source.vercel.app)

[![CI](https://github.com/0Cuong/20-10/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/0Cuong/20-10/actions/workflows/ci.yml)

## Tính năng

- Tùy chỉnh tên người nhận/người gửi, lời chúc, tiêu đề, câu kết và lời nhắn cuối.
- Chọn ảnh, màu giấy, thêm/kéo/xoay/đổi kích thước sticker.
- Tự lưu bản nháp trong trình duyệt; chia sẻ bằng đường dẫn hoặc mã QR mà không cần máy chủ.
- Tùy chọn lưu bản nháp và xuất bản thiệp trực tuyến bằng Supabase.
- Chạy và build bằng Vite; không cần framework frontend.

> **Quyền riêng tư:** link chia sẻ cục bộ chứa nội dung thiệp đã nén/encode trong URL, không được mã hóa. Bất kỳ ai có link đều có thể đọc nội dung. Chỉ đưa vào thiệp những thông tin bạn sẵn sàng chia sẻ.

## Yêu cầu và chạy trên máy

Cần Node.js **20.19+** và npm.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định `http://127.0.0.1:3000`).

```bash
npm test       # chạy kiểm thử API
npm run build  # tạo website tĩnh trong dist/
npm run check  # chạy test và build
npm run preview
```

## Lưu/xuất bản trực tuyến (tùy chọn)

Chế độ cục bộ và link/QR hoạt động mà không cần Supabase. Chỉ thiết lập phần này nếu bạn muốn lưu thiệp trên máy chủ và chia sẻ đường dẫn ngắn.

1. Tạo một dự án Supabase.
2. Sao chép `.env.example` thành `.env`, rồi điền URL và publishable key (hoặc anon key công khai):
   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
   ```
   Có thể dùng `VITE_SUPABASE_ANON_KEY` làm tên biến thay thế.
3. Mở SQL Editor của **đúng dự án Supabase** và chạy migration `20261018000000_cards.sql` một lần.
4. Khởi động lại `npm run dev` hoặc build lại sau khi đổi biến môi trường.

**Không đưa service-role key vào frontend hoặc GitHub.** Publishable/anon key được dùng ở client; không thay thế kiểm soát quyền ở database. Migration trong repo chưa được xác minh trên một dự án Supabase thực tế; hãy thử trên dự án mới trước khi dùng dữ liệu quan trọng. Không có tài khoản khôi phục: xóa dữ liệu trình duyệt có thể làm mất token chỉnh sửa của bản nháp.

## Build và triển khai

```bash
npm run build
```

Đưa **toàn bộ nội dung** trong `dist/` lên hosting tĩnh. Vite dùng `base: './'` để phù hợp với root domain và các đường dẫn dạng GitHub Pages. Nếu hosting không hỗ trợ URL sạch, mở `/20_10.html`; hosting có URL sạch có thể phục vụ `/20_10`.

## Đóng góp và giấy phép

Đọc [CONTRIBUTING.md](CONTRIBUTING.md) trước khi gửi issue hoặc pull request. Mã nguồn, test, cấu hình và tài liệu theo MIT ([LICENSE](LICENSE)). **Các tệp ảnh, sticker, video và nhạc có phạm vi quyền riêng**; xem [ASSET-LICENSES.md](ASSET-LICENSES.md) trước khi tái sử dụng media.
