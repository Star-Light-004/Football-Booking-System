# ⚽ Football Booking System — Pitch & Pulse

Hệ thống đặt sân bóng đá nhân tạo trực tuyến, cho phép người dùng tìm kiếm, xem thông tin và đặt sân bóng nhanh chóng. Quản trị viên có thể quản lý toàn bộ dữ liệu hệ thống qua giao diện Admin Console chuyên biệt.

---

## 🗂️ Mục lục

- [Tổng quan công nghệ](#-tổng-quan-công-nghệ)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Mô hình dữ liệu](#-mô-hình-dữ-liệu)
- [Chức năng người dùng](#-chức-năng-người-dùng)
- [Chức năng Admin](#-chức-năng-admin)
- [API Endpoints](#-api-endpoints)
- [Hướng dẫn cài đặt](#-hướng-dẫn-cài-đặt)
- [Biến môi trường](#-biến-môi-trường)

---

## 🛠️ Tổng quan công nghệ

| Thành phần   | Công nghệ                                    |
|--------------|----------------------------------------------|
| **Frontend** | React 18, React Router DOM v6, Axios         |
| **Backend**  | Django 4.2, Django REST Framework            |
| **Database** | PostgreSQL                                   |
| **Auth**     | Session-based (custom, password hashing)     |
| **Media**    | Django Media Files (ảnh sân, dịch vụ)        |
| **CORS**     | django-cors-headers                          |
| **Timezone** | Asia/Ho_Chi_Minh                             |

---

## 📁 Cấu trúc dự án

```
football-booking-system/
├── backend/                        # Django Backend
│   ├── apps/
│   │   ├── bookings/               # Quản lý đặt sân
│   │   ├── fields/                 # Quản lý sân bóng
│   │   ├── users/                  # Quản lý người dùng & xác thực
│   │   ├── reviews/                # Đánh giá sân bóng
│   │   ├── timeslots/              # Khung giờ sân
│   │   ├── servicesadd/            # Dịch vụ thêm (nước, bóng,...)
│   │   ├── notifications/          # Thông báo hệ thống
│   │   └── payments/               # Thanh toán (đang phát triển)
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── media/                      # File ảnh upload
│   ├── .env                        # Biến môi trường
│   └── manage.py
│
└── frontend/                       # React Frontend
    └── src/
        ├── api/                    # Axios API calls
        ├── components/
        │   ├── BookingForm/        # Form đặt sân
        │   ├── FieldCard/          # Card hiển thị sân
        │   ├── Navbar/             # Thanh điều hướng
        │   ├── Footer/             # Footer
        │   ├── ProtectedRoute/     # Route bảo vệ
        │   └── ServiceSection/     # Khu vực dịch vụ
        ├── pages/
        │   ├── Home/               # Trang chủ
        │   ├── Fields/             # Danh sách sân
        │   ├── FieldDetail/        # Chi tiết sân
        │   ├── Booking/            # Đặt sân
        │   ├── BookingSuccess/     # Xác nhận đặt sân thành công
        │   ├── BookingDetail/      # Chi tiết lịch đặt
        │   ├── MyBookings/         # Lịch sử đặt sân của tôi
        │   ├── Lookup/             # Tra cứu lịch đặt (không cần đăng nhập)
        │   ├── Login/              # Đăng nhập
        │   ├── Register/           # Đăng ký
        │   ├── Profile/            # Thông tin cá nhân
        │   └── admin/
        │       ├── dashboard/      # Tổng quan hệ thống
        │       ├── fields/         # Quản lý sân (Admin)
        │       ├── bookings/       # Quản lý đặt sân (Admin)
        │       ├── users/          # Quản lý người dùng (Admin)
        │       ├── revenue/        # Thống kê doanh thu
        │       ├── timeslots/      # Quản lý khung giờ
        │       └── services/       # Quản lý dịch vụ
        ├── routes/
        │   └── AppRoutes.js        # Định nghĩa toàn bộ routes
        ├── context/                # React Context (Auth,...)
        ├── hooks/                  # Custom hooks
        ├── services/               # Logic service layer
        ├── styles/                 # CSS toàn cục
        └── utils/                  # Tiện ích dùng chung
```

---


## 👤 Chức năng người dùng

### 🏠 Trang chủ (`/`)
- Hero banner với CTA đặt sân và xem danh sách sân.
- Thanh tìm kiếm nhanh theo khu vực, loại sân và ngày đặt.
- Hiển thị **6 sân nổi bật** lấy từ API.
- Giới thiệu quy trình đặt sân 4 bước.
- Khu vực tính năng nổi bật của hệ thống.

### 🏟️ Danh sách sân (`/fields`)
- Xem toàn bộ sân bóng đang hoạt động.
- Mỗi card hiển thị: ảnh sân, tên, loại sân, vị trí, giá/giờ, rating, số lượt đặt.

### 📋 Chi tiết sân (`/fields/:id`)
- Xem đầy đủ thông tin sân: mô tả, giờ hoạt động, số điện thoại, ảnh.
- Xem **danh sách đánh giá & nhận xét** từ người dùng đã đặt sân.
- Nút đặt sân trực tiếp từ trang chi tiết.

### 📅 Đặt sân (`/booking`)
- Chọn sân, ngày đặt, khung giờ trống (lấy từ timeslots API).
- Hệ thống tự động tính **giá theo khung giờ** (bảng giá dynamic).
- Thêm **dịch vụ kèm theo** (nước uống, bóng, thuê áo,...).
- Kiểm tra khung giờ đã bị đặt (`booked-slots` API) để tránh trùng lịch.
- Khi đặt thành công: `booking_count` sân tăng, timeslot chuyển `booked`.

### ✅ Xác nhận đặt sân (`/booking/success`)
- Hiển thị mã đặt sân (`#BKxxxxxxxx`).
- Thông tin tóm tắt lịch đặt.

### 🔍 Tra cứu lịch đặt (`/lookup`)
- Tra cứu không cần đăng nhập.
- Tìm theo: **số điện thoại**, **ngày đặt** hoặc **mã đặt sân**.

### 📒 Lịch sử đặt sân (`/my-bookings`)
- Xem toàn bộ lịch đặt của tài khoản đang đăng nhập.
- Xem chi tiết từng lịch đặt.

### 📄 Chi tiết lịch đặt (`/my-bookings/:id`)
- Thông tin đầy đủ: sân, ngày, giờ, tổng tiền, trạng thái.
- Xem dịch vụ đã đặt kèm theo.
- Gửi **đánh giá & xếp hạng** (nếu booking đã hoàn thành).

### 🔐 Đăng ký / Đăng nhập (`/register`, `/login`)
- Đăng ký bằng **họ tên, số điện thoại, email, mật khẩu**.
- Đăng nhập bằng **email hoặc số điện thoại + mật khẩu**.
- Mật khẩu được hash an toàn bằng `make_password` / `check_password` của Django.

### 👤 Hồ sơ cá nhân (`/profile`)
- Xem và chỉnh sửa thông tin: tên, email, số điện thoại.

---

## 🛡️ Chức năng Admin

Khu vực admin có giao diện riêng biệt (**Pitch & Pulse Admin Console**) — không hiển thị Navbar/Footer của user.

### 📊 Dashboard (`/admin/dashboard`)
- **Thống kê tổng quan**: tổng số sân, sân đang hoạt động, tổng lượt đặt.
- **Biểu đồ line chart** lượt đặt sân theo 7 ngày gần nhất (SVG custom).
- **Biểu đồ donut** tỉ lệ loại sân (5, 7, 11 người).
- **Bảng 5 lịch đặt gần nhất** với màu sắc trạng thái.

### 🏟️ Quản lý sân (`/admin/fields`)
- Xem danh sách toàn bộ sân bóng.
- **Thêm sân mới**: tên, loại sân, vị trí, địa chỉ, giá, giờ, ảnh, tọa độ.
- **Sửa thông tin sân**: cập nhật bất kỳ trường nào.
- **Xóa sân** khỏi hệ thống.
- Bật/tắt trạng thái hoạt động của sân.

### 📅 Quản lý đặt sân (`/admin/bookings`)
- Xem toàn bộ lịch đặt của tất cả người dùng.
- **Cập nhật trạng thái**: `Confirmed`, `Cancelled`, `Completed`.
- Sửa ngày, giờ, tổng tiền, dịch vụ kèm theo.
- **Xóa lịch đặt**.

### 👥 Quản lý người dùng (`/admin/users`)
- Xem danh sách toàn bộ khách hàng.
- **Sửa thông tin** người dùng (tên, email, điện thoại).
- **Xóa tài khoản** người dùng.

### ⏰ Quản lý khung giờ (`/admin/timeslots`)
- Xem danh sách khung giờ theo từng sân và ngày.
- **Tạo thủ công** khung giờ (sân, ngày, giờ bắt đầu/kết thúc, giá).
- **Tự động tạo khung giờ hàng loạt** (`generate-slots`) cho tất cả sân trong N ngày tới (tối đa 90 ngày) theo bảng giá:
  | Khung giờ   | Giá (VNĐ/giờ) |
  |-------------|---------------|
  | 06:00–08:00 | 80,000        |
  | 08:00–10:00 | 100,000       |
  | 14:00–16:00 | 150,000       |
  | 16:00–17:00 | 180,000       |
  | 17:00–18:00 | 200,000       |
  | 18:00–20:00 | 250,000–270,000 (cao điểm) |
  | 20:00–22:00 | 250,000       |
- **Xóa toàn bộ** khung giờ (reset hệ thống) hoặc xóa theo từng sân.
- Sửa, xóa từng khung giờ riêng lẻ.

### 🛎️ Quản lý dịch vụ (`/admin/services`)
- Xem danh sách dịch vụ thêm (nước uống, bóng, thuê áo,...).
- **Thêm / Sửa / Xóa** dịch vụ.
- Gắn dịch vụ với sân cụ thể (M2M).
- Quản lý ảnh, giá, danh mục, tồn kho.

### 💰 Thống kê doanh thu (`/admin/revenue`)
- Xem tổng doanh thu theo thời gian.

---
## 📌 Lưu ý

- Khu vực `/admin/*` không có xác thực cứng (chưa implement admin guard) — cần bổ sung trong môi trường production.
- Module `payments` đã được scaffold nhưng chưa triển khai logic.
- Khung giờ buổi trưa **10:00–14:00** bị bỏ qua trong hệ thống tự động tạo slot (ít người thuê).
- `rating_avg` của sân được **tự động tính lại** mỗi khi có đánh giá mới.
- Mỗi lần đặt sân thành công sẽ tự động **tăng `booking_count`** và **cập nhật trạng thái timeslot** thành `booked`.