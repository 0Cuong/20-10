# Thiệp 20/10 — lớp lưu trữ & chia sẻ (Supabase)

## Cách chạy
- `npm install`
- `npm run start` mở trang ở `http://localhost:3000/`; `/` chuyển tới thiệp hiện có tại `/20_10`.
- `npm run build` tạo bản tĩnh trong `dist/`; `npm run preview` xem bản build.
- Nền video nằm ở `bg-video.mp4`, đã tắt tiếng và upscale 720×400 → 1920×1080 kèm làm nét nhẹ. `bg.webp` dùng làm poster/fallback và khi bật tuỳ chọn giảm chuyển động.

## Lưu và chia sẻ
- Thiệp vẫn tự lưu cục bộ và có thể chia sẻ bằng link/mã cũ.
- Trong trình chỉnh sửa, **Lưu bản nháp** và **Xuất bản** dùng Supabase RPC; **Chia sẻ link** mở Web Share trên thiết bị hỗ trợ, hoặc sao chép link. Có thể tạo mã QR cho link.
- Cấu hình trong file `.env` (không commit): `VITE_SUPABASE_URL` và `VITE_SUPABASE_PUBLISHABLE_KEY`. Tương thích khóa công khai cũ `VITE_SUPABASE_ANON_KEY`.
- Dự án đã có migration `20261018000000_cards.sql`, nhưng migration **chưa được áp dụng lên Supabase**. Lưu/xuất bản trực tuyến chỉ hoạt động sau khi chủ dự án tự áp migration.
- `cards-api.js` có 9 test mock `fetch`; các test đó không chứng minh Supabase thật đã hoạt động. Chưa kiểm tra kết nối DB thật.
- Không đưa `service_role` hoặc secret key vào frontend, `.env.example` hay repo. Chỉ dùng publishable/anon key công khai.

## Mô hình quyền
- Bảng `public.cards` bật RLS và không có policy: khách không đọc/ghi trực tiếp được.
- Mọi thao tác đi qua 6 hàm RPC (`security definer`, `search_path=''`): `create_card`, `get_card`, `get_card_for_edit`, `update_card`, `set_card_status`, `delete_card`.
- Người xem link chỉ gọi được `get_card` → chỉ thấy thiệp đã xuất bản và chưa hết hạn. Thiệp nháp, không tồn tại, hết hạn đều trả `null` như nhau.
- Sửa/xoá/xuất bản cần `edit_token` (24 byte ngẫu nhiên, DB chỉ lưu hash SHA-256). Token chỉ được trả một lần lúc tạo; trình duyệt người tạo giữ trong localStorage. Mất token = mất quyền sửa (không có tài khoản).
- `share_id` 11 ký tự base64url (64 bit ngẫu nhiên) và không phải cơ chế xác thực.
- Chống abuse: tối đa 10 thiệp/giờ/IP và 300 thiệp/giờ toàn hệ thống. IP lấy từ `x-forwarded-for` nên chỉ là biện pháp tạm; muốn chắc hơn hãy thêm Edge Function + Turnstile.

## Cài đặt
1. Tạo project Supabase.
2. Áp migration: `supabase link --project-ref <ref>` rồi `supabase db push` (hoặc dán SQL vào SQL Editor). Không chạy trên DB đang có dữ liệu thật khi chưa sao lưu.
3. Sao chép `.env.example` thành `.env`, rồi đặt Project URL và publishable key (hoặc anon key công khai) từ Settings → API vào các biến tương ứng.
4. Không bao giờ đưa `service_role` vào frontend hay repo.

## Lưu ý hosting
Trang đăng qua claude.ai có thể chặn request tới site khác nên không gọi được Supabase. Hãy đưa file lên host riêng (GitHub Pages, Netlify, Vercel…). Route thiệp dùng hash nên F5 và mở link trực tiếp không cần cấu hình rewrite.
