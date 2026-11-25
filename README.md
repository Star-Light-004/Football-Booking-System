# ⚽ Xây dựng hệ thống quản lý sân bóng đá nhân tạo Hải Châu, Đà Nẵng
> **Hệ thống đặt sân bóng đá nhân tạo và quản lý vận hành cơ sở thể thao trực tuyến toàn diện**  
> *Được phát triển với kiến trúc RESTful API đa ứng dụng (Django REST Framework), Single Page Application (React 18), Hệ quản trị CSDL quan hệ PostgreSQL, Cổng thanh toán VietQR tự động qua SePay Webhook và Ma trận phân quyền động 9 vai trò (RBAC).*

---

## 🗂️ Mục lục

- [1. Giới thiệu tổng quan](#1-giới-thiệu-tổng-quan)
- [2. Điểm nổi bật & Công nghệ sử dụng](#2-điểm-nổi-bật--công-nghệ-sử-dụng)
- [3. Cấu trúc thư mục dự án](#3-cấu-trúc-thư-mục-dự-án)
- [4. Hệ thống phân quyền đa cấp 9 vai trò (RBAC)](#4-hệ-thống-phân-quyền-đa-cấp-9-vai-trò-rbac)
- [5. Chi tiết chức năng Cổng Khách hàng (Customer Portal)](#5-chi-tiết-chức-năng-cổng-khách-hàng-customer-portal)
- [6. Chi tiết chức năng Quản trị & Vận hành (Sân Bóng Hải Châu Admin Console)](#6-chi-tiết-chức-năng-quản-trị--vận-hành-pitch--pulse-admin-console)
- [7. Quy trình thanh toán VietQR & Cơ chế Webhook SePay](#7-quy-trình-thanh-toán-vietqr--cơ-chế-webhook-sepay)
- [8. Cơ chế đồng bộ thời gian thực & Thông báo động](#8-cơ-chế-đồng-bộ-thời-gian-thực--thông-báo-động)
- [9. Quy tắc nghiệp vụ cốt lõi](#9-quy-tắc-nghiệp-vụ-cốt-lõi)
- [10. Hướng dẫn cài đặt & Khởi chạy hệ thống](#10-hướng-dẫn-cài-đặt--khởi-chạy-hệ-thống)

---

## 1. Giới thiệu tổng quan

**Sân Bóng Đá Hải Châu, Đà Nẵng** là giải pháp công nghệ toàn diện giải quyết triệt để hai bài toán lớn trong ngành thể thao phong trào:
1. **Dành cho người chơi bóng đá (Khách hàng):** Tìm kiếm sân cỏ nhân tạo đạt chuẩn gần nhất, tra cứu lịch trống theo thời gian thực, đặt nhiều ca thi đấu cùng lúc (Group Booking), chọn dịch vụ kèm size giày, áp dụng voucher ưu đãi, thanh toán cọc/toàn bộ qua mã **VietQR Napas 24/7** tự động và tra cứu vé điện tử có mã **QR Check-in** tại quầy không cần đăng nhập.
2. **Dành cho ban quản lý & vận hành cơ sở thể thao (Enterprise Admin):** Cung cấp giao diện điều hành chuyên biệt với **hệ thống phân quyền 9 vai trò**, lịch biểu trực quan dạng Calendar, giám sát vệ sinh sân sau từng ca đá, tiếp nhận và xử lý sự cố thiết bị/đèn chiếu sáng, quản lý kho đồ thất lạc (Lost & Found), tự động đối soát giao dịch ngân hàng qua Webhook và báo cáo phân tích doanh thu tài chính chuyên sâu.

---

## 2. Điểm nổi bật & Công nghệ sử dụng

### 🛠️ Ngăn xếp công nghệ (Technology Stack)

| Thành phần | Công nghệ / Thư viện | Phiên bản | Vai trò & Mục đích sử dụng |
|---|---|---|---|
| **Frontend** | ReactJS | 18.2.0 | Kiến trúc ứng dụng trang đơn (Single Page Application - SPA) |
| **Routing** | React Router DOM | 6.14.1 | Quản lý định tuyến và bảo vệ route theo quyền (`ProtectedRoute`) |
| **HTTP Client** | Axios | 1.13.6 | Gọi API, gắn tự động header `X-User-Role`, `X-User-Id` qua Interceptor |
| **Bản đồ GIS** | Leaflet & React-Leaflet | 1.9.4 / 4.2.1 | Bản đồ tương tác, tự động bắt tọa độ qua OpenStreetMap / Nominatim |
| **Backend** | Python / Django | 4.2.7 | Khung kiến trúc Backend hướng module đa ứng dụng (`apps/`) |
| **REST API** | Django REST Framework | 3.16.1 | Xây dựng chuẩn API RESTful, Serializers, ViewSets, API Decorators |
| **Database** | PostgreSQL | 14+ | CSDL quan hệ chuẩn ACID, quản lý khóa chính định danh UUIDv4 |
| **DB Connector** | psycopg2-binary & dj-database-url | 2.9 / 3.1 | Kết nối CSDL linh hoạt từ biến môi trường `DATABASE_URL` |
| **Thanh toán QR** | VietQR & SePay Webhook | API v2 | Tạo mã QR động Napas 24/7, tự động khớp giao dịch không cần can thiệp |
| **Xử lý ảnh** | Pillow (PIL) | 10.4.0 | Quản lý bộ sưu tập Hero Gallery 4 ảnh sân bóng và ảnh dịch vụ |
| **Bảo mật CORS** | django-cors-headers | 4.9.0 | Cho phép truyền headers tùy biến `X-User-Role`, `X-User-Id` an toàn |
| **Timezone** | `Asia/Ho_Chi_Minh` | GMT+7 | Đồng bộ toàn bộ khung giờ đặt sân, ca đá và thời gian thanh toán |

### 🌟 Tính năng kỹ thuật vượt trội

- **Tự động hóa thanh toán ngân hàng (VietQR + SePay):** Sinh mã VietQR động theo đơn hàng (`BKxxxxxxxx` cho đơn sân thường hoặc `TRxxxxxxxx` cho giải đấu), tự động xác nhận trong vòng 3–5 giây qua Webhook; đồng thời tích hợp API **Simulate Payment Test** hỗ trợ kiểm thử/demo tức thì mà không cần chuyển tiền thật.
- **Ma trận phân quyền động linh hoạt (Dynamic Granular RBAC Matrix):** 9 vai trò độc lập, cấu hình quyền Xem/Thêm/Sửa/Xóa trực quan trên 8 phân hệ, lưu trữ đồng bộ giữa PostgreSQL và file cấu hình `role_permissions.json`.
- **Cơ chế đặt nhiều khung giờ (Group Booking):** Cho phép chọn nhiều khung giờ liền kề hoặc nhiều ca trong ngày; hệ thống gắn mã nhóm `[Mã nhóm: <UUID>]`, khi thanh toán sẽ tự động xác nhận toàn bộ các ca trong nhóm.
- **Cơ chế chống giữ chỗ ảo (Anti-Spam Limits):** Tự động kiểm tra số lượng ca đá đang hoạt động cùng ngày của khách hàng để ngăn chặn tình trạng cố tình spam giữ chỗ.
- **Vận hành cơ sở thể thao khép kín (Facility Operations):** Quản lý quy trình vệ sinh mặt sân (`PitchCleaning`), tiếp nhận xử lý sự cố kỹ thuật (`MaintenanceIssue`) và quản lý tài sản khách để quên (`LostFoundItem`).
- **Thông báo thời gian thực hướng dữ liệu (Dynamic Notifications):** Sinh thông báo thông minh từ trạng thái thực tế của bảng `Bookings` và `Vouchers`, không lưu bảng tĩnh rác và tự động phân luồng theo vai trò người dùng.
- **Đồng bộ đa tab thời gian thực (Cross-tab Event Sync):** Sử dụng `realtimeSync.js` (StorageEvent & CustomEvent) giúp giao diện cập nhật tức thì khi có biến động ca sân mà không cần F5 tải lại trang.

---

## 3. Cấu trúc thư mục dự án

```
football-booking-system/
├── backend/                                   # Nền tảng Backend Django REST Framework
│   ├── apps/
│   │   ├── bookings/                          # Quản lý đặt sân, lịch sử log & giải đấu thể thao
│   │   │   ├── models.py                      # Bookings, BookingLogs, TournamentRequests
│   │   │   ├── notification_views.py          # Hệ thống sinh thông báo động theo vai trò người dùng
│   │   │   ├── signals.py                     # Signals pre_save/post_save theo dõi đổi trạng thái đơn
│   │   │   ├── serializers.py                 # Chuyển đổi dữ liệu đơn hàng & giải đấu
│   │   │   ├── urls.py                        # Định tuyến API: create, lookup, limits, tournaments...
│   │   │   └── views.py                       # Xử lý đặt ca, chống spam, duyệt/hủy đơn
│   │   ├── facility/                          # Vận hành sân bãi, vệ sinh & bảo trì cơ sở
│   │   │   ├── models.py                      # PitchCleaning, MaintenanceIssue, LostFoundItem
│   │   │   ├── serializers.py                 # Serializers cho các module vận hành
│   │   │   ├── urls.py                        # DefaultRouter đăng ký cleaning, maintenance, lost-found
│   │   │   └── views.py                       # ViewSets xử lý CRUD vận hành
│   │   ├── fields/                            # Quản lý cụm sân bóng & bộ sưu tập ảnh
│   │   │   ├── models.py                      # FootballFields (sub_image_1..3), FieldTypes, FieldSchedules
│   │   │   ├── serializers.py                 # Serializers sân bóng kèm min_price động
│   │   │   ├── urls.py                        # API danh sách sân, chi tiết, tạo sân, seed loại sân
│   │   │   └── views.py                       # Xử lý CRUD sân bóng & Geocoding
│   │   ├── payments/                          # Cổng thanh toán VietQR & SePay Webhook
│   │   │   ├── models.py                      # Payments (liên kết Booking/TournamentRequest)
│   │   │   ├── urls.py                        # /qr/create/, /webhook/sepay/, /status/, /simulate/
│   │   │   └── views.py                       # Sinh mã VietQR, xử lý webhook, giả lập test, doanh thu
│   │   ├── reviews/                           # Đánh giá & tính điểm uy tín sân bóng
│   │   │   ├── models.py                      # Reviews (rating 1-5 sao, bình luận)
│   │   │   ├── urls.py & views.py             # Chỉ cho phép đơn đã hoàn thành (Completed) đánh giá
│   │   ├── servicesadd/                       # Dịch vụ phụ trợ (nước giải khát, áo bib, thuê giày)
│   │   │   ├── models.py                      # ServicesAdd (quản lý kho, size giày), BookingServices
│   │   │   ├── urls.py & views.py             # Quản lý dịch vụ, trừ kho và hoàn kho khi hủy đơn
│   │   ├── timeslots/                         # Khung giờ linh hoạt & sinh ca tự động
│   │   │   ├── models.py                      # TimeSlots (ngày, giờ bắt đầu/kết thúc, giá, trạng thái)
│   │   │   ├── urls.py & views.py             # Bulk generate 90 ngày, loại bỏ giờ trưa, xóa theo sân
│   │   ├── users/                             # Tài khoản, xác thực & ma trận phân quyền
│   │   │   ├── models.py                      # Customers (9 roles), Admin, RolePermission
│   │   │   ├── permissions.py                 # Decorator @permission_required kiểm tra header X-User-Role
│   │   │   ├── urls.py                        # Login, register, social-auth, create-guest, roles/permissions
│   │   │   └── views.py                       # Xác thực mật khẩu hash, quản lý ma trận RBAC
│   │   └── vouchers/                          # Quản lý mã giảm giá & tích điểm thưởng
│   │       ├── models.py                      # Voucher (% hoặc cố định, chi tiêu tối thiểu), CustomerVoucher
│   │       ├── services.py                    # Dịch vụ tự động tặng voucher khi đạt mốc đặt sân
│   │       ├── urls.py & views.py             # Xác thực voucher, kiểm tra điều kiện áp dụng
│   ├── config/
│   │   ├── settings.py                        # Cấu hình Django, CORS headers, Database URL, Timezone
│   │   ├── urls.py                            # Định tuyến gốc /api/ và phục vụ static/media
│   │   └── wsgi.py                            # Cổng giao tiếp WSGI server
│   ├── media/                                 # Thư mục lưu trữ hình ảnh tải lên (fields, services)
│   ├── role_permissions.json                  # Cấu hình quyền hạn mặc định của 9 vai trò
│   ├── requirements.txt                       # Danh mục thư viện Python phụ thuộc
│   └── manage.py
│
├── frontend/                                  # Ứng dụng giao diện người dùng React 18 SPA
│   ├── public/
│   │   └── index.html                         # Điểm neo HTML và phông chữ 'Be Vietnam Pro'
│   ├── src/
│   │   ├── api/                               # Tầng giao tiếp mạng qua Axios
│   │   │   ├── authApi.js                     # Đăng nhập, đăng ký, social auth, tài khoản khách
│   │   │   ├── axiosClient.js                 # Interceptor tự động đính kèm X-User-Role & X-User-Id
│   │   │   ├── bookingsApi.js                 # Đặt sân, hủy đơn, kiểm tra slot trống & Anti-Spam
│   │   │   ├── facilityApi.js                 # API vệ sinh sân bãi, sự cố bảo trì & đồ thất lạc
│   │   │   ├── fieldsApi.js                   # API danh sách sân, bộ lọc, chi tiết sân & upload 4 ảnh
│   │   │   ├── notificationsApi.js            # API chuông thông báo động
│   │   │   ├── paymentsApi.js                 # API sinh VietQR, kiểm tra trạng thái & simulate test
│   │   │   ├── servicesApi.js                 # API danh mục dịch vụ & đồ uống
│   │   │   ├── timeslotsApi.js                # API khung giờ & tự động sinh slot
│   │   │   ├── tournamentsApi.js              # API gửi yêu cầu & quản lý giải đấu thể thao
│   │   │   ├── usersApi.js                    # API quản lý tài khoản & ma trận phân quyền
│   │   │   └── vouchersApi.js                 # API xác thực mã giảm giá & lịch sử phát voucher
│   │   ├── components/                        # Các thành phần giao diện tái sử dụng
│   │   │   ├── AdminSidebar/                  # Sidebar quản trị tự động lọc menu theo quyền hạn
│   │   │   ├── FieldCard/                     # Thẻ sân bóng hiển thị min_price, badge FIFA, sao đánh giá
│   │   │   ├── FieldMap/                      # Bản đồ Leaflet tích hợp chỉ đường Google Maps
│   │   │   ├── Navbar/                        # Thanh điều hướng khách hàng kèm chuông thông báo động
│   │   │   ├── Footer/                        # Chân trang đầy đủ thông tin hỗ trợ 24/7
│   │   │   ├── ProtectedRoute/                # Higher-Order Component bảo vệ route theo role & quyền
│   │   │   ├── Toast/                         # Hệ thống thông báo nổi (Toast Notifications)
│   │   │   └── ...
│   │   ├── context/
│   │   │   └── AuthContext.js                 # Quản lý trạng thái xác thực toàn cục
│   │   ├── hooks/
│   │   │   └── useAuth.js                     # Custom Hook truy xuất thông tin người dùng & vai trò
│   │   ├── pages/                             # Màn hình chức năng của hệ thống
│   │   │   ├── Home/                          # Trang chủ (Hero banner, Quick Search Pill, sân nổi bật)
│   │   │   ├── Fields/                        # Danh sách sân bóng kèm bộ lọc thông minh
│   │   │   ├── FieldDetail/                   # Chi tiết sân: Hero Gallery 4 ảnh, bản đồ Leaflet
│   │   │   ├── Booking/                       # Đặt sân đa bước: chọn slot, dịch vụ kèm size, voucher
│   │   │   ├── BookingSuccess/                # Vé điện tử xác nhận đặt sân thành công (#BKxxxxxxxx)
│   │   │   ├── TournamentRequest/             # Cổng đăng ký giải đấu doanh nghiệp / cúp bóng đá giao hữu
│   │   │   ├── Lookup/                        # Tra cứu đơn bằng SĐT / Mã đơn + QR Code Check-in
│   │   │   ├── MyBookings/ & BookingDetail/   # Lịch sử ca đá cá nhân và chi tiết từng đơn
│   │   │   ├── Contact/                       # Liên hệ hỗ trợ & Hotline cứu hộ sân 24/7
│   │   │   ├── Login/ Register/ Profile/      # Đăng nhập (Email/SĐT/Social), Đăng ký, Hồ sơ cá nhân
│   │   │   └── admin/                         # Sân Bóng Hải Châu Admin Console
│   │   │       ├── dashboard/                 # Bảng điều khiển KPI & biểu đồ phân tích lượt đặt
│   │   │       ├── fields/                    # Quản lý sân bóng & upload bộ sưu tập 4 ảnh sân
│   │   │       ├── bookings/                  # Quản lý đơn, lọc đa tiêu chí, Check-in & Tab Đồ khách quên
│   │   │       ├── bookings/BookingCalendar/  # Lịch thi đấu trực quan theo từng sân dạng Calendar
│   │   │       ├── tournaments/               # Phê duyệt giải đấu, theo dõi cọc tiền và gán sân
│   │   │       ├── cleaning/                  # Nhật ký & giám sát vệ sinh sân sau từng ca đá
│   │   │       ├── maintenance/               # Quản lý sự cố kỹ thuật, đèn LED, mặt cỏ & chi phí sửa
│   │   │       ├── vouchers/                  # Chính sách voucher & tra cứu lịch sử phát hành
│   │   │       ├── timeslots/                 # Quản lý khung giờ & sinh ca tự động 90 ngày
│   │   │       ├── services/                  # Quản lý danh mục nước uống, áo bib, giày đá bóng
│   │   │       ├── users/ & users/user-roles/ # Quản trị tài khoản & Ma trận phân quyền động (RBAC)
│   │   │       ├── revenue/                   # Báo cáo doanh thu tài chính & xuất dữ liệu
│   │   │       └── settings/                  # Cấu hình trung tâm thể thao & tài khoản ngân hàng VietQR
│   │   ├── routes/
│   │   │   └── AppRoutes.js                   # Định tuyến toàn bộ ứng dụng và phân luồng quyền truy cập
│   │   └── utils/
│   │       ├── realtimeSync.js                # Đồng bộ sự kiện liên tab qua StorageEvent & CustomEvent
│   │       ├── permissionUtils.js             # Tiện ích kiểm tra quyền Xem/Thêm/Sửa/Xóa phía Frontend
│   │       └── timeslotUtils.js               # Tiện ích xử lý logic khung giờ và giá giờ cao điểm
│   ├── package.json
│   └── README.md
```

---

## 4. Hệ thống phân quyền đa cấp 9 vai trò (RBAC)

Hệ thống được thiết kế theo mô hình **Role-Based Access Control (RBAC)** với **9 vai trò người dùng chuyên biệt**, đáp ứng chính xác cơ cấu tổ chức của các tổ hợp thể thao hiện đại:

| Mã vai trò | Tên vai trò | Quyền hạn & Trách nhiệm trong hệ thống |
|---|---|---|
| `admin` | **Quản trị viên tối cao** | Toàn quyền kiểm soát hệ thống, thiết lập ma trận phân quyền, quản trị nhân sự, cấu hình tài khoản ngân hàng. |
| `field_owner` | **Chủ cơ sở sân** | Quản lý sân bãi, bảng giá, phê duyệt giải đấu, theo dõi báo cáo doanh thu tài chính và xuất dữ liệu thống kê. |
| `field_manager` | **Quản lý sân** | Điều hành hoạt động đặt sân hàng ngày, quản lý khung giờ, dịch vụ, phân công nhân viên vệ sinh và bảo trì. |
| `receptionist` | **Lễ tân** | Tiếp đón khách, tạo đơn tại quầy, check-in mã QR nhận sân, quản lý đồ thất lạc của khách (Lost & Found). |
| `cashier` | **Nhân viên thu ngân** | Thu tiền tại quầy, đối soát giao dịch chuyển khoản VietQR, theo dõi báo cáo doanh thu theo ngày. |
| `cleaner` | **Nhân viên dọn dẹp** | Theo dõi trạng thái vệ sinh từng sân sau ca đá, cập nhật hoàn thành dọn dẹp, báo cáo đồ đạc khách để quên. |
| `service_staff` | **Nhân viên dịch vụ** | Quản lý kho nước uống, bóng thi đấu, áo bib, chuẩn bị giày theo size phục vụ các ca đá. |
| `maintenance` | **Kỹ thuật & Bảo trì** | Tiếp nhận sự cố hỏng hóc (đèn pha, lưới rách, mặt cỏ sụt lún), cập nhật tiến độ và chi phí sửa chữa. |
| `customer` | **Khách hàng** | Tìm kiếm sân, đặt sân theo khung giờ, đăng ký giải đấu, áp voucher, thanh toán VietQR, theo dõi lịch sử. |

### Ma trận phân quyền động (Granular Dynamic RBAC Matrix)

Quản trị viên có thể bật/tắt trực quan từng quyền (Xem, Thêm, Sửa, Xóa/Hủy) cho từng vai trò thông qua giao diện `/admin/users/roles` trên **8 phân hệ nghiệp vụ**:

1. **Đặt sân (Bookings):** `bookings_view`, `bookings_create`, `bookings_edit`, `bookings_cancel`
2. **Sân bóng (Fields):** `fields_view`, `fields_create`, `fields_edit`, `fields_delete`
3. **Khung giờ (Timeslots):** `timeslots_view`, `timeslots_create`, `timeslots_edit`, `timeslots_delete`
4. **Dịch vụ (Services):** `services_view`, `services_create`, `services_edit`, `services_delete`
5. **Voucher & Khuyến mãi (Vouchers):** `vouchers_view`, `vouchers_create`, `vouchers_edit`, `vouchers_delete`
6. **Người dùng (Users):** `users_view`, `users_create`, `users_edit`, `users_delete`
7. **Doanh thu (Revenue):** `revenue_view`, `revenue_export`
8. **Vận hành (Operations):** `cleaning_manage`, `maintenance_manage` (kèm quyền bảng điều khiển `dashboard_view`)

> **Cơ chế bảo mật kép:**
> - **Client-side:** Component `ProtectedRoute` và tiện ích `permissionUtils.js` kiểm tra vai trò người dùng trong `localStorage` để quyết định cho phép vào trang hoặc hiển thị các nút thao tác.
> - **Server-side:** Decorator `@permission_required` kết hợp HTTP Header `X-User-Role` tự động gửi từ `axiosClient.js` để kiểm tra quyền ở cấp độ máy chủ, chặn đứng các yêu cầu giả mạo API.

---

## 5. Chi tiết chức năng Cổng Khách hàng (Customer Portal)

### 🏠 1. Trang chủ (`/`)
- **Hero Banner:** Thiết kế ấn tượng theo ngôn ngữ *Clean Emerald Modernism*, khẩu hiệu kêu gọi hành động (CTA) đặt sân nhanh.
- **Thanh tìm kiếm thông minh (Quick Search Pill):** Lọc sân theo quận/huyện, loại sân (5, 7, 11 người) và ngày thi đấu.
- **Danh sách sân nổi bật:** Thẻ sân `FieldCard` tự động tính toán giá thấp nhất (`min_price`), hiển thị huy hiệu FIFA, đánh giá sao trung bình và số lượng ca trống trong ngày.
- **Quy trình đặt sân trực quan:** Hướng dẫn 4 bước tinh gọn: 1. Chọn sân $\rightarrow$ 2. Chọn ngày & giờ $\rightarrow$ 3. Nhập thông tin $\rightarrow$ 4. Xác nhận & Nhận mã đặt sân.

### 🏟️ 2. Danh sách sân bóng (`/fields`)
- Danh mục toàn bộ các cụm sân cỏ nhân tạo kèm hình ảnh chất lượng cao.
- Bộ lọc kết hợp: Lọc theo kích thước sân (Sân 5, Sân 7, Sân 11), khoảng giá trên mỗi giờ và vị trí địa lý.

### 📋 3. Chi tiết sân bóng (`/fields/:id`)
- **Hero Gallery 4 ảnh tương tác:** 1 ảnh chính góc rộng toàn cảnh + 3 ảnh chi tiết tiện ích (khung thành & lưới, dàn đèn cao áp LED, khu vực khán đài/nhà chờ) có thể nhấp chuyển đổi mượt mà.
- **Bản đồ tương tác (Leaflet.js & OpenStreetMap):** Hiển thị chính xác vị trí sân trên bản đồ với nút bấm liên kết trực tiếp mở ứng dụng Google Maps dẫn đường.
- **Thông tin chi tiết:** Giờ mở/đóng cửa, hotline cứu hộ sân, chính sách nhận sân và danh sách nhận xét thực tế từ người chơi.

### 📅 4. Quy trình đặt sân đa bước (`/booking`)
- **Hiển thị lịch trống thời gian thực:** Loại bỏ ngay lập tức các khung giờ đã có người đặt trước.
- **Hỗ trợ đặt nhiều khung giờ (Multi-slot Group Booking):** Cho phép đặt nhiều ca liền kề hoặc nhiều ca trong ngày; các đơn tự động liên kết bằng mã nhóm `[Mã nhóm: <UUID>]`.
- **Cơ chế chống giữ chỗ ảo (Anti-Spam Limits):** Tự động kiểm tra số lượng ca đang đặt trong ngày của khách hàng để ngăn chặn hành vi spam giữ sân.
- **Dịch vụ tiện ích kèm theo:** Tùy chọn số lượng nước khoáng, nước tăng lực, thuê áo bib phân đội, thuê giày thể thao (có chọn size giày phù hợp).
- **Kho Voucher ưu đãi:** Nhập mã giảm giá cá nhân hoặc voucher toàn hệ thống, tự động tính số tiền giảm theo tỷ lệ % hoặc số tiền cố định.
- **Thanh toán VietQR tiện lợi:** Sinh mã QR chuyển khoản ngân hàng chuẩn Napas 24/7 với đồng hồ đếm ngược 15 phút, tự động nhận diện thanh toán thành công qua SePay Webhook.

### 🏆 5. Đăng ký giải đấu thể thao trọn gói (`/tournaments`)
- Dành cho doanh nghiệp, câu lạc bộ hoặc giải bóng đá phong trào.
- Tùy chỉnh: Tên giải đấu, đơn vị tổ chức, số lượng đội tham gia (4, 8, 16, 32 đội), thời gian diễn ra.
- Tùy chọn thuê đồng thời cụm sân và các gói dịch vụ tổ chức chuyên nghiệp:
  - Tổ trọng tài chuẩn VFF điều hành giải đấu.
  - Bình luận viên nhiệt huyết & Livestream HD trực tiếp.
  - Bộ cúp kim loại cao cấp, huy chương vàng/bạc/đồng, cờ lưu niệm.
  - Túi y tế sơ cứu chấn thương & bình xịt lạnh thể thao.
  - Áo bib phân biệt đội tuyển, nước bù điện giải.
- **Lựa chọn thanh toán giải:** Hỗ trợ thanh toán toàn bộ 100% hoặc **đặt cọc trước 50%** để giữ sân, thanh toán phần còn lại khi giải khởi tranh.

### 🔍 6. Tra cứu đơn đặt sân (`/lookup`)
- Tra cứu nhanh chóng không cần đăng nhập bằng **Số điện thoại** hoặc **Mã đặt sân (#BKxxxxxxxx)**.
- Hiển thị đầy đủ thông tin: Sân thi đấu, khung giờ, dịch vụ kèm theo, số tiền đã trả, trạng thái đơn.
- **Mã QR Check-in điện tử:** Cung cấp mã QR Check-in cho từng đơn để lễ tân quét mã xác thực nhận sân trong 3 giây tại quầy.
- Gửi đánh giá và chấm điểm sao trực tiếp sau khi hoàn thành ca đá.

### 🔔 7. Chuông thông báo động thời gian thực
- Biểu tượng chuông thông báo trên thanh điều hướng Navbar với số lượng thông báo chưa đọc.
- Tự động đồng bộ thông báo khi: Đơn đặt sân được duyệt, đơn bị hủy, hoàn thành ca đá, nhắc lịch sắp diễn ra.

### 🔐 8. Tài khoản & Hồ sơ cá nhân (`/profile`, `/my-bookings`)
- Đăng nhập linh hoạt bằng Email hoặc Số điện thoại.
- Hỗ trợ đăng nhập nhanh bằng tài khoản Google / Mạng xã hội (`social-auth`).
- Tự động tạo tài khoản khách vãng lai khi người dùng đặt sân nhanh (`create-guest`).
- Lịch sử đặt sân cá nhân với các tab phân loại: *Chờ duyệt, Đã duyệt, Đã hoàn thành, Đã hủy*.

---

## 6. Chi tiết chức năng Quản trị & Vận hành (Sân Bóng Hải Châu Admin Console)

Giao diện quản trị hoạt động độc lập tại đường dẫn `/admin/*`, tích hợp thanh điều hướng dùng chung `AdminSidebar` tự động ẩn/hiện các menu theo quyền hạn thực tế của người dùng:

### 📊 1. Bảng điều khiển tổng quan (`/admin/dashboard`)
- Thẻ chỉ số KPI thời gian thực: Tổng số sân, Sân khả dụng, Lượt đặt sân, Sân bảo trì/tạm dừng kèm thẻ doanh thu kép (Doanh thu mốc chọn & Doanh thu tháng).
- Thẻ cảnh báo đơn chờ duyệt (`PendingApprovalsCard`) giúp quản lý xử lý nhanh các đơn mới đặt.
- Biểu đồ đường (Line Chart SVG) xu hướng lượt đặt sân theo 7 ngày qua có tooltip chi tiết.
- Biểu đồ tròn (Donut Chart SVG) phân bổ tỷ lệ đặt sân theo kích thước (Sân 5, Sân 7, Sân 11).
- Bảng danh sách các ca đá gần nhất với avatar khách, thông tin sân, khung giờ và trạng thái đơn.

### 🏟️ 2. Quản lý sân bóng (`/admin/fields`)
- Danh sách toàn bộ sân bóng kèm trạng thái hoạt động / tạm đóng bảo trì.
- **Thêm & Sửa sân toàn diện:** Tên sân, loại sân, vị trí, giá cơ bản, giá giờ vàng/giờ thấp điểm, giờ mở/đóng cửa.
- **Tải lên bộ sưu tập 4 ảnh:** 1 ảnh đại diện chính + 3 ảnh chi tiết tiện ích kèm xem trước trực quan.
- **Tự động bắt tọa độ bản đồ:** Chuyển đổi địa chỉ thành tọa độ (Latitude, Longitude) qua API Nominatim kèm bản đồ Live Preview.

### 📅 3. Quản lý đặt sân & Đồ thất lạc (`/admin/bookings`)
- Bộ lọc đa năng: *Tất cả, Chờ duyệt (Pending), Đã xác nhận (Confirmed), Đã nhận sân (Checked-in), Đã hoàn thành (Completed), Đã hủy (Cancelled), Khách vãng lai*.
- Thao tác nhanh Check-in khách vào sân khi quét mã QR hoặc đối chiếu tại quầy.
- Xem chi tiết đơn đặt, chỉnh sửa giờ thi đấu, thêm bớt dịch vụ, in hóa đơn hoặc hủy đơn.
- **Tab Đồ khách bỏ quên (Lost & Found Panel):** Quản lý vật dụng khách để quên trên sân bóng (giày, áo khoác, điện thoại, ví, chìa khóa). Ghi nhận vị trí nhặt được, ca đá nghi vấn, số điện thoại khách, trạng thái bàn giao (`Đang giữ tại quầy`, `Đã liên hệ`, `Đã bàn giao lại`).

### 📆 4. Lịch đặt sân dạng Calendar (`/admin/bookings/calendar`)
- Giao diện lịch biểu theo từng sân và từng khung giờ trực quan.
- Dễ dàng quan sát sân nào còn trống, sân nào đang thi đấu theo từng dải màu trạng thái.

### 🏆 5. Quản lý giải đấu & Sự kiện (`/admin/tournaments`)
- Theo dõi toàn bộ danh sách các giải đấu do khách hàng đăng ký tổ chức.
- Xem chi tiết dự toán chi phí, danh sách cụm sân yêu cầu, lịch thi đấu dự kiến và các gói dịch vụ tổ chức.
- Theo dõi trạng thái đặt cọc: *Chưa thanh toán, Đã cọc 50%, Đã thanh toán 100%*.
- Thao tác duyệt giải, phân bổ sân chính thức, từ chối hoặc liên hệ hỗ trợ ban tổ chức.

### 🧹 6. Giám sát vệ sinh sân bãi (`/admin/cleaning`)
- Giám sát trạng thái vệ sinh của từng sân sau mỗi ca đá: `Đã dọn sạch (clean)`, `Đang dọn dẹp (in_progress)`, `Cần dọn dẹp (needs_clean)`.
- Phân công nhân viên vệ sinh phụ trách, ghi nhận thời gian bắt đầu và kết thúc dọn dẹp.
- Thao tác nhanh: Báo cáo sự cố hư hỏng mặt sân sang bộ phận kỹ thuật, hoặc ghi nhận đồ đạc khách để quên vào sổ Lost & Found.

### 🔧 7. Kỹ thuật & Bảo trì thiết bị (`/admin/maintenance`)
- Quản lý sự cố kỹ thuật: Hệ thống đèn cao áp LED, mặt cỏ nhân tạo, hạt cao su, lưới khung thành, hệ thống thoát nước sân.
- Phân loại mức độ khẩn cấp: *Khẩn cấp (Urgent), Cao (High), Bình thường (Normal), Thấp (Low)*.
- Theo dõi trạng thái xử lý: *Chờ xử lý, Đang sửa chữa, Đã sửa xong, Đã khắc phục*.
- Thống kê chi phí sửa chữa thay thế linh kiện, vật tư.

### 🎟️ 8. Quản lý Voucher & Khuyến mãi (`/admin/vouchers`)
- Thiết lập các chương trình khuyến mãi: Giảm theo % hoặc giảm theo số tiền cố định (VNĐ).
- Cấu hình phạm vi áp dụng: *Chỉ giảm tiền giờ sân* hoặc *Giảm cả tiền giờ sân và tiền dịch vụ*.
- Thiết lập giá trị đơn hàng tối thiểu, mức giảm tối đa, hạn sử dụng (ngày) và số lượt sử dụng tối đa.
- Bật tính năng phát voucher thưởng tự động (`is_system_reward`) cho khách hàng thân thiết.
- **Lịch sử phát hành voucher (`?tab=history`):** Tra cứu danh sách khách hàng đã nhận và sử dụng voucher trong hệ thống.

### ⏰ 9. Quản lý khung giờ & Bảng giá (`/admin/timeslots`)
- Quản lý danh sách khung giờ hoạt động của từng sân.
- **Tự động sinh khung giờ hàng loạt (Bulk Generation):** Sinh khung giờ cho tất cả sân trong tối đa 90 ngày tới theo chiến lược giá giờ vàng/giờ thường linh hoạt, tự động loại bỏ khung giờ trưa nắng nóng (10:00 - 14:00).
- Thao tác xóa toàn bộ khung giờ hoặc xóa theo từng sân cụ thể.

### 🛎️ 10. Quản lý dịch vụ & Đồ uống (`/admin/services`)
- Danh mục dịch vụ: Nước giải khát, Cho thuê áo bib, Cho thuê giày thể thao (theo size), Bóng thi đấu.
- Quản lý giá bán, hình ảnh đại diện, danh mục, số lượng tồn kho và trạng thái kinh doanh.
- Gắn dịch vụ khả dụng cho từng sân bóng cụ thể (quan hệ Many-to-Many).
- Tự động hoàn kho dịch vụ khi đơn đặt sân bị hủy.

### 👥 11. Quản lý người dùng & Phân quyền (`/admin/users`, `/admin/users/roles`)
- **Tài khoản hệ thống:** Danh sách khách hàng và nhân viên, hỗ trợ tạo tài khoản mới, phân vai trò, chỉnh sửa thông tin, khóa/mở khóa tài khoản.
- **Khách vãng lai (`?tab=guests`):** Danh sách khách vãng lai từng đặt sân qua điện thoại hoặc tại quầy.
- **Ma trận phân quyền (`/admin/users/roles`):** Bảng cấu hình quyền hạn trực quan cho 9 vai trò người dùng, hỗ trợ nút khôi phục về cấu hình mặc định (Reset to Default).

### 💰 12. Báo cáo & Thống kê doanh thu (`/admin/revenue`)
- Báo cáo tổng doanh thu, doanh thu tiền sân, doanh thu dịch vụ gia tăng.
- So sánh tỷ lệ tăng trưởng doanh thu so với kỳ trước.
- Biểu đồ phân tích doanh thu theo từng sân bóng và phương thức thanh toán (Tiền mặt, VietQR chuyển khoản).
- Bộ lọc nâng cao theo khoảng ngày và sân bóng, hỗ trợ trích xuất dữ liệu tài chính (Export CSV/Excel).

### ⚙️ 13. Cài đặt hệ thống (`/admin/settings`)
- Tuyến đường `/admin/settings` trong ứng dụng tự động điều hướng an toàn về Bảng điều khiển quản trị (`/admin/dashboard`).
- Cấu hình tài khoản ngân hàng thụ hưởng nhận tiền VietQR (Số tài khoản, Tên ngân hàng, Chủ tài khoản) và bảo mật kết nối SePay Webhook được thiết lập bảo mật qua biến môi trường Backend (`.env`) và tệp cấu hình `settings.py`.
- Thiết lập thời gian hủy đơn tự động nếu khách không thanh toán cọc sau 15 phút.

---

## 7. Quy trình thanh toán VietQR & Cơ chế Webhook SePay

### 🔄 Luồng xử lý giao dịch tự động

```
[Khách hàng]
     │
     │ 1. Bấm "Xác nhận đặt sân" / "Đặt cọc giải đấu"
     ▼
[Frontend React]
     │
     │ 2. POST /api/payments/qr/create/ (kèm booking_id hoặc tournament_id)
     ▼
[Backend Django]
     │ 3. Sinh mã thanh toán:
     │    - Đơn đặt sân: BK + 8 ký tự đầu UUID (VD: BK9F8A1201)
     │    - Đơn giải đấu: TR + 8 ký tự đầu UUID (VD: TR3C5B8802)
     │ 4. Sinh URL ảnh VietQR chuẩn Napas 24/7 (qr.sepay.vn / img.vietqr.io)
     │ 5. Tạo bản ghi Payments với trạng thái 'Pending'
     ▼
[Frontend React]
     │ 6. Hiển thị mã QR VietQR kèm đồng hồ đếm ngược 15 phút
     │ 7. Kích hoạt Smart Polling (gọi GET /api/payments/status/:id/ mỗi 2-3s)
     ▼
[Khách hàng]
     │ 8. Dùng App Ngân hàng quét mã QR & bấm Chuyển khoản
     ▼
[Hệ thống Ngân hàng (Napas 24/7)]
     │ 9. Biến động số dư tài khoản thụ hưởng
     ▼
[SePay Gateway]
     │ 10. Bắn Webhook HTTP POST: /api/payments/webhook/sepay/
     ▼
[Backend Django Webhook Receiver]
     │ 11. Trích xuất nội dung chuyển khoản bằng Regex:
     │     - Nhận diện mã BK... hoặc TR...
     │ 12. Khớp mã đơn và cập nhật trạng thái:
     │     - Payments status → 'Completed' / 'Paid'
     │     - Bookings status → 'Confirmed'
     │     - Timeslot status → 'booked'
     │     - Nếu có [Mã nhóm], tự động xác nhận toàn bộ các ca trong nhóm!
     │ 13. Django Signal gửi thông báo cho khách hàng
     ▼
[Frontend React Polling]
     │ 14. Phát hiện is_paid = true → Tự động chuyển hướng sang /booking/success
     ▼
[Màn hình hoàn tất]
     Hiển thị mã QR Check-in và thông tin vé điện tử!
```

### ⚡ Công cụ Giả lập Thanh toán (Simulate Payment Test)

Để phục vụ quá trình chấm đồ án, bảo vệ tốt nghiệp hoặc kiểm thử chức năng mà không cần dùng tiền tài khoản ngân hàng thật, hệ thống cung cấp API và nút bấm **"Giả lập thanh toán tức thì"**:
- **Endpoint:** `POST /api/payments/simulate/`
- **Body:** `{ "booking_id": "<UUID>" }` hoặc `{ "tournament_id": "<UUID>" }`
- **Cơ chế:** Ngay lập tức cập nhật giao dịch thành công, xác nhận đơn đặt sân, khóa timeslot và sinh mã giao dịch kiểm thử dạng `TEST-xxxxxxxx`.

---

## 8. Cơ chế đồng bộ thời gian thực & Thông báo động

### 1. Đồng bộ liên tab (Cross-tab Realtime Sync)
Hệ thống sử dụng module tiện ích `realtimeSync.js` kết hợp giữa sự kiện `window.localStorage` StorageEvent và `CustomEvent`:
- Khi một đơn đặt sân mới được thanh toán, một lịch vệ sinh sân được cập nhật, hoặc một sân bóng thay đổi trạng thái, sự kiện `football_sync` sẽ được phát đi.
- Tất cả các tab trình duyệt khác đang mở (cả màn hình Khách hàng lẫn màn hình Quản trị) sẽ ngay lập tức nhận sự kiện và tải lại dữ liệu ca sân mà không cần người dùng bấm F5.

### 2. Hệ thống thông báo động theo vai trò (Dynamic Notifications)
Khác với phương pháp lưu thông báo tĩnh làm nặng cơ sở dữ liệu, Sân Bóng Đá Hải Châu sử dụng kiến trúc thông báo động qua endpoint `/api/notifications/`:
- Dữ liệu thông báo được tổng hợp trực tiếp từ trạng thái mới nhất của các đơn đặt sân (`Bookings`) và voucher thưởng (`Vouchers`).
- Tự động phân luồng theo vai trò người dùng:
  - **Khách hàng:** Nhận thông báo khi đơn được duyệt (`booking_approved`), đơn bị hủy (`booking_cancelled`), hoàn thành ca đá (`booking_completed`) hoặc nhận voucher thưởng.
  - **Quản trị viên / Lễ tân:** Nhận thông báo khi có đơn đặt mới cần duyệt (`booking_pending`), đơn bị hủy gần đây, hoặc có khách hàng yêu cầu giải đấu mới.

---

## 9. Quy tắc nghiệp vụ cốt lõi

1. **Khung giờ trưa ngoài trời (10:00 - 14:00):** Khi sinh khung giờ hàng loạt (Bulk Generation), hệ thống tự động bỏ qua khoảng thời gian này do đặc thù thời tiết nắng nóng ít người thi đấu sân cỏ ngoài trời. Tuy nhiên, quản trị viên vẫn có thể tạo thủ công từng slot nếu sân có mái che.
2. **Khung giờ vàng cao điểm (Prime Hours):** Các khung giờ từ 17:30 đến 21:00 được áp dụng đơn giá cao điểm riêng biệt theo cấu hình giá của từng sân bóng.
3. **Mã đơn đặt sân thân thiện:** Sử dụng 8 ký tự đầu của chuỗi UUID viết hoa (Ví dụ: `#BK3F8A2D19`) để hiển thị ngắn gọn, dễ đọc trên vé điện tử và tin nhắn SMS/Zalo.
4. **Cơ chế mở lại slot khi hủy đơn (Timeslot Reclaiming):** Khi một đơn đặt sân bị hủy hoặc xóa, khung giờ tương ứng sẽ tự động được chuyển lại trạng thái `available` để khách hàng khác có thể tiếp tục đặt chỗ.
5. **Đánh giá sân bóng (Verified Reviews):** Chỉ những đơn đặt sân có trạng thái `Completed` (Đã hoàn thành thi đấu) mới được phép gửi đánh giá sao và nhận xét. Điểm trung bình `rating_avg` của sân được tự động tính toán lại ngay khi có đánh giá mới.
6. **Bảo toàn kho dịch vụ:** Khi khách hàng đặt sân kèm dịch vụ (nước, áo, giày), số lượng tồn kho của dịch vụ sẽ được giữ chỗ. Nếu đơn đặt sân bị hủy, hệ thống tự động hoàn trả lại đúng số lượng tồn kho ban đầu.

---

## 10. Hướng dẫn cài đặt & Khởi chạy hệ thống

### Yêu cầu môi trường
- **Python:** 3.10 trở lên
- **Node.js:** 18 trở lên & npm
- **Cơ sở dữ liệu:** PostgreSQL 14 trở lên (đã tạo sẵn database)

---

### Bước 1: Cấu hình và Khởi chạy Backend (Django)

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Tạo và kích hoạt môi trường ảo Python
python -m venv venv
# Trên Windows (PowerShell / CMD):
venv\Scripts\activate
# Trên Linux / macOS:
source venv/bin/activate

# 3. Cài đặt các gói phụ thuộc
pip install -r requirements.txt

# 4. Tạo file .env tại thư mục backend/ với nội dung mẫu:
```

```env
# File: backend/.env
DEBUG=True
SECRET_KEY=django-insecure-pitch-pulse-secret-key-production-2026
DATABASE_URL=postgresql://postgres:12345@localhost:5432/football_booking_db

# Cấu hình thanh toán VietQR / SePay
BANK_CODE=VCB
BANK_ACCOUNT_NO=9974090779
BANK_ACCOUNT_NAME=TRUONG DINH BAC
SEPAY_API_KEY=
```

```bash
# 5. Thực hiện khởi tạo và đồng bộ Cơ sở dữ liệu
python manage.py makemigrations
python manage.py migrate

# 6. Khởi tạo dữ liệu loại sân mẫu (Sân 5, Sân 7, Sân 11)
# Bật server và truy cập endpoint seed một lần duy nhất:
python manage.py runserver
# Sau đó mở trình duyệt truy cập: http://localhost:8000/api/seed-field-types/
```

Backend API sẽ hoạt động tại địa chỉ: `http://localhost:8000/api/`

---

### Bước 2: Cài đặt và Khởi chạy Frontend (React)

Mở một cửa sổ dòng lệnh (Terminal) mới:

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói thư viện npm
npm install

# 3. Khởi chạy máy chủ phát triển
npm start
```

Ứng dụng web sẽ tự động mở tại địa chỉ: `http://localhost:3000`

---

### Bước 3: Thử nghiệm Webhook SePay từ Internet (Tùy chọn khi Demo)

Khi muốn thử nghiệm nhận Webhook chuyển khoản thực tế từ ngân hàng thông qua SePay trên môi trường máy cá nhân (Localhost), sử dụng công cụ **LocalTunnel** hoặc **Ngrok** để public cổng 8000:

```bash
# Sử dụng LocalTunnel:
npx localtunnel --port 8000 --subdomain football-dinhbac

# Hoặc sử dụng Ngrok:
ngrok http 8000
```

Sau đó, dán URL Webhook được cấp (ví dụ `https://football-dinhbac.loca.lt/api/payments/webhook/sepay/`) vào phần cấu hình Webhook trên bảng điều khiển SePay.

---

### 🔑 Tài khoản mẫu phục vụ thử nghiệm và chấm đồ án

Hệ thống cung cấp sẵn các nhóm tài khoản tương ứng với các vai trò trong ma trận phân quyền:

| Vai trò | Số điện thoại / Tài khoản | Mật khẩu mẫu | Chức năng kiểm thử nổi bật |
|---|---|---|---|
| **Admin tối cao** | `04858758475` hoặc `admin` | `123456` | Cấu hình ma trận phân quyền 9 vai trò, cài đặt hệ thống, quản trị người dùng |
| **Quản lý / Nhân viên** | `0923456767` | `123456` | Điều hành lịch đặt sân, giám sát vệ sinh, bảo trì sự cố, quản lý đồ thất lạc |
| **Khách hàng** | `0123456789` | `123456` | Đặt sân trực tuyến, áp dụng voucher, thanh toán VietQR, tra cứu lịch sử ca đá |

---

*© 2026 Sân Bóng Đá Hải Châu, Đà Nẵng — Đề tài Xây dựng hệ thống quản lý sân bóng đá nhân tạo Hải Châu, Đà Nẵng.*
