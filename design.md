# Design Document - Football Booking System (Pitch & Pulse)

## 1. Tổng quan hệ thống

### 1.1 Mục tiêu
Hệ thống đặt sân bóng đá nhân tạo trực tuyến cho phép người dùng tìm kiếm, xem thông tin và đặt sân bóng nhanh chóng. Quản trị viên có thể quản lý toàn bộ dữ liệu hệ thống qua giao diện Admin Console chuyên biệt.

### 1.2 Mô hình kiến trúc
- **Kiến trúc**: Client-Server với REST API
- **Frontend**: React 18 SPA (Single Page Application)
- **Backend**: Django 4.2 với Django REST Framework
- **Database**: PostgreSQL
- **Deployment**: Render.com

### 1.3 Stack công nghệ

| Thành phần | Công nghệ | Phiên bản |
|-----------|-----------|----------|
| Frontend | React | 18.2.0 |
| Frontend Routing | React Router DOM | 6.14.1 |
| HTTP Client | Axios | 1.13.6 |
| Maps | Leaflet.js, React Leaflet | 1.9.4, 4.2.1 |
| Backend | Django | 4.2.7 |
| API Framework | Django REST Framework | - |
| Database | PostgreSQL | - |
| Auth | Custom session-based (UUID-based users) | - |
| CORS | django-cors-headers | - |
| Deployment | Render.com | - |

---

## 2. Kiến trúc Backend

### 2.1 Cấu trúc Django Apps

```
backend/
├── config/              # Django project configuration
│   ├── settings.py      # Project settings
│   ├── urls.py          # Root URL configuration
│   └── wsgi.py          # WSGI application
├── apps/
│   ├── users/           # User management & authentication
│   ├── fields/          # Football field management
│   ├── bookings/        # Booking management
│   ├── reviews/         # Field reviews & ratings
│   ├── timeslots/       # Time slot management
│   ├── servicesadd/     # Additional services (water, balls, etc.)
│   ├── notifications/   # System notifications
│   └── payments/        # Payment processing (scaffolded)
├── media/               # Uploaded images
├── utils/               # Utility functions
└── manage.py            # Django management script
```

### 2.2 Django Apps Description

#### users/
- **Chức năng**: Quản lý người dùng và xác thực
- **Models**: Admin, Customers
- **Key Features**:
  - **Admin Model**: UUID primary key, phone, password_hash, role, is_active
  - **Customers Model**: UUID primary key, liên kết với Admin (nullable), full_name, password_hash, phone, email, address
  - **Role System**: CUSTOMER, STAFF, ADMIN (enum choices)
  - **Account Status**: is_active boolean (active/locked)
  - Đăng ký với phone + fullname + email + password
  - Đăng nhập bằng email hoặc phone
  - Password hashing với Django's `make_password`/`check_password`
  - Session-based authentication (custom implementation)

#### fields/
- **Chức năng**: Quản lý thông tin sân bóng
- **Models**: FieldTypes, FootballFields, FieldSchedules
- **Key Features**:
  - **FieldTypes**: Định nghĩa loại sân (Sân 5, Sân 7, Sân 11)
  - **FootballFields**: UUID primary key, field_name, field_type (FK), location, price_per_hour, image, is_available
  - **Additional Fields**: booking_count, rating_avg, description, phone, open_time, close_time, status, address, latitude, longitude, peak_price, off_peak_price
  - **FieldSchedules**: Lịch hoạt động của sân (work_date, start_time, end_time)
  - Tọa độ Latitude/Longitude cho bản đồ
  - Rating trung bình (`rating_avg`) và số lượt đặt (`booking_count`)
  - Trạng thái hoạt động (`is_available`)
  - Hình ảnh sân (upload_to='fields/')
  - Method `to_dict()` để trả JSON với image URL đầy đủ

