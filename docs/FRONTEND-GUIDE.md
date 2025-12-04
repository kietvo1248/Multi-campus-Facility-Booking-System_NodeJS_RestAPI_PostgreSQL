# 🔌 Hướng dẫn Tích hợp API (Dành cho Frontend Dev)

## 1. Thông tin kết nối
* **Base URL (Dev):** `http://localhost:3000/api`
* **Swagger Docs:** `http://localhost:3000/api-docs` (Xem chi tiết params, response body, try-it-out).

## 2. Cơ chế Xác thực (Authentication)
Hệ thống sử dụng **JWT (JSON Web Token)**.

* **Bước 1: Login**
    * Gọi API `POST /auth/login`.
    * Response trả về `{ token: "eyJhbGciOi...", user: {...} }`.
* **Bước 2: Lưu Token**
    * Lưu `token` vào `localStorage` hoặc `Cookie`.
* **Bước 3: Gửi Request có bảo mật**
    * Tất cả các API yêu cầu đăng nhập (có icon ổ khóa trong Swagger) đều cần Header:
    ```
    Authorization: Bearer <token_cua_ban>
    ```

## 3. Các Flow chính & Dữ liệu cần lưu ý

### A. Phân quyền (RBAC)
Frontend cần check field `role` trong object `User` để ẩn/hiện menu:
* `FACILITY_ADMIN`: Thấy menu "Quản lý phòng", "Duyệt đơn".
* `STUDENT`/`LECTURER`: Thấy menu "Đặt phòng", "Lịch sử của tôi".

### B. Enum & Trạng thái (Mapping màu sắc)
Các trạng thái sau sẽ được trả về từ API, Frontend cần map màu tương ứng:

**1. Booking Status (`booking.status`):**
* `PENDING` (Vàng): Chờ duyệt.
* `APPROVED` (Xanh dương): Đã duyệt (Lịch đã chốt).
* `REJECTED` (Đỏ): Bị từ chối (Kèm lý do).
* `CANCELLED` (Xám): Người dùng tự hủy.
* `COMPLETED` (Xanh lá): Đã sử dụng xong.

**2. Facility Status (`facility.status`):**
* `ACTIVE`: Đang hoạt động (Cho phép đặt).
* `MAINTENANCE`: Đang bảo trì (Disable nút đặt, hiện thông báo).
* `INACTIVE`: Ngưng hoạt động (Ẩn khỏi danh sách tìm kiếm).

### C. Luồng Đặt phòng (Booking Flow)
1.  **Tìm kiếm:** `GET /facilities?campusId=1&type=MeetingRoom`.
2.  **Xem chi tiết:** `GET /facilities/{id}` (Lấy thông tin sức chứa, thiết bị).
3.  **Đặt phòng:** `POST /bookings`
    * Body mẫu:
      ```json
      {
        "facilityId": 10,
        "startTime": "2023-10-25T09:00:00Z",
        "endTime": "2023-10-25T11:00:00Z",
        "purpose": "Họp nhóm đồ án"
      }
      ```

## 4. Xử lý lỗi (Error Handling)
Frontend nên bắt các mã lỗi HTTP sau:

* **400 Bad Request:** Dữ liệu gửi lên sai (thiếu trường, sai định dạng ngày tháng).
* **401 Unauthorized:** Token hết hạn hoặc không hợp lệ -> **Tự động logout và chuyển về trang Login**.
* **403 Forbidden:** User không có quyền thực hiện (VD: Sinh viên cố tình gọi API duyệt đơn của Admin).
* **409 Conflict:** Trùng lịch đặt phòng -> Hiện thông báo "Khung giờ này đã có người đặt".
* **500 Internal Server Error:** Lỗi server -> Báo user thử lại sau.