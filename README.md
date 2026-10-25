# DJ TOMK Music Website

Website nghe nhạc DJ với giao diện tối/neon, trình phát nhạc và trang quản trị upload nhạc, thay logo/banner, chỉnh màu và tiêu đề.

## Yêu cầu
- Node.js 18 trở lên (khuyên dùng bản LTS)
- Kết nối Internet khi cài dependencies lần đầu

## Cài trên Windows 10/11
1. Giải nén ZIP vào một thư mục, ví dụ `D:\DJ-TOMK-Website`.
2. Cài Node.js LTS từ https://nodejs.org/ nếu máy chưa có.
3. Mở thư mục dự án trong File Explorer, bấm thanh địa chỉ, gõ `cmd` rồi Enter. Hoặc mở Terminal tại thư mục dự án.
4. Chạy lần lượt:
   ```bat
   copy .env.example .env
   notepad .env
   ```
5. Trong `.env`, đổi `ADMIN_PASSWORD` thành mật khẩu mạnh riêng của bạn và đổi `SESSION_SECRET` thành chuỗi bí mật dài. Lưu file.
6. Tại cửa sổ terminal đang ở thư mục dự án, chạy:
   ```bat
   npm install
   npm start
   ```
7. Mở `http://localhost:3000` để xem trang chủ; mở `http://localhost:3000/admin` để quản trị.

Tài khoản mặc định trong file `.env.example` là `tomk`; hãy đổi mật khẩu trước khi dùng thật. Nếu đã cài dependencies, lần sau chỉ cần `npm start`.

## Cách dùng trang quản trị
- Đăng nhập tại `/admin` bằng thông tin trong `.env`.
- Chọn logo hoặc banner rồi nhấn nút tải ảnh lên.
- Chỉnh tên thương hiệu, dòng chữ, tiêu đề, mô tả, màu nhấn; bấm lưu.
- Nhập thông tin bài nhạc, chọn file và bấm Upload bài nhạc.
- Xóa bài trong phần Thư viện nhạc nếu cần.

## Đưa website lên Internet
Website này cần máy chủ chạy Node.js, không thể chỉ tải thư mục `public` lên dịch vụ hosting tĩnh. Hãy triển khai lên một dịch vụ hỗ trợ Node.js và ổ đĩa lưu trữ bền vững. Vì dữ liệu nhạc và ảnh đang lưu trong `uploads/`, còn danh sách lưu ở `data/`, phải bảo đảm hai thư mục này được giữ lại sau khi deploy/restart; nếu nền tảng dùng ổ đĩa tạm, cần chuyển file sang object storage và metadata sang database trước khi dùng lâu dài. Bật HTTPS, đặt `NODE_ENV=production`, đặt `SESSION_SECRET`/`ADMIN_PASSWORD` mạnh và không chia sẻ file `.env`.

## Giới hạn hiện tại
- Upload tối đa 100MB mỗi file nhạc và 12MB mỗi ảnh.
- Dữ liệu metadata lưu JSON phù hợp website nhỏ/demo; nếu nhiều người dùng hoặc nhiều bài, nên nâng cấp database và object storage.
- Không có chức năng tải nhạc xuống riêng; trình phát chỉ phát nhạc trên web.
- Chỉ upload nội dung bạn có quyền sử dụng.