#### bookings/
- **Chức năng**: Quản lý đặt sân
- **Models**: Bookings, BookingLogs
- **Key Features**:
  - **Bookings**: UUID primary key, customer (FK to Customers), field (FK to FootballFields), booking_date, start_time, end_time, total_price, status, notes
  - **BookingLogs**: Log các thay đổi của booking (action, performed_by, old_value, new_value, description, timestamp)
  - Tự động tăng `booking_count` của sân khi đặt thành công
  - Tự động cập nhật status timeslot → 'booked' khi đặt
  - Mở lại timeslot khi sửa/xóa booking
  - Mã đặt sân: UUID prefix (8 ký tự đầu) cho display
  - Liên kết với BookingServices qua M2M (qua BookingServices model)
  - Trạng thái: Confirmed, Cancelled, Completed, Pending, Checked_in

#### reviews/
- **Chức năng**: Đánh giá và xếp hạng sân
- **Models**: Reviews
- **Key Features**:
  - **Reviews**: AutoIncrement primary key, user (FK to Customers), field (FK to FootballFields), booking (OneToOne to Bookings), rating, comment, created_at
  - Liên kết với User, Field, Booking
  - Rating (1-5 sao) và comment
  - Tự động cập nhật `rating_avg` của sân khi có đánh giá mới (sử dụng raw SQL)
  - Kiểm tra trùng review theo booking_id

#### timeslots/
- **Chức năng**: Quản lý khung giờ sân
- **Models**: TimeSlots
- **Key Features**:
  - **TimeSlots**: UUID primary key, field (FK to FootballFields), slot_date, start_time, end_time, price, status ('available', 'booked')
  - Khung giờ theo từng sân và ngày
  - Giá theo khung giờ (dynamic pricing theo HOURLY_PRICES dict)
  - Trạng thái: available, booked
  - Tự động tạo hàng loạt cho N ngày tới (max 90 ngày)
  - Unique constraint: (field, slot_date, start_time)
  - Dynamic pricing bảng giờ:
    - 06:00-08:00: 80,000 VNĐ
    - 08:00-10:00: 100,000 VNĐ
    - 14:00-15:00: 150,000 VNĐ
    - 15:00-16:00: 150,000 VNĐ
    - 16:00-17:00: 180,000 VNĐ
    - 17:00-18:00: 200,000 VNĐ
    - 18:00-19:00: 250,000 VNĐ
    - 19:00-20:00: 270,000 VNĐ (cao điểm)
    - 20:00-21:00: 270,000 VNĐ
    - 21:00-22:00: 250,000 VNĐ

#### servicesadd/
- **Chức năng**: Quản lý dịch vụ thêm
- **Models**: ServicesAdd, BookingServices
- **Key Features**:
  - **ServicesAdd**: UUID primary key, name, price, description, image (upload_to='services/'), category, stock, is_active
  - **M2M Relationship**: fields (ManyToMany to FootballFields via service_field_mapping table)
  - **BookingServices**: UUID primary key, booking (FK to Bookings), service (FK to ServicesAdd), quantity, total_price, status, shoe_size, created_at
  - Ví dụ: nước uống, bóng, thuê áo
  - Shoe size cho dịch vụ thuê giày
  - Gắn dịch vụ với sân cụ thể

#### notifications/
- **Chức năng**: Thông báo hệ thống
- **Models**: (scaffolded, chưa triển khai logic)
- **Key Features**: Đã có app nhưng chưa có models/views đầy đủ

#### payments/
- **Chức năng**: Xử lý thanh toán
- **Trạng thái**: Đã scaffold nhưng chưa triển khai logic
- **Models**: (scaffolded, chưa triển khai logic)

### 2.3 Database Schema

#### Admin Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- phone (CharField, unique=True, max_length=15)
- password_hash (TextField)
- role (TextField)
- is_active (BooleanField, nullable)
- created_at (DateTimeField, nullable)
```

#### Customers Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- user (ForeignKey to Admin, nullable, db_column='user_id')
- full_name (CharField, max_length=150)
- password_hash (TextField, nullable)
- phone (CharField, max_length=15, nullable)
- email (CharField, max_length=100, nullable)
- address (TextField, nullable)
- created_at (DateTimeField, nullable)
- role (CharField, choices=[CUSTOMER, STAFF, ADMIN], default=CUSTOMER)
- is_active (BooleanField, default=True)
```

