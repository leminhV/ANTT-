# Changelog - LabBook System
## Ngày 03/06/2026: Bản vá Finalization & Handover

**1. Vá lỗi sập mạng do vòng lặp vô hạn (Infinite Loop)**
- **Nguyên nhân:** File `frontend/src/components/layout/Layout.tsx` sử dụng object `user` trong dependency của `useEffect`. Do `user` được parse liên tục từ LocalStorage nên object luôn mới, gây gọi API `/api/bookings` liên tục.
- **Cách sửa:** Đổi dependency thành biến chuỗi tĩnh `[userStr]`, loại bỏ triệt để lỗi 429 Too Many Requests.

**2. Sửa lỗi trình biên dịch TypeScript**
- **Cách sửa:** Làm sạch file `tsconfig.json`, gỡ bỏ cờ `--ignoreDeprecations` sai phiên bản, khôi phục cấu trúc chuẩn của React + Vite.

**3. Sửa luồng thiết lập (Settings) & Bảo trì**
- **Frontend:** Sửa hàm `handleChange` trong `Settings.tsx` để tự động append cài đặt mới nếu chưa tồn tại trong danh sách.
- **Backend:** Cập nhật hàm `bulkSettings` sử dụng lệnh `upsert` (Có thì sửa, chưa có thì tạo mới) thay vì `update`, khắc phục lỗi `RecordNotFound`.

**4. Cải thiện UX/UI Trang Sinh viên**
- Nút "Xem tất cả ->" ở lịch đặt được chuyển thành `<Link>` điều hướng chuẩn xác sang trang `/my-bookings`.
- Thêm Toast notification cho mục Thông báo và thanh Tìm kiếm để tăng tính tương tác.
- Đồng bộ hiển thị email gợi ý trên màn hình Login đúng với dữ liệu Seed (`lehoangc@st.vju.ac.vn`).

**5. Hoàn thiện AI Chatbot & Realtime**
- Component `AIAssistant` đã được nối với API thực tế qua `handleAIAction`, tự động fetch lại danh sách booking sau khi thực hiện lệnh.
- Tích hợp thành công `Socket.io` vào `Layout.tsx` để đẩy Toast notification real-time.

**6. Cấu trúc Docker Enterprise**
- Tối ưu hóa file `docker-compose.yml` với 4 services (`db`, `redis`, `nestjs-app`, `react-app`).
- Ứng dụng Redis cho Caching và Rate Limit (Throttler). 
- *Ghi chú:* Hỗ trợ fallback chạy Local Memory linh hoạt nếu môi trường không có Docker.
