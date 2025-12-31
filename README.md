# 🏫 FPTU Multi-campus Facility Booking System (Backend)

## 1. Giới thiệu
Đây là hệ thống Backend (RESTful API) phục vụ việc quản lý và đặt phòng/tài nguyên (Phòng họp, Phòng Lab, Sân thể thao) tại Đại học FPT (hỗ trợ nhiều cơ sở - Multi-campus).

Hệ thống giúp giải quyết bài toán xung đột lịch đặt, tối ưu hóa việc sử dụng cơ sở vật chất và cung cấp công cụ quản lý cho cán bộ trường.

## 2. Công nghệ sử dụng
* **Core:** Node.js, Express.js
* **Database:** PostgreSQL
* **ORM:** Prisma (Schema management, Migrations, Seeding)
* **Authentication:** JWT + Google OAuth 2.0 (Passport.js)
* **Architecture:** Clean Architecture (Phân tách rõ ràng giữa Domain, Application và Infrastructure)
* **Documentation:** Swagger UI (OpenAPI 3.0)

## 3. Tính năng chính

### 1. Dành cho Sinh viên & CLB
* **Smart Booking:** Tìm kiếm và đặt phòng theo slot. Hỗ trợ cơ chế **Soft-lock** (cho phép nhiều người cùng Pending).
* **Club Priority:** Tự động gợi ý phòng ưu tiên và cộng điểm ưu tiên cho Club Leader.
* **Google Login:** Đăng nhập nhanh bằng email sinh viên (`@fpt.edu.vn`).

### 2. Dành cho Giảng viên (Lecturer)
* **Recurring Booking:** Đặt lịch định kỳ (VD: 10 tuần liên tiếp) chỉ với 1 thao tác. Hệ thống tự động quét và báo cáo các tuần bị trùng.
* **High Priority:** Được quyền đặt các phòng chuyên dụng (Lớp học, Phòng họp).

### 3. Dành cho Quản trị viên (Facility Admin)
* **Conflict Resolution:** Duyệt 1 đơn -> Hệ thống tự động từ chối các đơn trùng lịch khác.
* **Intelligent Maintenance:** Khi set phòng bảo trì, thuật toán tự động tìm phòng thay thế (Relocation) cho các đơn đã duyệt hoặc hủy nếu hết phòng.
* **Resource Management:** Quản lý phòng, thiết bị theo tình trạng (Good/Broken).

### 4. Dành cho Bảo vệ (Security Guard)
* **Manual Check-in:** Check-in nhanh bằng mã đơn hoặc tên.
* **Incident Report:** Báo cáo sự cố hỏng hóc nhanh chóng tại hiện trường.

---
* **Phân quyền (RBAC):**
    * **Student:** Xem lịch, Đặt phòng (ngắn hạn), Xem lịch sử.
    * **Lecturer:** Đặt phòng (ngắn hạn & định kỳ theo kỳ học), Quyền ưu tiên.
    * **Facility Admin:** Quản lý phòng (CRUD), Duyệt/Từ chối đơn, Báo cáo thống kê.
* **Nghiệp vụ cốt lõi:**
    * Quản lý nhiều phòng/tài nguyên trong 1 cơ sở (Campus Management).
    * Kiểm tra trùng lịch tự động (Conflict Check).
    * Đặt phòng ngắn hạn (Short Booking).
    * Đặt phòng định kỳ (Recurring Booking - ví dụ: đặt 10 tuần học).
    * Xử lý sự cố/Bảo trì phòng.

## 4. Hướng dẫn cài đặt & Chạy (Local Development)

### Yêu cầu
* Node.js (v18+)
* PostgreSQL
* pnpm (khuyến nghị) hoặc npm

### Các bước thực hiện
1.  **Clone dự án:**
    ```bash
    git clone <repo-url>
    cd fptu-facility-booking-backend
    ```

2.  **Cài đặt thư viện:**
    ```bash
    pnpm install
    ```

3.  **Cấu hình môi trường:**
    * Copy file `.env.example` thành `.env`.
    * Cập nhật `DATABASE_URL` (kết nối Postgres) và `JWT_SECRET`.

4.  **Khởi tạo Database:**
    ```bash
    npx prisma generate   # Tạo Prisma Client
    npx prisma migrate dev --name init # Chạy migration tạo bảng
    node prisma/seed.js   # Nạp dữ liệu mẫu (Admin, Campus)
    ```

5.  **Chạy Server:**
    ```bash
    pnpm run dev  # Chế độ development (hot-reload)
    pnpm run start  # Chế độ production

    ```

6.  **Truy cập tài liệu API:**
    * Mở trình duyệt: `http://localhost:3000/api-docs` (port tùy chỉnh))
    * Chạy trên Server: `https://multi-campus-facility-booking-system-vh0n.onrender.com/api-docs`


## 5. Cấu trúc dự án
```
src/
├── application/    # Business logic (Use Cases)
├── domain/         # Domain entities and interfaces
├── infrastructure/ # External integrations (DB, Services)
├── interfaces/     # Controllers, Routes, Middlewares
└── utils/          # Utility functions
```

## 6. Scripts có sẵn
* `pnpm run start` - Chạy server production
* `pnpm run dev` - Chạy server development (hot-reload)
* `pnpm run db:seed` - Seed dữ liệu mẫu
* `pnpm run db:generate` - Generate Prisma Client
* `pnpm run db:migrate` - Chạy migrations
* `pnpm run db:studio` - Mở Prisma Studio
* `pnpm run db:reset` - Reset database và chạy lại migrations