#### FieldTypes Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- name (CharField, max_length=100)
- description (TextField, nullable)
```

#### FootballFields Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- field_name (CharField, max_length=150)
- field_type (ForeignKey to FieldTypes, nullable)
- location (TextField, nullable)
- price_per_hour (DecimalField, max_digits=10, decimal_places=2, nullable)
- image (ImageField, upload_to='fields/', nullable)
- is_available (BooleanField, default=True)
- created_at (DateTimeField, auto_now_add=True)
- booking_count (IntegerField, default=0, nullable)
- description (TextField, nullable)
- rating_avg (DecimalField, max_digits=2, decimal_places=1, nullable)
- phone (CharField, max_length=20, nullable)
- open_time (TimeField, nullable)
- close_time (TimeField, nullable)
- status (CharField, max_length=50, nullable)
- address (TextField, nullable)
- latitude (DecimalField, max_digits=9, decimal_places=6, nullable)
- longitude (DecimalField, max_digits=9, decimal_places=6, nullable)
- peak_price (DecimalField, max_digits=10, decimal_places=2, nullable)
- off_peak_price (DecimalField, max_digits=10, decimal_places=2, nullable)
- updated_at (DateTimeField, nullable)
```

#### FieldSchedules Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- field (ForeignKey to FootballFields, nullable)
- work_date (DateField)
- start_time (TimeField)
- end_time (TimeField)
- created_at (DateTimeField, nullable)
```

#### Bookings Model
```python
- id (UUIDField, primary_key)
- customer (ForeignKey to Customers)
- field (ForeignKey to FootballFields)
- booking_date (DateField)
- start_time (TimeField)
- end_time (TimeField)
- total_price (DecimalField, max_digits=10, decimal_places=2, nullable)
- status (TextField, nullable) - Confirmed, Cancelled, Completed, Pending, Checked_in
- notes (TextField, nullable)
- created_at (DateTimeField, nullable)
- updated_at (DateTimeField, nullable)
```

#### BookingLogs Model
```python
- id (UUIDField, primary_key)
- booking (ForeignKey to Bookings, nullable)
- action (CharField, max_length=50, nullable)
- performed_by (CharField, max_length=150, nullable)
- old_value (TextField, nullable)
- new_value (TextField, nullable)
- description (TextField, nullable)
- timestamp (DateTimeField, nullable)
```

#### TimeSlots Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- field (ForeignKey to FootballFields, nullable)
- slot_date (DateField)
- start_time (TimeField)
- end_time (TimeField)
- price (DecimalField, max_digits=10, decimal_places=2)
- status (CharField, max_length=20, default='available')
- created_at (DateTimeField, auto_now_add=True, nullable)
- unique_together: (field, slot_date, start_time)
```

#### Reviews Model
```python
- id (AutoField, primary_key) - integer
- user (ForeignKey to Customers, db_column='user_id')
- field (ForeignKey to FootballFields, db_column='field_id')
- booking (OneToOne to Bookings, db_column='booking_id', nullable)
- rating (IntegerField)
- comment (TextField, nullable)
- created_at (DateTimeField)
```

