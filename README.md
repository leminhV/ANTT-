# Web Lab Booking System (LabBook)

Dự án Đặt lịch và Quản lý Thiết bị Phòng Thí nghiệm chuẩn Enterprise.

## 🛠 Kiến trúc & Công nghệ (Tech Stack)
- **Backend:** NestJS (Mạnh mẽ, chuẩn kiến trúc module) + Prisma ORM (Truy vấn CSDL an toàn) + MySQL (Lưu trữ quan hệ).
- **Frontend:** React + Vite (Tốc độ render siêu tốc) kết hợp cùng TailwindCSS / Radix UI (Giao diện hiện đại, chuẩn thiết kế).
- **Authentication:** JWT Auth kết hợp Refresh Token (Bảo mật phiên đăng nhập).
- **Khử đụng độ (Concurrency Control):** Áp dụng cơ chế Pessimistic/Optimistic Locking / Row Version để đảm bảo 2 sinh viên không thể đặt trùng 1 thiết bị trong cùng 1 giây.

## 🌟 6 Phân hệ Chức năng Cốt lõi (Core Modules)

### 1. Hệ thống Đặt phòng & Thiết bị Thông minh (Smart Booking)
- Sinh viên/Giảng viên có thể đặt phòng Lab và trang thiết bị đi kèm.
- **Quy tắc khắt khe (Booking Rules):** Khống chế độ dài ca (Tối thiểu 30p, Tối đa 4h) và thiết lập Thời gian đệm (Buffer Time) 15 phút giữa 2 ca để nhân sự có thời gian dọn dẹp phòng.
- **Phát hiện đụng độ thời gian thực** (Ngăn chặn việc đặt trùng lịch).

### 2. Phân quyền & Quản lý Danh sách đen (RBAC & Blacklist)
- Hệ thống phân chia rành mạch 4 vai trò: `ADMIN`, `TECHNICIAN`, `INSTRUCTOR`, `STUDENT`.
- **Blacklist System:** Quản trị viên có thể khóa tài khoản của cá nhân vi phạm kèm theo Lý do cấm. Khi sinh viên vi phạm đăng nhập, hệ thống sẽ đẩy thẳng lý do này (Ví dụ: "Làm hỏng thiết bị không khai báo") lên màn hình thay vì báo lỗi chung chung.

### 3. Báo cáo Sự cố & Giao tiếp (Incident & Comments)
- Ghi nhận các thiết bị hỏng hóc/cần bảo trì.
- Luồng xử lý sự cố quy chuẩn 3 bước: `OPEN` (Chưa xử lý) -> `IN_PROGRESS` (Đang sửa) -> `RESOLVED` (Hoàn tất).
- Hệ thống Comment theo cấp (Nested comments) để sinh viên và kỹ thuật viên trao đổi trực tiếp trong từng đơn báo cáo.

### 4. Đa ngôn ngữ Đồng bộ 2 chiều (i18n Sync)
- Hỗ trợ 3 ngôn ngữ: Việt Nam, English, 日本語.
- Không chỉ dịch giao diện tĩnh, mà toàn bộ **Logic Lỗi từ Backend** (Exception) cũng được bắt và dịch động. Ví dụ, nếu Server chặn đặt phòng do bảo trì, người dùng tiếng Anh sẽ nhận được Toast *"System is under maintenance..."* trong khi người dùng tiếng Việt nhận *"Hệ thống đang bảo trì..."*.

### 5. Cấu hình Hệ thống Linh hoạt (Dynamic Settings)
- Thay vì hard-code, Quản trị viên có thể tinh chỉnh các thông số vận hành (Giờ mở cửa, Quy định đặt phòng...) trực tiếp từ giao diện UI. Hệ thống sẽ tự động bắt lấy tham số mới ngay lập tức.

### 6. Trợ lý Ảo AI Tích hợp (AIAssistant - Zero Cost NLP)
- Sở hữu một Chatbot nhúng ngay tại góc màn hình Frontend.
- Bot hoạt động theo cơ chế **Keyword/Regex** (Phân tích ngôn ngữ tự nhiên tại Client-side) giúp loại bỏ 100% chi phí gọi API LLM (như OpenAI) nhưng vẫn duy trì độ thông minh xuất sắc.
- **Bot có quyền năng:** Sinh viên có thể chat *"Lịch của tôi"* để tra cứu; Quản trị viên có thể lệnh *"Phê duyệt tất cả"* hoặc *"Tìm thiết bị [tên]"* để tự động kích hoạt API điều khiển hệ thống thực tế.

## 🛡 Chất lượng Dự án
- **Dữ liệu Mẫu (Seed Data) Hoàn hảo:** Đã được bơm sẵn 5 Phòng Lab, 20 Thiết bị, 10 Tài khoản và 20 Đơn đặt phòng ngẫu nhiên bằng tiếng Việt có dấu. Hệ thống có thể dùng để Demo cho khách hàng hoặc bảo vệ Đồ án ngay lập tức.
- **Không nợ Kỹ thuật (Zero Tech-debt):** Toàn bộ cảnh báo ESLint, lỗi React Hook, hay lỗi Bypass Type (`as any`) đều đã được triệt tiêu hoàn toàn. Lệnh `npm run build` vượt qua bài kiểm tra ở cả Frontend lẫn Backend với 0 lỗi.

---
*Dự án LabBook là một minh chứng tuyệt vời cho một ứng dụng có kiến trúc chuẩn doanh nghiệp, quy mô phân hệ đa dạng, tối ưu chi phí hạ tầng (AI Bot) và trải nghiệm người dùng/quản trị viên (UX) được đặt lên hàng đầu.*

## 🚀 Hướng dẫn cài đặt (Running the code)

1. Chạy `npm install` ở cả hai thư mục `backend` và `frontend` để cài đặt thư viện.
2. Thiết lập cơ sở dữ liệu MySQL và cập nhật file `.env`.
3. Chạy lệnh `npm run dev` ở cả hai môi trường để khởi động server phát triển.