# 🏗️ Hướng dẫn Cấu trúc Source Code (Clean Architecture)

Dự án này áp dụng **Clean Architecture** kết hợp với kỹ thuật **Dependency Injection (DI)** thủ công tại `src/app.js`.

Quy tắc vàng: **Các lớp bên trong KHÔNG ĐƯỢC phụ thuộc vào các lớp bên ngoài.**

## 1. Cấu trúc thư mục (`src/`)

```text
src/
├── application/       # (Tầng 2) Business Logic - Chứa các Use Cases
│   ├── auth/          # Ví dụ: LoginUser.js, RegisterUser.js...
│   ├── bookings/      # Ví dụ: CreateBooking.js, GetAvailableSlots.js...
│   └── ...            # Các nghiệp vụ khác
├── domain/            # (Tầng 1) Core - Chứa Entities và Interfaces (Hợp đồng)
│   ├── entities/      # Class thuần mô tả đối tượng (User.js, Booking.js...)
│   └── repositories/  # Interface định nghĩa các hàm thao tác DB (IUserRepository.js...)
├── infrastructure/    # (Tầng 3) Implementation - Triển khai kỹ thuật cụ thể
│   ├── repositories/  # Code thực thi DB bằng Prisma (PrismaUserRepository.js...)
│   └── services/      # Các dịch vụ bên ngoài (EmailService, GoogleAuthService...)
├── interfaces/        # (Tầng 4) Adapters - Giao tiếp với thế giới bên ngoài
│   ├── controllers/   # Nhận HTTP Request, gọi Use Case, trả Response JSON
│   ├── middlewares/   # Auth, Validation, ErrorHandling...
│   └── routes/        # Định nghĩa API Endpoint (Express Router)
├── app.js             # "Mainboard" - Nơi kết nối (DI) tất cả các lớp lại với nhau
└── server.js          # Entry point - Khởi chạy server Express
```

## 2. Phân tích chi tiết từng tầng

### A. Domain Layer (Lõi trung tâm)
*   **Nhiệm vụ:** Định nghĩa dữ liệu (`Entities`) và các quy tắc nghiệp vụ cốt lõi nhất (`Repository Interfaces`).
*   **Đặc điểm:** Hoàn toàn độc lập. Không `import` bất kỳ thư viện nào từ các tầng bên ngoài (không `express`, không `prisma`).
*   **Ví dụ:** `IUserRepository` chỉ định nghĩa "Tôi cần một hàm để tìm người dùng theo email", nhưng không quan tâm việc tìm kiếm đó được thực hiện bằng SQL hay MongoDB.

### B. Application Layer (Use Cases)
*   **Nhiệm vụ:** Điều phối luồng dữ liệu để thực thi một yêu cầu nghiệp vụ cụ thể. Đây là nơi chứa logic chính (ví dụ: kiểm tra mật khẩu, tính toán các lịch đặt bị trùng).
*   **Đặc điểm:** `import` các `Entity` và `Repository Interface` từ tầng **Domain**.
*   **Luồng hoạt động (Flow):** Nhận Dữ liệu đầu vào (Input) -> Xác thực Logic (Validate Logic) -> Gọi Repository -> Trả về Dữ liệu đầu ra (Output).

### C. Infrastructure Layer (Hạ tầng)
*   **Nhiệm vụ:** Cung cấp các triển khai kỹ thuật cụ thể cho các `Interface` đã được định nghĩa ở tầng **Domain**.
*   **Đặc điểm:** Đây là nơi duy nhất được phép `import PrismaClient` hoặc các SDK của bên thứ ba (AWS S3, SendGrid...).
*   **Ví dụ:** `PrismaUserRepository` sẽ triển khai `IUserRepository`, chứa code thực thi câu lệnh `prisma.user.findUnique(...)`.

### D. Interfaces Layer (Giao tiếp)
*   **Nhiệm vụ:** Chuyển đổi dữ liệu giữa thế giới bên ngoài (ví dụ: HTTP Request) và tầng **Application**.
*   **Controller:** Không chứa logic nghiệp vụ phức tạp. Vai trò chính là: Nhận request -> Gọi Use Case -> Trả về response dạng JSON.

## 3. "Wiring" - Cách hệ thống kết nối (`src/app.js`)

Đây là phần quan trọng nhất để hiểu cách các file rời rạc hoạt động cùng nhau. Chúng ta sử dụng kỹ thuật **Dependency Injection (DI)**:

1.  **Bước 1:** Khởi tạo kết nối cơ sở dữ liệu (`prisma`).
2.  **Bước 2:** Khởi tạo `Repository` và "tiêm" (inject) `prisma` vào đó (`new PrismaUserRepository(prisma)`).
3.  **Bước 3:** Khởi tạo `Use Case` và tiêm `Repository` vào đó (`new LoginUser(userRepo)`).
4.  **Bước 4:** Khởi tạo `Controller` và tiêm `Use Case` vào đó (`new AuthController(loginUseCase)`).
5.  **Bước 5:** Gắn `Controller` vào `Router` để định tuyến.

👉 **Lợi ích:** Cấu trúc này giúp dễ dàng thay thế cơ sở dữ liệu hoặc viết Unit Test (bằng cách "mock" Repository) mà không cần phải sửa đổi code ở tầng Use Case.

## 4. Quy trình thêm một tính năng mới (Ví dụ: Xem danh sách phòng)

1.  **Domain:**
    *   Định nghĩa `Facility` entity trong `src/domain/entities/`.
    *   Định nghĩa `IFacilityRepository` interface (với hàm `findAll`) trong `src/domain/repositories/`.
2.  **Infrastructure:**
    *   Tạo `PrismaFacilityRepository`, triển khai `IFacilityRepository` và viết code Prisma để lấy danh sách phòng.
3.  **Application:**
    *   Tạo use case `ListFacilities.js` trong `src/application/facilities/`.
4.  **Interfaces:**
    *   Tạo `FacilityController.js` và `FacilityRoutes.js`.
    *   Định nghĩa route `GET /facilities` trong router.
5.  **`app.js`:**
    *   Khởi tạo và kết nối tất cả các thành phần trên lại với nhau theo nguyên tắc Dependency Injection.