#### ServicesAdd Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- name (CharField, max_length=100)
- price (DecimalField, max_digits=10, decimal_places=2)
- description (TextField, nullable)
- image (ImageField, upload_to='services/', nullable)
- category (CharField, max_length=50, nullable)
- stock (IntegerField, default=0)
- is_active (BooleanField, default=True)
- created_at (DateTimeField, auto_now_add=True)
- fields (ManyToMany to FootballFields, related_name='services', db_table='service_field_mapping')
```

#### BookingServices Model
```python
- id (UUIDField, primary_key, default=uuid.uuid4)
- booking (ForeignKey to Bookings, related_name='booking_services', nullable)
- service (ForeignKey to ServicesAdd, related_name='service_bookings', nullable)
- quantity (IntegerField, default=1)
- total_price (DecimalField, max_digits=10, decimal_places=2, nullable)
- status (CharField, max_length=20, default='active')
- shoe_size (CharField, max_length=10, nullable)
- created_at (DateTimeField, auto_now_add=True)
```

### 2.4 API Endpoints

#### Authentication (Users)
- `POST /api/users/register/` - Đăng ký user mới
- `POST /api/users/login/` - Đăng nhập (email hoặc phone + password)
- `GET /api/users/` - Danh sách tất cả users
- `GET /api/users/profile/?user_id=<uuid>` - Lấy thông tin profile
- `PUT /api/users/<uuid:user_id>/update/` - Cập nhật user
- `PATCH /api/users/<uuid:user_id>/toggle-status/` - Khóa/mở khóa tài khoản
- `DELETE /api/users/<uuid:user_id>/delete/` - Xóa user

#### Fields
- `GET /api/football-fields/` - Danh sách tất cả sân (query: ?show_all=true để lấy cả unavailable)
- `GET /api/football-fields/<uuid:id>/` - Chi tiết sân (tính avg rating từ reviews)
- `POST /api/football-fields/create/` - Thêm sân (Admin, multipart/form-data)
- `PUT /api/football-fields/<uuid:id>/update/` - Cập nhật sân (Admin, JSON body)
- `DELETE /api/football-fields/<uuid:id>/delete/` - Xóa sân (Admin)
- `GET /api/seed-field-types/` - Seed field types (Sân 5, Sân 7, Sân 11)
- `GET /api/check-media/` - Debug media file check
- `GET /api/test-image/` - Test image serving
- `GET /api/debug-media/` - Debug media folder
- `GET /api/debug-path/` - Debug paths

#### Bookings
- `POST /api/bookings/create/` - Tạo đặt sân mới
  - Body: customer_id, field_id, booking_date, start_time, end_time, total_price, services[]
  - Auto: tăng booking_count, update timeslot status → booked, create BookingServices
- `GET /api/bookings/` - Danh sách tất cả lịch đặt
- `GET /api/bookings/user/<uuid:user_id>/` - Danh sách lịch đặt của user
- `GET /api/bookings/lookup/` - Tra cứu lịch đặt (không cần auth)
  - Query: phone, date, booking_id
- `GET /api/bookings/booked-slots/` - Lấy danh sách khung giờ đã đặt
  - Query: field_id, date, exclude_booking_id (để edit)
- `PUT /api/bookings/<uuid:booking_id>/update/` - Cập nhật lịch đặt
  - Auto: mở lại timeslot cũ, khóa timeslot mới, update BookingServices
- `DELETE /api/bookings/<uuid:booking_id>/delete/` - Xóa lịch đặt
  - Auto: mở lại timeslot

#### Timeslots
- `GET /api/timeslots/` - Danh sách tất cả khung giờ
- `POST /api/timeslots/` - Tạo khung giờ thủ công
- `PUT /api/timeslots/<uuid:pk>/` - Cập nhật khung giờ
- `DELETE /api/timeslots/<uuid:pk>/` - Xóa khung giờ
- `POST /api/timeslots/generate-slots/` - Tự động tạo hàng loạt (max 90 ngày)
  - Body: days (int)
- `DELETE /api/timeslots/delete-all/` - Xóa toàn bộ khung giờ
  - Query: field_id (optional - nếu có thì xóa theo sân)
- `GET /api/timeslots/get-by-field/` - Khung giờ theo sân và ngày
  - Query: field_id, date

#### Reviews
- `GET /api/reviews/<str:field_id>/` - Đánh giá của sân
- `POST /api/reviews/create/` - Tạo đánh giá mới
  - Body: booking_id, rating, comment, user_id
  - Auto: tính lại rating_avg của sân (raw SQL)

#### Services
- `GET /api/services/list/` - Danh sách dịch vụ
  - Query: category, admin=true (lấy all), field_id (lấy theo sân)
- `POST /api/services/list/` - Thêm dịch vụ (Admin, multipart/form-data)
  - Body: name, price, description, image, category, stock, is_active, field_ids[]
- `GET /api/services/list/<uuid:pk>/` - Chi tiết dịch vụ
- `PUT /api/services/list/<uuid:pk>/` - Cập nhật dịch vụ (Admin, multipart/form-data)
- `DELETE /api/services/list/<uuid:pk>/` - Xóa dịch vụ (Admin)
- `POST /api/services/booking-services/add/` - Thêm dịch vụ vào booking
- `GET /api/services/booking-services/<uuid:booking_id>/` - Lấy dịch vụ của booking

#### Notifications
- (Đã scaffold nhưng chưa triển khai logic)

#### Media Files
- `/media/<path>` - Serve media files (Django static serve)

### 2.5 Dynamic Pricing Strategy

Bảng giá theo khung giờ (VNĐ/giờ) - được định nghĩa trong `HOURLY_PRICES` dict:

| Giờ bắt đầu | Giá (VNĐ) |
|-------------|-----------|
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

**Lưu ý**: Khung giờ 10:00-14:00 không được tạo (ít người thuê)

### 2.6 Authentication & Authorization

- **Phương thức**: Custom session-based authentication (UUID-based users)
- **Password Hashing**: Django's `make_password`/`check_password` (PBKDF2 + SHA256)
- **User Models**:
  - `Admin`: Base model với phone, password_hash, role
  - `Customers`: Liên kết với Admin (nullable), có role system (CUSTOMER, STAFF, ADMIN)
- **Login**: Email hoặc Phone + Password
- **Role System**:
  - CUSTOMER: Khách hàng thường
  - STAFF: Nhân viên
  - ADMIN: Quản trị viên
- **Account Status**: `is_active` boolean (active/locked)
- **Frontend Auth Guard**: ProtectedRoute component với role-based access control
- **Admin Routes**: Yêu cầu role admin hoặc staff
- **Session Management**: Django sessions middleware (custom implementation, không dùng Django's built-in User model)

---

## 3. Kiến trúc Frontend

### 3.1 Cấu trúc React Project

```
frontend/src/
├── api/                    # Axios API calls
│   ├── auth.js
│   ├── fields.js
│   ├── bookings.js
│   ├── timeslots.js
│   ├── reviews.js
│   └── services.js
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
│   ├── Lookup/             # Tra cứu lịch đặt
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
│   └── AuthContext.js
├── hooks/                  # Custom hooks
├── services/               # Logic service layer
├── styles/                 # CSS toàn cục
├── utils/                  # Tiện ích dùng chung
├── config.js               # Cấu hình API base URL
├── App.js                  # Main App component
└── index.js                # Entry point
```

### 3.2 Routing Structure

#### Public Routes
- `/` - Trang chủ (Home)
- `/fields` - Danh sách sân (Fields)
- `/fields/:id` - Chi tiết sân (FieldDetail)
- `/lookup` - Tra cứu lịch đặt (Lookup) - không cần đăng nhập
- `/login` - Đăng nhập (Login)
- `/register` - Đăng ký (Register)

#### Protected Routes (User - roles: customer, admin, staff)
- `/booking` - Đặt sân (Booking)
- `/booking/success` - Xác nhận đặt sân thành công (BookingSuccess)
- `/my-bookings` - Lịch sử đặt sân (MyBookings)
- `/my-bookings/:id` - Chi tiết lịch đặt (BookingDetail)
- `/profile` - Thông tin cá nhân (Profile) - any authenticated user

#### Admin/Staff Routes (roles: admin, staff)
- `/admin/dashboard` - Dashboard thống kê (Dashboard)
- `/admin/fields` - Quản lý sân (AdminFields)
- `/admin/bookings` - Quản lý đặt sân (Bookings)
- `/admin/bookings/calendar` - Lịch đặt dạng calendar (BookingCalendar)
- `/admin/timeslots` - Quản lý khung giờ (Timeslots)
- `/admin/services` - Quản lý dịch vụ (AdminServices)

#### Admin Only Routes (role: admin only)
- `/admin/revenue` - Thống kê doanh thu (Revenue)
- `/admin/users` - Quản lý người dùng (Users)
- `/admin/settings` - Cài đặt hệ thống (AdminSettings)

**Role Constants**: ADMIN_ROLES = ["admin", "staff"]

### 3.3 State Management

- **Auth Context**: Quản lý trạng thái đăng nhập, user info
- **Local State**: React useState cho component state
- **No Global State Library**: Không sử dụng Redux/Context API phức tạp

### 3.4 API Layer

- **Axios Interceptors**: Xử lý request/response
- **Base URL**: Được cấu hình trong `config.js`
- **Error Handling**: Centralized error handling
- **Session Management**: Cookies-based session

### 3.5 Components Architecture

#### Layout Components
- **Navbar**: Thanh điều hướng với logo, menu, auth buttons
- **Footer**: Footer với thông tin liên hệ, links
- **ProtectedRoute**: HOC bảo vệ routes cần authentication

#### Feature Components
- **FieldCard**: Card hiển thị thông tin sân với image, rating, price
- **BookingForm**: Form đặt sân với chọn ngày, khung giờ, dịch vụ
- **ServiceSection**: Hiển thị và chọn dịch vụ kèm theo

#### Page Components
- **Home**: Hero banner, featured fields, search, features section
- **Fields**: Grid list tất cả sân với filters
- **FieldDetail**: Chi tiết sân với map (Leaflet), reviews
- **Booking**: Multi-step booking form
- **Dashboard (Admin)**: Charts, statistics tables

### 3.6 Map Integration

- **Library**: Leaflet.js + React Leaflet
- **Map Provider**: OpenStreetMap
- **Geocoding**: Nominatim API (tự động lấy tọa độ từ địa chỉ)
- **Features**:
  - Hiển thị vị trí sân trên map
  - Live map preview khi admin thêm/sửa sân
  - Nút "Chỉ đường" qua Google Maps

---

## 4. Data Flow

### 4.1 Booking Flow

```
1. User chọn sân (FieldDetail page)
   ↓
