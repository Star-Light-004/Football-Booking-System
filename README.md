# ⚽ Football Booking System — Pitch & Pulse

Hệ thống đặt sân bóng đá nhân tạo trực tuyến, cho phép người dùng tìm kiếm, xem thông tin và đặt sân bóng nhanh chóng. Quản trị viên có thể quản lý toàn bộ dữ liệu hệ thống qua giao diện Admin Console chuyên biệt.

---

## 🗂️ Mục lục

- [Tổng quan công nghệ](#-tổng-quan-công-nghệ)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Chức năng người dùng](#-chức-năng-người-dùng)
- [Chức năng Admin](#-chức-năng-admin)
- [Lưu ý](#-lưu-ý)

---

## 🛠️ Tổng quan công nghệ

| Thành phần   | Công nghệ                                    |
|--------------|----------------------------------------------|
| **Frontend** | React 18, React Router DOM v6, Axios         |
| **Backend**  | Django 4.2, Django REST Framework            |
| **Database** | PostgreSQL                                   |
| **Auth**     | Custom session-based (UUID users, password hashing) |
| **Media**    | Django Media Files (ảnh sân, dịch vụ)        |
| **Bản đồ**   | Leaflet.js, OpenStreetMap (Geocoding)        |
| **CORS**     | django-cors-headers                          |
| **Timezone** | Asia/Ho_Chi_Minh                             |

---

## 📁 Cấu trúc dự án

```
football-booking-system/
├── backend/                        # Django Backend
│   ├── apps/
│   │   ├── bookings/               # Quản lý đặt sân (Bookings, BookingLogs)
│   │   ├── fields/                 # Quản lý sân bóng (FieldTypes, FootballFields, FieldSchedules)
│   │   ├── users/                  # Quản lý người dùng & xác thực (Admin, Customers)
│   │   ├── reviews/                # Đánh giá sân bóng (Reviews)
│   │   ├── timeslots/              # Khung giờ sân (TimeSlots)
│   │   ├── servicesadd/            # Dịch vụ thêm (ServicesAdd, BookingServices)
│   │   ├── notifications/          # Thông báo hệ thống (scaffold)
│   │   └── payments/               # Thanh toán (scaffold)
│   ├── config/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── media/                      # File ảnh upload
│   ├── utils/                      # Utility functions
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
        │       ├── BookingCalendar/ # Lịch đặt dạng calendar
        │       ├── users/          # Quản lý người dùng (Admin)
        │       ├── revenue/        # Thống kê doanh thu
        │       ├── timeslots/      # Quản lý khung giờ
        │       ├── services/       # Quản lý dịch vụ
        │       └── settings/      # Cài đặt hệ thống
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
- **Bản đồ định vị thông minh (Leaflet)**: tự động hiển thị vị trí sân và nút chỉ đường qua Google Maps.
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

**Phân quyền truy cập**:
- **Admin**: Truy cập tất cả chức năng admin
- **Staff**: Truy cập Dashboard, Fields, Bookings, Timeslots, Services
- **Customer**: Không truy cập khu vực admin

### 📊 Dashboard (`/admin/dashboard`)
- **Thống kê tổng quan**: tổng số sân, sân đang hoạt động, tổng lượt đặt.
- **Biểu đồ line chart** lượt đặt sân theo 7 ngày gần nhất (SVG custom).
- **Biểu đồ donut** tỉ lệ loại sân (5, 7, 11 người).
- **Bảng 5 lịch đặt gần nhất** với màu sắc trạng thái.

### 🏟️ Quản lý sân (`/admin/fields`)
- Xem danh sách toàn bộ sân bóng.
- **Thêm/Sửa sân**: tên, loại sân, vị trí, địa chỉ, giá, giờ, ảnh, tọa độ.
- **Định vị bản đồ tự động**: Gõ địa chỉ sân, hệ thống sẽ tự động bắt tọa độ (Latitude, Longitude) thông qua Nominatim API kèm theo Live Map Preview.
- **Xóa sân** khỏi hệ thống.
- Bật/tắt trạng thái hoạt động của sân.

### 📅 Quản lý đặt sân (`/admin/bookings`)
- Xem toàn bộ lịch đặt của tất cả người dùng.
- **Cập nhật trạng thái**: `Confirmed`, `Cancelled`, `Completed`, `Pending`, `Checked_in`.
- Sửa ngày, giờ, tổng tiền, dịch vụ kèm theo.
- **Xóa lịch đặt**.

### 📆 Lịch đặt dạng Calendar (`/admin/bookings/calendar`)
- Xem lịch đặt theo dạng calendar.
- Dễ dàng quan sát các khung giờ đã đặt.

### 👥 Quản lý người dùng (`/admin/users`) - Chỉ Admin
- Xem danh sách toàn bộ khách hàng.
- **Sửa thông tin** người dùng (tên, email, điện thoại, role).
- **Khóa/mở khóa tài khoản** (toggle is_active).
- **Xóa tài khoản** người dùng.

### ⏰ Quản lý khung giờ (`/admin/timeslots`)
- Xem danh sách khung giờ theo từng sân và ngày.
- **Tạo thủ công** khung giờ (sân, ngày, giờ bắt đầu/kết thúc, giá).
- **Tự động tạo khung giờ hàng loạt** (`generate-slots`) cho tất cả sân trong N ngày tới (tối đa 90 ngày) theo bảng giá:
  | Giờ bắt đầu | Giá (VNĐ/giờ) |
  |-------------|---------------|
  | 06:00 | 80,000 |
  | 07:00 | 80,000 |
  | 08:00 | 100,000 |
  | 09:00 | 100,000 |
  | 14:00 | 150,000 |
  | 15:00 | 150,000 |
  | 16:00 | 180,000 |
  | 17:00 | 200,000 |
  | 18:00 | 250,000 |
  | 19:00 | 270,000 (cao điểm) |
  | 20:00 | 270,000 (cao điểm) |
  | 21:00 | 250,000 |
- **Lưu ý**: Khung giờ 10:00-14:00 không được tạo (ít người thuê)
- **Xóa toàn bộ** khung giờ (reset hệ thống) hoặc xóa theo từng sân.
- Sửa, xóa từng khung giờ riêng lẻ.

### 🛎️ Quản lý dịch vụ (`/admin/services`)
- Xem danh sách dịch vụ thêm (nước uống, bóng, thuê áo,...).
- **Thêm / Sửa / Xóa** dịch vụ.
- Gắn dịch vụ với sân cụ thể (M2M).
- Quản lý ảnh, giá, danh mục, tồn kho.

### 💰 Thống kê doanh thu (`/admin/revenue`) - Chỉ Admin
- Xem tổng doanh thu theo thời gian.

### ⚙️ Cài đặt hệ thống (`/admin/settings`) - Chỉ Admin
- Cấu hình hệ thống.
- Quản lý các thiết lập chung.

---
## 📌 Lưu ý

- Khu vực `/admin/*` đã có xác thực qua ProtectedRoute component với role-based access control (Admin/Staff).
- Module `payments` và `notifications` đã được scaffold nhưng chưa triển khai logic đầy đủ.
- Khung giờ buổi trưa **10:00–14:00** bị bỏ qua trong hệ thống tự động tạo slot (ít người thuê).
- `rating_avg` của sân được **tự động tính lại** mỗi khi có đánh giá mới (sử dụng raw SQL).
- Mỗi lần đặt sân thành công sẽ tự động **tăng `booking_count`** và **cập nhật trạng thái timeslot** thành `booked`.
- Khi sửa/xóa booking, timeslot sẽ được tự động mở lại status thành `available`.
- Dịch vụ kèm theo được quản lý qua model `BookingServices` (không phải M2M trực tiếp giữa Booking và Service).
- Model Reviews sử dụng AutoIncrement ID (integer) thay vì UUID.