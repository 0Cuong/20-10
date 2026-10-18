# 20/10 — Dành tặng các chị em

Một món quà nhỏ nhân ngày Phụ nữ Việt Nam 20/10 💐  
Tạo thiệp chúc mừng, lưu lại và chia sẻ lời chúc đến những người phụ nữ tuyệt vời quanh bạn.

**Made by [0Cuong](https://www.facebook.com/0Cuongisme)**

---

## Chạy dự án trên máy tính

Bạn cần cài [Node.js](https://nodejs.org/) trước.

Mở Terminal hoặc PowerShell tại thư mục dự án, sau đó chạy:

```bash
npm install
npm run start
```

Mở địa chỉ được hiển thị trong cửa sổ lệnh (mặc định là http://localhost:3000).

Để tạo bản build dùng khi đăng website:

```bash
npm run build
```

Bản build sẽ nằm trong thư mục `dist`.

## Lưu và chia sẻ thiệp

- Thiệp có thể được lưu trên trình duyệt của bạn.
- Bạn có thể chia sẻ thiệp bằng đường link hoặc mã QR, tùy chức năng trên trang.
- Các chức năng lưu bản nháp và xuất bản trực tuyến cần kết nối Supabase.

## Cấu hình lưu thiệp trực tuyến (tùy chọn)

Nếu chỉ muốn chạy thử giao diện, bạn có thể bắt đầu bằng phần **Chạy dự án trên máy tính**.

Để bật lưu và xuất bản thiệp trực tuyến:

1. Tạo một dự án trên [Supabase](https://supabase.com/).
2. Sao chép file `.env.example` thành `.env`.
3. Điền địa chỉ dự án và **publishable key** (hoặc anon key công khai) vào các biến được hướng dẫn trong file mẫu.
4. Áp dụng migration của dự án lên Supabase trước khi dùng chức năng lưu/xuất bản trực tuyến.

**Lưu ý:** Không đăng tải file `.env` chứa thông tin cấu hình riêng tư. Tuyệt đối không đưa `service_role` key vào mã nguồn frontend hoặc GitHub.

## Đăng website

Bạn có thể triển khai bản build trên một dịch vụ hosting tĩnh như GitHub Pages, Netlify hoặc Vercel. Hãy kiểm tra cấu hình đường dẫn và các biến môi trường của dịch vụ trước khi đăng.

---

*Chúc các chị em có một ngày 20/10 thật vui vẻ, luôn xinh đẹp, hạnh phúc và được yêu thương!*