2. Click "Đặt sân" → Navigate to /booking
   ↓
3. BookingForm component:
   - Lấy danh sách sân từ API
   - User chọn sân, ngày
   - Lấy timeslots available từ API
   - User chọn khung giờ
   - Hiển thị giá theo dynamic pricing
   - User chọn dịch vụ kèm theo
   ↓
4. Submit form → POST /api/bookings/
   ↓
5. Backend xử lý:
   - Validate availability
   - Tính tổng tiền
   - Tạo booking record
   - Cập nhật timeslot status → booked
   - Tăng booking_count của sân
   ↓
6. Redirect to /booking/success
   ↓
7. Hiển thị mã đặt sân #BKxxxxxxxx
```

### 4.2 Review Flow

```
1. User xem lịch đặt (MyBookings → BookingDetail)
   ↓
2. Nếu booking đã completed → Hiển thị form đánh giá
   ↓
3. User nhập rating (1-5) và comment
   ↓
4. Submit → POST /api/reviews/
   ↓
5. Backend xử lý:
   - Tạo review record
   - Tính lại rating_avg của sân
   ↓
6. Cập nhật UI với review mới
```

### 4.3 Admin - Generate Timeslots Flow

```
1. Admin navigate to /admin/timeslots
   ↓
2. Nhập số ngày (max 90)
   ↓
3. Click "Tự động tạo khung giờ"
   ↓
4. POST /api/timeslots/generate-slots/
   ↓
5. Backend xử lý:
   - Loop qua tất cả sân active
   - Loop qua N ngày tới
   - Tạo timeslots theo bảng giá (bỏ qua 10:00-14:00)
   ↓
6. Return summary: số timeslots đã tạo
```

---

## 5. Security Considerations

### 5.1 Current Implementation
- Password hashing với Django's PBKDF2 + SHA256
- Session-based authentication
- CORS configured for development
- Environment variables for sensitive data (SECRET_KEY, DATABASE_URL)

### 5.2 Areas for Improvement (Production)
- **Admin Authentication**: Frontend đã có ProtectedRoute với role-based access control, nhưng backend cần thêm middleware/API-level authorization
- **HTTPS**: Enforce HTTPS in production
- **CSRF Protection**: Mặc định disabled (@csrf_exempt), cần enable cho production
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Input Validation**: Server-side validation cho tất cả inputs
- **SQL Injection Prevention**: Một số endpoint sử dụng raw SQL (reviews/views.py), cần parameterized queries
- **XSS Prevention**: Sanitize user-generated content
- **File Upload Security**: Validate file types, sizes cho uploads
- **Session Security**: Secure cookie flags, session timeout
- **UUID vs Integer ID**: Mixed use of UUID và integer ID (Reviews uses AutoField), cần standardize

---

## 6. Deployment Architecture

### 6.1 Production Environment
- **Platform**: Render.com
- **Backend**: Django web service (Gunicorn)
- **Frontend**: React static site
- **Database**: PostgreSQL (Render managed)
- **Media Storage**: Render disk (consider migrating to S3 for production)
- **Environment Variables**: Managed via Render dashboard

### 6.2 Build Process
- **Frontend**: `npm run build` → static files
- **Backend**: Collectstatic → serve static files via Django
- **Database**: Migrations applied on deploy

### 6.3 URLs
- **Frontend**: https://football-booking-system-8m77.onrender.com
- **Backend API**: https://football-booking-system-8m77.onrender.com/api/
- **Database**: Render PostgreSQL (internal)

---

## 7. Future Enhancements

### 7.1 Payment Integration
- Integrate payment gateway (MoMo, VNPay, Stripe)
- Update payment module with actual logic
- Handle payment callbacks and webhooks

### 7.2 Real-time Features
- WebSocket integration for real-time booking updates
- Live notifications for booking status changes
- Real-time timeslot availability

### 7.3 Mobile App
- React Native or Flutter mobile app
- Push notifications
- Offline booking capability

### 7.4 Advanced Admin Features
- Advanced analytics and reporting
- Export data (CSV, Excel)
- Bulk operations
- Audit logs

### 7.5 User Experience
- Email notifications for booking confirmations
- SMS notifications
- Booking reminders
- Cancellation policy management

### 7.6 Performance
- Caching layer (Redis)
- CDN for static assets
- Database query optimization
- Image optimization and lazy loading

---

## 8. Development Guidelines

### 8.1 Code Style
- **Backend**: PEP 8 Python style guide
- **Frontend**: ESLint + Prettier (standard React conventions)
- **Git**: Feature branch workflow, descriptive commit messages

### 8.2 Testing
- **Backend**: Django TestCase + pytest
- **Frontend**: React Testing Library + Jest
- **API**: Integration tests for all endpoints

### 8.3 Documentation
- API documentation with Swagger/OpenAPI
- Component documentation with Storybook (optional)
- Inline code comments for complex logic

---

## 9. Known Limitations

1. **Backend Authorization**: Frontend có ProtectedRoute với role-based access, nhưng backend chưa có middleware/API-level authorization
2. **CSRF Protection**: Mặc định sử dụng @csrf_exempt decorators, cần enable cho production
3. **Payment Module**: Đã scaffold nhưng chưa triển khai logic
4. **Timeslot Generation**: Bỏ qua khung giờ 10:00-14:00 (hardcoded trong HOURLY_PRICES)
5. **Media Storage**: Sử dụng Render disk (không scalable cho production)
6. **Notifications**: Module notifications đã scaffold nhưng chưa triển khai logic
7. **Real-time**: Không có real-time updates cho availability
8. **Concurrency**: Không có locking mechanism cho timeslot booking (potential race condition)
9. **Mixed ID Types**: Reviews sử dụng AutoField (integer), các model khác dùng UUID - cần standardize
10. **Raw SQL Usage**: Một số endpoint trong reviews/views.py sử dụng raw SQL cursor, cần parameterized queries

---

## 10. Appendix

### 10.1 Environment Variables

#### Backend (.env)
```
SECRET_KEY=<django-secret-key>
DEBUG=True/False
DATABASE_URL=<postgresql-url>
ALLOWED_HOSTS=localhost,127.0.0.1,domain.com
```

#### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:8000/api
```

### 10.2 Useful Commands

#### Backend
```bash
python manage.py runserver          # Start dev server
python manage.py makemigrations     # Create migrations
python manage.py migrate            # Apply migrations
python manage.py createsuperuser    # Create admin user
python manage.py collectstatic      # Collect static files
```

#### Frontend
```bash
npm start                           # Start dev server
npm run build                       # Build for production
npm test                            # Run tests
```

---

**Document Version**: 1.0
**Last Updated**: 2026-10-05
**Author**: Devin AI
