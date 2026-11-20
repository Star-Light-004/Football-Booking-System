# TÀI LIỆU THIẾT KẾ GIAO DIỆN HỆ THỐNG (DESIGN SPECIFICATIONS)
# HỆ THỐNG QUẢN LÝ SÂN BÓNG ĐÁ NHÂN TẠO HẢI CHÂU, ĐÀ NẴNG

---

## MỤC LỤC
1. [TỔNG QUAN HỆ THỐNG & TRIẾT LÝ THIẾT KẾ](#1-tổng-quan-hệ-thống--triết-lý-thiết-kế)
2. [HỆ THỐNG NỀN TẢNG THIẾT KẾ (DESIGN SYSTEM FOUNDATIONS)](#2-hệ-thống-nền-tảng-thiết-kế-design-system-foundations)
   - 2.1 Bảng màu chủ đạo (Color Palette)
   - 2.2 Hệ thống Typography (Kiểu chữ & Phân cấp)
   - 2.3 Hệ thống Khoảng cách & Lưới (Spacing & Layout Grid)
   - 2.4 Đổ bóng, Bo góc & Hiệu ứng viền (Elevation, Radii & Borders)
   - 2.5 Hệ thống Icon & Huy hiệu (Iconography & Badges)
3. [GIAO DIỆN NGƯỜI DÙNG DÀNH CHO KHÁCH HÀNG (CUSTOMER PORTAL)](#3-giao-diện-người-dùng-dành-cho-khách-hàng-customer-portal)
   - 3.1 Thanh điều hướng & Header toàn trang (Navbar)
   - 3.2 Trang chủ (Home Page - `/`)
   - 3.3 Danh sách sân bóng (Fields Listing - `/fields`)
   - 3.4 Chi tiết sân bóng & Bản đồ tương tác (Field Detail - `/fields/:id`)
   - 3.5 Quy trình Đặt sân & Chọn khung giờ (Booking Flow - `/booking`)
   - 3.6 Màn hình Thanh toán & Vé điện tử VietQR (Payment & Booking Success - `/booking/success`)
   - 3.7 Tra cứu thông tin đặt sân (Booking Lookup - `/lookup`)
   - 3.8 Lịch sử đặt sân của tôi (My Bookings - `/my-bookings`)
   - 3.9 Đăng ký tổ chức giải đấu thể thao (Tournament Request - `/tournament-request`)
   - 3.10 Liên hệ & Hỗ trợ cứu hộ sân 24/7 (Contact & Support - `/contact`)
   - 3.11 Xác thực người dùng (Login & Register - `/login`, `/register`)
   - 3.12 Hồ sơ cá nhân (User Profile - `/profile`)
4. [GIAO DIỆN QUẢN TRỊ & ĐIỀU HÀNH SÂN (ADMIN & OPERATIONS CONSOLE)](#4-giao-diện-quản-trị--điều-hành-sân-admin--operations-console)
   - 4.1 Thanh điều hướng Admin (Enterprise Sidebar) & Phân quyền RBAC
   - 4.2 Bảng điều khiển tổng quan (Admin Dashboard - `/admin/dashboard`)
   - 4.3 Quản lý đặt sân & Lịch thi đấu trực quan (Bookings & Calendar - `/admin/bookings`)
   - 4.4 Quản lý đồ thất lạc của khách (Lost & Found Panel)
   - 4.5 Quản lý sân bóng & Thư viện ảnh (Fields Management - `/admin/fields`)
   - 4.6 Quản lý khung giờ & Giờ vàng Prime (Timeslots Management - `/admin/timeslots`)
   - 4.7 Quản lý dịch vụ & Xuất kho đồ uống/trang phục (Services & Inventory - `/admin/services`)
   - 4.8 Quản lý chiến dịch Voucher khuyến mãi (Vouchers Management - `/admin/vouchers`)
   - 4.9 Báo cáo & Phân tích doanh thu tài chính (Revenue Analytics - `/admin/revenue`)
   - 4.10 Điều phối & Duyệt yêu cầu giải đấu (Tournaments Management - `/admin/tournaments`)
   - 4.11 Quy trình giám sát vệ sinh sân bãi (Cleaning Operations - `/admin/cleaning`)
   - 4.12 Quản lý bảo trì sự cố thiết bị & mặt sân (Maintenance - `/admin/maintenance`)
   - 4.13 Quản lý người dùng, khách vãng lai & Phân quyền (Users & Roles - `/admin/users`)
   - 4.14 Cài đặt hệ thống & Cấu hình SePay VietQR (System Settings - `/admin/settings`)
5. [CÁC COMPONENT NỀN TẢNG DÙNG CHUNG (REUSABLE UI COMPONENTS)](#5-các-component-nền-tảng-dùng-chung-reusable-ui-components)
6. [TƯƠNG TÁC THỜI GIAN THỰC & VI HÀNH ĐỘNG (INTERACTIONS & REALTIME)](#6-tương-tác-thời-gian-thực--vi-hành-động-interactions--realtime)

---

## 1. TỔNG QUAN HỆ THỐNG & TRIẾT LÝ THIẾT KẾ

**Sân Bóng Đá Hải Châu, Đà Nẵng** là hệ thống quản lý và đặt sân bóng đá nhân tạo toàn diện. Giao diện của hệ thống được kiến tạo dựa trên triết lý **"Clean Emerald Modernism"** — kết hợp hài hòa giữa sắc xanh cỏ bóng đá tự nhiên (Emerald Forest Green), nền sáng hiện đại, độ tương phản cao, bố cục thẻ card thông minh và luồng thao tác trực quan nhanh chóng.

### Nguyên tắc cốt lõi:
1. **Clarity (Minh bạch thông tin):** Giá cả theo từng khung giờ, số lượng sân trống, điều kiện cọc 50%, chính sách hủy đều được trực quan hóa, tránh gây hiểu lầm cho cầu thủ.
2. **Speed & Efficiency (Tối ưu tốc độ thao tác):** Quy trình đặt sân chỉ qua 3 bước (Chọn ngày & giờ -> Chọn dịch vụ & Voucher -> Quét mã VietQR). Phía Admin hỗ trợ check-in mã QR tại quầy trong 1 chạm.
3. **Consistency (Tính nhất quán đa nền tảng):** Ngôn ngữ thiết kế được chuẩn hóa đồng bộ giữa Bản Web (Desktop / Tablet / Mobile Browser) và Bản Ứng dụng Di động (Mobile App iOS & Android).
4. **Resilience (Thời gian thực & Không gián đoạn):** Cập nhật trạng thái sân tức thời giữa các tab, tự động nhận diện thanh toán ngân hàng qua Webhook SePay mà không cần tải lại trang.

---

## 2. HỆ THỐNG NỀN TẢNG THIẾT KẾ (DESIGN SYSTEM FOUNDATIONS)

### 2.1 Bảng màu chủ đạo (Color Palette)

#### A. Nhóm màu Thương hiệu (Brand & Primary Green)
*Lấy cảm hứng từ màu xanh mặt cỏ đạt chuẩn FIFA và hệ thống đèn cao áp hiện đại:*
- **Primary Green (Chủ đạo):** `#16a34a` (Green 600) — Dùng cho nút kêu gọi hành động chính (CTA), tab đang kích hoạt, trạng thái hoàn tất.
- **Primary Dark (Xanh đậm / Nhấn mạnh):** `#15803d` (Green 700) / `#055b35` (Emerald Deep) — Dùng cho header vé, tiêu đề đặc biệt, thanh điều hướng active.
- **Primary Light (Xanh sáng):** `#22c55e` (Green 500) — Dùng cho hover, viền focus, điểm sáng trạng thái.
- **Primary Soft Tint (Nền mềm):** `#f0fdf4` (Green 50) / `#dcfce7` (Green 100) — Nền của các badge xác nhận, thông báo thành công, tag giờ trống.

#### B. Nhóm màu Nền & Bề mặt (Surfaces & Backgrounds)
- **Base Background:** `#f8fafc` (Slate 50) — Nền tổng thể sạch sẽ, giảm mỏi mắt cho người dùng.
- **Card Surface (Bề mặt thẻ):** `#ffffff` (Pure White) — Nền các khối thẻ nội dung, danh sách sân, form nhập liệu.
- **Subtle Surface (Nền phụ):** `#f1f5f9` (Slate 100) — Nền các trường input, ô tìm kiếm, bảng lịch phụ.
- **Dark Surface (Nền Sidebar Admin):** `#0f172a` (Slate 900) kết hợp `#1e293b` (Slate 800) — Tạo sự chuyên nghiệp, tách biệt rõ ràng khu vực điều hành.

#### C. Nhóm màu Văn bản (Typography Colors)
- **Text Headings (Tiêu đề chính):** `#111827` (Gray 900) — Độ tương phản WCAG AAA cao nhất.
- **Text Body (Nội dung chính):** `#374151` (Gray 700) — Dễ đọc, êm mắt khi đọc thông số dài.
- **Text Muted (Thông tin phụ / Meta):** `#6b7280` (Gray 500) / `#94a3b8` (Slate 400) — Dành cho ngày giờ tạo, chú thích, placeholder.
- **Text Inverse (Chữ tương phản):** `#ffffff` — Dùng trên nền xanh đậm hoặc nền tối.

#### D. Nhóm màu Trạng thái & Nghiệp vụ (Semantic & Status Colors)
- **Thành công / Đã check-in / Sân trống:**
  - Text: `#15803d` | Nền: `#dcfce7` | Viền: `#86efac`
- **Chờ cọc / Khung giờ cao điểm (Prime) / Cảnh báo:**
  - Text: `#b45309` | Nền: `#fef3c7` | Viền: `#fde68a`
- **Khẩn cấp / Đã hủy / Đã khóa sân:**
  - Text: `#b91c1c` | Nền: `#fee2e2` | Viền: `#fca5a5`
- **Đang xử lý / Giải đấu / Dịch vụ:**
  - Text: `#1d4ed8` | Nền: `#dbeafe` | Viền: `#93c5fd`
- **Bảo dưỡng kỹ thuật (Maintenance):**
  - Text: `#c2410c` | Nền: `#ffedd5` | Viền: `#fdba74`
- **Vệ sinh sân bãi (Cleaning):**
  - Text: `#0f766e` | Nền: `#ccfbf1` | Viền: `#5eead4`

---

### 2.2 Hệ thống Typography (Kiểu chữ & Phân cấp)

- **Phông chữ chủ đạo:** `'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
  *(Được nhúng từ Google Fonts, tối ưu chuẩn hiển thị tiếng Việt có dấu, nét chữ tròn trịa, hiện đại).*
- **Phân cấp cỡ chữ (Type Scale):**
  - **Display / Hero Title:** `36px - 44px` | Font weight: `800` (ExtraBold) | Line-height: `1.2`
  - **Heading 1 (Tiêu đề trang):** `28px - 32px` | Font weight: `700` (Bold) | Line-height: `1.3`
  - **Heading 2 (Tiêu đề phân mục):** `20px - 24px` | Font weight: `600` (SemiBold) | Line-height: `1.4`
  - **Heading 3 (Tiêu đề thẻ Card):** `16px - 18px` | Font weight: `600` (SemiBold) | Line-height: `1.4`
  - **Body Large (Đoạn mô tả nổi bật):** `16px` | Font weight: `400` / `500` | Line-height: `1.6`
  - **Body Regular (Văn bản chuẩn):** `14px` | Font weight: `400` | Line-height: `1.5`
  - **Caption / Meta / Badge:** `12px - 13px` | Font weight: `500` / `600` | Line-height: `1.4`
  - **Mã đơn / Mã hóa đơn / Đồng hồ đếm ngược:** Monospace font hoặc Tabular numbers (`font-variant-numeric: tabular-nums`).

---

### 2.3 Hệ thống Khoảng cách & Lưới (Spacing & Layout Grid)

- **Đơn vị nền tảng:** Hệ số nhân 4px / 8px:
  - `4px` (xs) | `8px` (sm) | `12px` (md) | `16px` (lg) | `24px` (xl) | `32px` (2xl) | `48px` (3xl) | `64px` (4xl).
- **Container Max-Width:**
  - Trang khách hàng: `1200px` (căn giữa với lề an toàn 16px trên mobile).
  - Khung Đặt sân & Chi tiết: `1080px` để tập trung sự chú ý.
  - Bảng điều khiển Admin: `100%` với padding nội bộ `24px - 32px` trên màn hình lớn.
- **Breakpoints chuẩn:**
  - Mobile: `< 768px` (chuyển đổi layout 1 cột, thanh bottom bar hoặc drawer).
  - Tablet: `768px - 1024px` (layout 2 cột, menu thu gọn).
  - Desktop / Monitor: `> 1024px` (layout đa cột, cố định sidebar bên trái).

---

### 2.4 Đổ bóng, Bo góc & Hiệu ứng viền (Elevation, Radii & Borders)

- **Bo góc (Border Radius):**
  - Tag / Pill / Button tròn: `9999px` (Full round)
  - Nút bấm (Button) & Ô nhập liệu (Input): `8px - 10px`
  - Thẻ card nội dung: `14px - 16px`
  - Khung lớn / Hộp thoại Modal: `20px - 24px`
- **Đổ bóng (Box Shadow & Elevation):**
  - **Level 1 (Card tiêu chuẩn):** `0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)`
  - **Level 2 (Thẻ sân / Nổi bật):** `0 4px 16px rgba(0, 0, 0, 0.08)`
  - **Level 3 (Hover Card / Nút CTA):** `0 10px 25px -5px rgba(22, 163, 74, 0.25), 0 8px 10px -6px rgba(22, 163, 74, 0.2)`
  - **Level 4 (Modal Dialog / Popover):** `0 20px 40px -10px rgba(0, 0, 0, 0.18)`
- **Đường viền (Borders):**
  - Viền phân cách tiêu chuẩn: `1px solid #e2e8f0` (Slate 200).
  - Viền thẻ được chọn (Selected Slot / Active Card): `2px solid #16a34a`.

---

### 2.5 Hệ thống Icon & Huy hiệu (Iconography & Badges)

- **Thư viện Icon:** Google Material Symbols Outlined (`material-symbols-outlined`), cấu hình chuẩn `opsz 24`, `wght 400`.
- **Huy hiệu bảo chứng (Quality Badges):**
  - Huy hiệu *"FIFA Quality Pro"*: Nền vàng hổ phách nhẹ `#fef3c7`, chữ cam cháy `#b45309`, viền `#fde68a`.
  - Huy hiệu *"Khuyên dùng / Phổ biến"*: Nền xanh mint `#ecfdf5`, chữ xanh ngọc `#047857`.
  - Huy hiệu *"Giờ vàng Prime"*: Biểu tượng ngọn lửa `local_fire_department`, viền cam phát sáng.

---

## 3. GIAO DIỆN NGƯỜI DÙNG DÀNH CHO KHÁCH HÀNG (CUSTOMER PORTAL)

### 3.1 Thanh điều hướng & Header toàn trang (Navbar)
- **Vị trí & Cơ chế:** Cố định trên cùng màn hình (`sticky top-0`, `z-index: 100`), nền kính mờ nhẹ (`backdrop-filter: blur(8px)` trên nền trắng `rgba(255, 255, 255, 0.95)`).
- **Cấu trúc thành phần:**
  1. **Logo thương hiệu bên trái:** Biểu tượng trái bóng kèm chữ "Sân Bóng Hải Châu" đậm nét.
  2. **Thanh menu chính giữa:**
     - *Trang chủ* (`/`)
     - *Sân bóng* (`/fields`)
     - *Tra cứu đơn* (`/lookup`)
     - *Tổ chức giải đấu* (`/tournament-request`)
     - *Liên hệ* (`/contact`)
  3. **Khu vực tiện ích bên phải:**
     - Nút gọi khẩn cấp / Hotline sân: `1900 88 99 22`.
     - Nếu chưa đăng nhập: Nút "Đăng nhập" (Ghost Button) và "Đăng ký" (Primary Green Pill Button).
     - Nếu đã đăng nhập: Avatar tròn, tên người dùng, huy hiệu Role. Dropdown menu:
       - *Lịch đặt của tôi*
       - *Hồ sơ cá nhân*
       - *Khu vực Quản trị (Admin Console)* — Chỉ hiển thị nếu tài khoản có vai trò Quản trị / Nhân viên.
       - *Đăng xuất* (màu đỏ nhẹ cảnh báo).

---

### 3.2 Trang chủ (Home Page - `/`)
- **Phần Hero nổi bật:**
  - Tiêu đề chào đón mạnh mẽ, khẩu hiệu đặt sân nhanh chóng kèm hình ảnh sân cỏ nhân tạo đạt chuẩn buổi tối rực rỡ ánh đèn.
  - **Thanh tìm kiếm nhanh (Quick Search Pill):** Cho phép gõ tìm theo tên sân, chọn quận/huyện tại Đà Nẵng, chọn loại sân (5, 7, 11 người) và nút "Tìm kiếm ngay".
- **Bộ lọc loại sân trực quan (Filter Pills):**
  - Các nút pill bo tròn: *"Tất cả"*, *"Sân 5 người"*, *"Sân 7 người • HOT"*, *"Sân 11 người"*. Có số lượng sân hiển thị theo thời gian thực.
- **Banner ưu đãi VietQR "Giờ vàng hoàng hôn":**
  - Card thiết kế hiệu ứng Gradient xanh lá - cam hổ phách, thông báo giảm giá 20% khi thanh toán chuyển khoản quét mã VietQR trong khung giờ 16:30 - 18:00.
- **Danh sách sân bóng tiêu biểu (Featured Fields Grid):**
  - Hiển thị theo lưới 3 cột (Desktop) hoặc 1 cột (Mobile). Mỗi sân bóng là một `FieldCard` chuyên nghiệp gồm: ảnh đại diện, huy hiệu FIFA, đánh giá sao, khoảng cách, chip tiện ích (Đèn LED, Cỏ chuẩn, Bãi xe, Tắm nóng), số lượng ca trống hôm nay và nút *"Đặt ngay"*.
- **Widget Kèo giao lưu hôm nay (Matchmaking Widget):**
  - Danh sách các đội bóng đang thiếu người / cần bắt đối, thời gian, sân thi đấu và nút liên hệ kết nối ngay.
- **Khối Giới thiệu quy trình 3 bước:**
  - Trực quan hóa 3 bước: 1. Chọn sân & giờ -> 2. Thanh toán cọc VietQR -> 3. Nhận vé QR & Ra sân thi đấu.
- **Footer:** Chân trang đầy đủ thông tin pháp lý, chi nhánh cụm sân, giờ mở cửa 24/7, hotline, mạng xã hội, chứng nhận cổng thanh toán an toàn Napas VietQR.

---

### 3.3 Danh sách sân bóng (Fields Listing - `/fields`)
- **Bộ lọc đa tiêu chí (Side Filter hoặc Top Filter):**
  - Lọc theo từ khóa tên sân hoặc địa chỉ.
  - Lọc theo loại hình sân: Sân 5 người, 7 người, 11 người.
  - Lọc theo mức giá theo giờ (Slider kéo từ 100.000đ - 600.000đ).
  - Lọc theo tiện ích (Có dàn đèn cao áp, có phòng thay đồ, miễn phí gửi xe, có bảo vệ).
- **Khu vực hiển thị danh sách sân:**
  - Thẻ thông tin hiển thị rõ ràng giá sàn từ `...đ/giờ`.
  - Nút xem chi tiết và nút Đặt sân nhanh.
  - Xử lý trạng thái rỗng (Empty State) với hình minh họa dễ thương và gợi ý chuyển bộ lọc.

---

### 3.4 Chi tiết sân bóng & Bản đồ tương tác (Field Detail - `/fields/:id`)
- **Thư viện ảnh sân (Multi-angle Image Gallery):**
  - Gồm 1 ảnh lớn chất lượng cao ở trung tâm và 3 ảnh thu nhỏ góc cạnh khác nhau (khán đài, bề mặt cỏ cận cảnh, dàn đèn chiếu đêm).
  - Cho phép bấm phóng to toàn màn hình.
- **Khối thông số kỹ thuật sân:**
  - Kích thước chiều dài x chiều rộng, chất lượng sợi cỏ cao cấp, hệ thống thoát nước không đọng vũng khi mưa lớn.
  - Số điện thoại quản lý sân trực tiếp.
- **Bản đồ số OpenStreetMap / Leaflet tương tác:**
  - Tích hợp Leaflet.js đánh dấu chính xác tọa độ GPS của sân.
  - Nút "Mở chỉ đường trên Google Maps" dẫn trực tiếp đến vị trí thực tế của sân.
- **Bảng giá niêm yết theo ca:**
  - Phân chia rõ ràng: Ca sáng (6:00 - 16:00), Ca chiều vàng (16:00 - 18:30), Ca tối đèn cao áp (18:30 - 23:00).
- **Thanh Bottom Bar cố định (Mobile / Tablet):**
  - Hiển thị giá và nút *"Chọn giờ & Đặt sân ngay"*.

---

### 3.5 Quy trình Đặt sân & Chọn khung giờ (Booking Flow - `/booking`)
- **Bộ chọn ngày nằm ngang (Horizontal Date Picker):**
  - Thanh trượt hiển thị 7 ngày trong tuần với Thứ, Ngày/Tháng.
  - Nút "Hôm nay", "Ngày mai" có nhãn phân biệt nhanh. Ngày được chọn sáng nổi bật với nền xanh ngọc.
- **Bảng khung giờ thi đấu (Timeslots Grid):**
  - **Ca trống:** Nền trắng, viền xám mỏng, hiển thị giờ bắt đầu - kết thúc và giá tiền.
  - **Ca đang chọn:** Nền xanh ngọc đậm `#16a34a`, chữ trắng, có icon tích chọn và biểu tượng ngọn lửa giờ vàng (nếu là giờ Prime).
  - **Ca đã có người đặt:** Nền xám nhạt `#f1f5f9`, chữ xám mờ, icon ổ khóa `lock`, không thể bấm chọn để chống xung đột đơn.
- **Khối dịch vụ gia tăng tùy chọn (Add-on Services):**
  - Dạng danh sách kèm checkbox: Nước khoáng Lavie ướp lạnh, Nước bù khoáng Revive/Pocari, Thuê áo pitch phân đội, Thuê bóng thi đấu đạt chuẩn, Thuê trọng tài bắt giải.
  - Tự động cộng dồn tiền tức thời vào bảng tổng kết.
- **Khối áp dụng mã giảm giá (Voucher Input):**
  - Ô nhập mã khuyến mãi, nút "Áp dụng" kiểm tra tính hợp lệ qua API và hiển thị ngay số tiền được giảm trừ.
- **Thanh tóm tắt chi phí (Sticky Order Summary):**
  - Tiền thuê sân: `...đ`
  - Tiền dịch vụ cộng thêm: `...đ`
  - Giảm giá voucher: `-...đ`
  - **Tổng tiền:** `...đ`
  - **Tiền cọc cần thanh toán trước (50%):** Nổi bật với màu xanh lá to bản.
  - Nút bấm *"Tiến hành cọc & Giữ chỗ ➔"*.

---

### 3.6 Màn hình Thanh toán & Vé điện tử VietQR (Payment & Booking Success - `/booking/success`)
- **Thẻ vé trận đấu điện tử (Digital Match Pass):**
  - Thiết kế dạng vé bóng đá chuyên nghiệp với đường viền đục lỗ (perforation cutout dots) phân cách hai phần.
  - **Đầu vé:** Tên giải đấu/trận bóng, mã đơn đặt sân in hoa, trạng thái thanh toán.
  - **Mã QR VietQR Napas chuẩn quốc gia:**
    - Sinh mã QR động tích hợp sẵn thông tin tài khoản thụ hưởng, số tiền cọc chính xác đến từng đồng và nội dung chuyển khoản tự động.
    - Bộ đếm thời gian giữ chỗ an toàn: 15 phút đếm ngược.
    - Nút "Sao chép số tài khoản" và "Sao chép nội dung chuyển khoản" 1 chạm.
  - **Cơ chế xác nhận tự động:**
    - Hệ thống lắng nghe Webhook ngân hàng SePay thời gian thực. Khi người dùng quét mã và chuyển khoản thành công trên app ngân hàng (Vietcombank, MB, Techcombank,...), màn hình lập tức chuyển sang trạng thái "ĐÃ THANH TOÁN THÀNH CÔNG" kèm hiệu ứng pháo hoa chúc mừng mà không cần bấm gì thêm.
  - **Các nút hành động bổ trợ:**
    - "Lưu vé vào Google / Apple Wallet"
    - "Mở bản đồ chỉ đường đến sân"
    - "Tải file vé trận đấu (PDF / Ảnh)"

---

### 3.7 Tra cứu thông tin đặt sân (Booking Lookup - `/lookup`)
- **Mục đích:** Giúp khách hàng (kể cả khách vãng lai không đăng nhập) kiểm tra nhanh tình trạng sân đã đặt.
- **Giao diện:**
  - Ô nhập Mã đơn hàng (VD: `PP-20261112-ABCD`) hoặc Số điện thoại người đặt.
  - Kết quả hiển thị thẻ vé điện tử hoàn chỉnh: Tên sân, giờ đá, ngày đá, số tiền đã cọc, số tiền còn lại phải thanh toán tại quầy khi nhận sân.
  - Mã QR Check-in riêng để đưa cho nhân viên lễ tân quét xác nhận vào sân.

---

### 3.8 Lịch sử đặt sân của tôi (My Bookings - `/my-bookings`)
- **Dành cho:** Khách hàng thành viên đã đăng nhập.
- **Bố cục:**
  - Tabs phân loại trạng thái đơn: *Tất cả*, *Chờ thanh toán cọc*, *Đã xác nhận*, *Đã hoàn thành*, *Đã hủy*.
  - Thẻ thông tin từng đơn đặt sân hiển thị trực quan: Ngày giờ, tên sân, vị trí, tổng tiền, nút "Xem chi tiết vé".
  - Cho phép người dùng bấm **Hủy sân** nếu trước thời gian quy định (có cảnh báo hoàn tiền cọc theo chính sách).
  - Đối với các trận đấu đã hoàn thành: Hiển thị bộ chọn 1 - 5 sao và ô nhập nhận xét để đánh giá chất lượng mặt sân.

---

### 3.9 Đăng ký tổ chức giải đấu thể thao (Tournament Request - `/tournament-request`)
- **Mục tiêu:** Cung cấp giải pháp tổ chức giải đấu bóng đá phong trào, giải doanh nghiệp, giải học sinh sinh viên trọn gói.
- **Form đăng ký chuẩn doanh nghiệp:**
  - Thông tin đơn vị tổ chức: Tên công ty / Câu lạc bộ, người đại diện, số điện thoại, email.
  - Quy mô giải: Thể thức (Vòng tròn tính điểm, Loại trực tiếp, Chia bảng đấu cúp), số lượng đội tham gia (4, 8, 16 đội).
  - Chọn cụm sân thi đấu và thời gian dự kiến (ngày bắt đầu, ngày bế mạc).
  - Gói dịch vụ tổ chức chuyên nghiệp:
    - [x] Tổ trọng tài được cấp chứng chỉ VFF
    - [x] Đội ngũ Livestream 2 máy quay + Bình luận viên tiếng Việt sôi nổi
    - [x] Bộ Cúp vàng, Huy chương Vàng/Bạc/Đồng, Băng rôn, Cờ lưu niệm
    - [x] Bàn y tế, bình xịt lạnh chấn thương và nước uống vận động viên
  - Ước tính chi phí sơ bộ và nút gửi yêu cầu để Ban quản lý sân liên hệ tư vấn hợp đồng trong 2 giờ.

---

### 3.10 Liên hệ & Hỗ trợ cứu hộ sân 24/7 (Contact & Support - `/contact`)
- **Kênh hỗ trợ trực tiếp:**
  - Tổng đài Hotline cứu hộ sân 24/7 (hỗ trợ đổi ca khẩn cấp, tìm đồ thất lạc, sơ cứu chấn thương).
  - Đường dây Zalo OA chính thức hỗ trợ khách hàng nhanh.
  - Địa chỉ văn phòng điều hành và bản đồ định vị cụm sân.
- **Biểu mẫu gửi phản hồi:** Họ tên, email, nội dung góp ý hoặc đề xuất hợp tác kinh doanh.

---

### 3.11 Xác thực người dùng (Login & Register - `/login`, `/register`)
- **Bố cục AuthLayout thanh lịch:**
  - Khung chia 2 cột: Cột trái là hình ảnh sân bóng thi đấu ban đêm kèm trích dẫn truyền cảm hứng thể thao; Cột phải là form nhập liệu tinh gọn.
  - Form Đăng nhập: Tên tài khoản / Email / SĐT, Mật khẩu, Checkbox "Ghi nhớ đăng nhập", Quên mật khẩu.
  - Form Đăng ký: Họ và tên, Số điện thoại, Email, Mật khẩu và Xác nhận mật khẩu.
  - Kiểm tra tính hợp lệ dữ liệu ngay khi gõ (Realtime inline validation).

---

### 3.12 Hồ sơ cá nhân (User Profile - `/profile`)
- **Các khối chức năng:**
  - Thông tin cá nhân: Ảnh đại diện (cho phép thay đổi), họ tên, email, số điện thoại, ngày tham gia hệ thống.
  - Đổi mật khẩu: Mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu.
  - Thống kê cá nhân: Tổng số trận đã đá, số giờ trên sân cỏ, tổng số tiền đã chi tiêu, danh hiệu thành viên (Thành viên Mới, Thân thiết, Cầu thủ Vàng).

---

## 4. GIAO DIỆN QUẢN TRỊ & ĐIỀU HÀNH SÂN (ADMIN & OPERATIONS CONSOLE)

Khu vực Quản trị được thiết kế riêng biệt theo tiêu chuẩn **SaaS Enterprise Dashboard**, tối ưu cho màn hình Desktop và Tablet của nhân viên vận hành tại quầy.

### 4.1 Thanh điều hướng Admin (Enterprise Sidebar) & Phân quyền RBAC
- **Phong cách:** Nền tối màu Slate 900 (`#0f172a`), viền phân cách mỏng `#1e293b`.
- **Header Sidebar:** Logo Sân Bóng Hải Châu với nhãn "HẢI CHÂU • ĐÀ NẴNG".
- **Hồ sơ nhân viên trực ca:** Avatar, Tên nhân viên, Huy hiệu Role cụ thể (VD: *Quản trị viên*, *Chủ sân*, *Lễ tân*, *Thu ngân*, *Kỹ thuật bảo trì*, *Nhân viên vệ sinh*).
- **Hệ thống Menu động theo Phân quyền 9 vai trò (RBAC):**
  Hệ thống tự động lọc các mục điều hướng dựa trên quyền hạn của tài khoản:
  1. `Tổng quan (Dashboard)`: Thống kê số liệu vận hành và doanh thu ngày.
  2. `Quản lý sân bóng`: Danh mục sân, giá sàn, tình trạng sân.
  3. `Quản lý đặt sân`: Xem lịch theo ngày, check-in, hủy đơn, xếp sân.
  4. `Lịch thi đấu (Calendar)`: Giao diện trực quan ma trận sân x khung giờ.
  5. `Yêu cầu giải đấu`: Tiếp nhận và xử lý hồ sơ giải đấu thể thao.
  6. `Người dùng & Phân quyền`: Quản lý tài khoản khách hàng, nhân viên và bảng phân quyền chi tiết.
  7. `Doanh thu & Báo cáo`: Phân tích tài chính, dòng tiền (Chỉ Admin & Chủ sân có quyền).
  8. `Cấu hình khung giờ`: Định nghĩa các ca đấu, cài đặt giờ cao điểm.
  9. `Dịch vụ & Kho đồ`: Quản lý kho nước giải khát, dụng cụ tập luyện.
  10. `Quản lý Voucher`: Tạo mã giảm giá, giới hạn ngân sách khuyến mãi.
  11. `Vệ sinh sân bãi`: Lịch phân công và checklist vệ sinh từng ca.
  12. `Bảo trì kỹ thuật`: Báo cáo hư hỏng đèn, lưới, mặt cỏ và tiến độ khắc phục.
  13. `Cài đặt hệ thống`: Thông tin cơ sở, tích hợp ngân hàng VietQR SePay.
- **Nút Đăng xuất riêng biệt:** Đăng xuất tài khoản quản trị mà không làm mất phiên đăng nhập của trang khách hàng.

---

### 4.2 Bảng điều khiển tổng quan (Admin Dashboard - `/admin/dashboard`)
- **Hàng thẻ số liệu thời gian thực (Real-time Metric Cards):**
  - **Doanh thu hôm nay:** Hiển thị tổng tiền thu được trong ngày kèm % tăng trưởng so với hôm qua.
  - **Tổng số trận đấu hôm nay:** Số lượng trận bóng đã lên lịch trong ngày (Đã check-in / Sắp diễn ra).
  - **Số khách đã check-in:** Tỷ lệ người chơi đã có mặt tại sân.
  - **Tỷ lệ lấp đầy sân (Occupancy Rate):** Biểu đồ đo phần trăm giờ sân được lấp kín.
- **Widget Cảnh báo thời tiết sân bóng (Live Weather Alert):**
  - Cảnh báo thời tiết tại khu vực sân (nắng ráo, mưa dông, nhiệt độ) để ban quản lý chủ động bật giàn đèn sớm hoặc thông báo khách lùi ca tránh mưa.
- **Bảng ca thi đấu tiếp theo trong ngày:**
  - Hiển thị danh sách các trận chuẩn bị bắt đầu trong 30 phút tới. Nút **CHECK-IN 1 CHẠM** cho lễ tân tại quầy.
- **Biểu đồ doanh thu tuần / tháng:** Trực quan hóa đường cong doanh thu và số lượng đơn đặt.

---

### 4.3 Quản lý đặt sân & Lịch thi đấu trực quan (Bookings & Calendar - `/admin/bookings`)
- **Chế độ Lịch biểu (Interactive Grid Calendar):**
  - Trục ngang là các sân bóng (Sân 1, Sân 2, Sân 3...).
  - Trục dọc là các khung giờ từ 06:00 đến 23:00.
  - Các khối màu thể hiện trạng thái: Xanh lá (Đã check-in vào sân), Vàng (Đã cọc 50%, chờ thanh toán nốt), Xám (Sân trống), Cam (Đang dọn dẹp vệ sinh).
  - Bấm vào một ô trống để **Tạo đơn đặt trực tiếp tại quầy (Walk-in booking)** cho khách đến sân không qua web.
  - Bấm vào một ca đã đặt để mở modal chi tiết đơn: Xem thông tin khách, nút *Check-in*, nút *Nhắc cọc qua Zalo*, nút *Thu nốt tiền mặt/VietQR*, nút *Hủy ca hoàn cọc*.
- **Chế độ Danh sách bảng (Table View):**
  - Tìm kiếm theo mã đơn, tên khách, số điện thoại.
  - Bộ lọc trạng thái đơn và ngày đặt.

---

### 4.4 Quản lý đồ thất lạc của khách (Lost & Found Panel)
- **Mục đích:** Hỗ trợ người chơi để quên giày, áo đấu, đồng hồ, điện thoại, bình nước sau khi đá bóng xong.
- **Chức năng:**
  - Ghi nhận món đồ nhặt được: Tên món đồ, sân nhặt được, khung giờ nhặt, hình ảnh đính kèm, vị trí đang cất giữ tại quầy lễ tân.
  - Trạng thái: *Đang giữ tại kho* -> *Đã liên hệ khách* -> *Đã trao trả thành công*.

---

### 4.5 Quản lý sân bóng & Thư viện ảnh (Fields Management - `/admin/fields`)
- **Danh sách sân bóng:** Hiển thị dạng bảng hoặc card lưới kèm hình ảnh đại diện, loại sân (5, 7, 11), vị trí cụm sân, giá cơ sở, trạng thái hoạt động.
- **Modal Thêm mới / Cập nhật sân bóng:**
  - Tên sân, loại sân, kích thước, địa chỉ chi tiết, tọa độ vĩ độ/kinh độ GPS (Latitude/Longitude).
  - Tải lên ảnh đại diện chính và bộ sưu tập 3 ảnh phụ chất lượng cao.
  - Tùy chọn chuyển trạng thái: *Hoạt động bình thường*, *Tạm dừng bảo trì*.

---

### 4.6 Quản lý khung giờ & Giờ vàng Prime (Timeslots Management - `/admin/timeslots`)
- **Cấu hình ca đá tiêu chuẩn:**
  - Thiết lập giờ bắt đầu, giờ kết thúc (VD: 17:00 - 18:30).
  - Đánh dấu ca *Giờ vàng cao điểm (Prime Time)* để áp dụng phụ thu đèn hoặc chính sách ưu đãi riêng.
  - Khóa khung giờ khẩn cấp (khi sân có lịch bảo dưỡng mặt cỏ đột xuất).

---

### 4.7 Quản lý dịch vụ & Xuất kho đồ uống/trang phục (Services & Inventory - `/admin/services`)
- **Danh mục mặt hàng dịch vụ:**
  - Đồ uống giải khát (Nước khoáng, nước chanh muối, nước tăng lực, bia).
  - Thuê trang phục & Dụng cụ thi đấu (Găng tay thủ môn, giày thi đấu, bóng thi đấu số 4/số 5, áo pitch).
  - Dịch vụ trọng tài và ghi hình trận đấu.
- **Theo dõi kho:**
  - Giá nhập, giá bán lẻ, số lượng tồn kho thực tế, cảnh báo khi lượng tồn kho dưới ngưỡng an toàn (sắp hết hàng).
  - Tính năng xuất kho nhanh cho từng đơn đặt sân.

---

### 4.8 Quản lý chiến dịch Voucher khuyến mãi (Vouchers Management - `/admin/vouchers`)
- **Tạo mã giảm giá:**
  - Nhập mã (Code): VD: `VIETQR20`, `VODICH2026`.
  - Hình thức giảm: Theo phần trăm (VD: 20%) hoặc Số tiền cố định (VD: 50.000đ).
  - Giá trị đơn hàng tối thiểu và số tiền giảm tối đa.
  - Giới hạn số lượt sử dụng tối đa và thời hạn hiệu lực của mã.
- **Báo cáo hiệu quả:** Thống kê số lượng khách đã áp dụng mã và tổng số tiền đã khuyến mãi.

---

### 4.9 Báo cáo & Phân tích doanh thu tài chính (Revenue Analytics - `/admin/revenue`)
- **Bộ lọc thời gian linh hoạt:** Hôm nay, 7 ngày qua, Tháng này, Quý này, Tùy chọn khoảng ngày.
- **Các khối chỉ số tài chính chủ chốt:**
  - Tổng doanh thu thực tế.
  - Doanh thu từ tiền thuê sân.
  - Doanh thu từ bán dịch vụ & nước giải khát.
  - Số tiền đã hoàn cọc cho khách.
- **Biểu đồ phân tích:**
  - Biểu đồ phân bổ doanh thu theo từng sân bóng (sân nào sinh lời tốt nhất).
  - Biểu đồ hình thức thanh toán (Tỷ lệ chuyển khoản VietQR Napas vs Tiền mặt tại quầy).
- **Bảng lịch sử giao dịch SePay:** Mã giao dịch ngân hàng, số tài khoản người chuyển, thời gian, số tiền và mã đơn liên kết. Hỗ trợ xuất dữ liệu ra file Excel/CSV.

---

### 4.10 Điều phối & Duyệt yêu cầu giải đấu (Tournaments Management - `/admin/tournaments`)
- **Danh sách hồ sơ đăng ký giải đấu:**
  - Tên cơ quan / đội bóng đăng ký, quy mô, ngày thi đấu dự kiến.
  - Trạng thái hồ sơ: *Mới tiếp nhận*, *Đang liên hệ tư vấn*, *Đã chốt hợp đồng & Cọc*, *Đã hoàn thành giải*.
  - Khung ghi chú trao đổi nội bộ giữa quản lý sân và ban tổ chức giải.

---

### 4.11 Quy trình giám sát vệ sinh sân bãi (Cleaning Operations - `/admin/cleaning`)
- **Đặc thù ngành sân bóng:** Sau mỗi ca đá (nhất là ca tối), sân cỏ thường có chai nhựa, vỏ băng keo, rác thải.
- **Giao diện bảng phân công:**
  - Danh sách các sân vừa kết thúc trận đấu.
  - Phân công nhân viên phụ trách ca vệ sinh.
  - Danh mục kiểm tra (Checklist): 1. Thu dọn chai lọ vỏ bóng -> 2. Quét dọn băng ghế khán đài -> 3. Kiểm tra thùng rác cụm sân -> 4. Lau dọn phòng thay đồ / WC.
  - Nút bấm xác nhận "Đã hoàn thành vệ sinh" để mở khóa sân cho ca đá tiếp theo.

---

### 4.12 Quản lý bảo trì sự cố thiết bị & mặt sân (Maintenance - `/admin/maintenance`)
- **Tiếp nhận & Tạo phiếu sự cố:**
  - Loại hạng mục: Dàn đèn chiếu sáng (cháy bóng LED), Rách lưới khung thành, Lún sụt mặt cỏ nhân tạo, Hỏng vòi tắm nóng lạnh, Hỏng camera an ninh.
  - Mức độ ưu tiên: *Khẩn cấp (Cần xử lý trong 2 giờ)*, *Trung bình*, *Bình thường*.
  - Phân công kỹ thuật viên phụ trách, ghi nhận chi phí sửa chữa và ngày hoàn tất.

---

### 4.13 Quản lý người dùng, khách vãng lai & Phân quyền (Users & Roles - `/admin/users`)
- **Tab Tài khoản hệ thống:** Danh sách người dùng, email, số điện thoại, vai trò hiện tại, ngày tạo. Cho phép khóa tài khoản hoặc reset mật khẩu.
- **Tab Khách vãng lai (Guest Customers):** Danh sách khách đặt sân qua hotline hoặc tại quầy chưa có tài khoản, lưu lịch sử đặt để chăm sóc khách hàng quen.
- **Tab Ma trận phân quyền (Role-Based Access Control):**
  - Bảng ma trận trực quan cấp quyền theo 9 vai trò:
    - `admin`: Toàn quyền hệ thống.
    - `field_owner`: Xem doanh thu, quản lý sân, giá cả và nhân viên.
    - `field_manager`: Quản lý vận hành hàng ngày, duyệt giải đấu, phân công ca trực.
    - `receptionist`: Check-in khách, tạo đơn tại quầy, quản lý lịch đặt.
    - `cashier`: Thu tiền cọc, thu tiền dịch vụ, xem đơn thanh toán.
    - `cleaner`: Xem và cập nhật checklist vệ sinh sau mỗi ca.
    - `service_staff`: Quản lý kho nước, giao đồ uống ra sân cho khách.
    - `maintenance`: Tiếp nhận và xử lý phiếu báo hỏng thiết bị.
    - `customer`: Đặt sân, hủy sân, tra cứu và đánh giá.

---

### 4.14 Cài đặt hệ thống & Cấu hình SePay VietQR (System Settings - `/admin/settings`)
- **Thông tin doanh nghiệp / Cụm sân:** Tên hiển thị, địa chỉ trụ sở, số điện thoại hotline, email tiếp nhận yêu cầu.
- **Cấu hình thanh toán tự động VietQR SePay:**
  - Tên ngân hàng thụ hưởng (MBBank, Vietcombank, Techcombank,...).
  - Số tài khoản và Tên chủ tài khoản in hoa không dấu.
  - Cấu hình Webhook Token bảo mật để đón nhận biến động số dư tức thời từ SePay.
- **Chính sách đặt sân & Giữ chỗ:**
  - Quy định tỷ lệ cọc trước (Mặc định: 50%).
  - Thời gian giữ chỗ chờ cọc (Mặc định: 15 phút, sau 15 phút tự động hủy ca).
  - Thời gian cho phép khách tự hủy đơn trước trận (Mặc định: 12 tiếng).

---

## 5. CÁC COMPONENT NỀN TẢNG DÙNG CHUNG (REUSABLE UI COMPONENTS)

| Component | Vị trí file | Mục đích sử dụng |
|---|---|---|
| `Navbar` | `frontend/src/components/Navbar/` | Thanh điều hướng đầu trang cho khách hàng |
| `Footer` | `frontend/src/components/Footer/` | Chân trang chứa thông tin liên hệ và chứng nhận an toàn |
| `AdminSidebar` | `frontend/src/components/AdminSidebar/` | Thanh menu điều hướng bên trái màn hình quản trị |
| `FieldCard` | `frontend/src/components/FieldCard/` | Thẻ hiển thị thông tin sân bóng, giá tiền và nút đặt nhanh |
| `FieldMap` | `frontend/src/components/FieldMap/` | Bản đồ Leaflet.js tương tác định vị sân bóng |
| `BookingForm` | `frontend/src/components/BookingForm/` | Biểu mẫu nhập thông tin người đặt và chọn dịch vụ |
| `Toast` | `frontend/src/components/Toast/` | Thông báo nổi góc màn hình (Thành công, Thất bại, Cảnh báo) |
| `ProtectedRoute`| `frontend/src/components/ProtectedRoute/` | Bảo vệ các route yêu cầu đăng nhập và kiểm tra phân quyền RBAC |
| `AdminScheduleOverview` | `frontend/src/components/AdminScheduleOverview/` | Widget lịch tóm tắt nhanh cho lễ tân tại quầy |
| `LostFoundPanel` | `frontend/src/pages/admin/bookings/` | Khung quản lý đồ thất lạc của cầu thủ |
| `BookingModals` | `frontend/src/pages/admin/bookings/` | Hộp thoại chi tiết đơn đặt sân, check-in và hủy ca |

---

## 6. TƯƠNG TÁC THỜI GIAN THỰC & VI HÀNH ĐỘNG (INTERACTIONS & REALTIME)

1. **Cơ chế Cross-tab Event Synchronization (`realtimeSync.js`):**
   - Ứng dụng tích hợp công nghệ HTML5 `StorageEvent` và `CustomEvent` nội bộ. Khi một nhân viên lễ tân check-in hoặc khách đặt cọc thành công trên một tab, tất cả các tab khác đang mở (cả màn hình Admin và màn hình Khách) tự động cập nhật ngay lập tức mà không cần bấm F5.
2. **Xác nhận thanh toán tự động qua Webhook SePay Napas:**
   - Khi khách hàng quét mã VietQR bằng ứng dụng ngân hàng, tiền về tài khoản cụm sân trong vòng 1-3 giây.
   - Hệ thống SePay phát tín hiệu Webhook về Backend Django. Backend cập nhật trạng thái đơn sang `confirmed` (Đã cọc) và bắn sự kiện thời gian thực đến trình duyệt của khách hàng, màn hình tự động chuyển sang trang xác nhận thành công.
3. **Hiệu ứng vi tương tác (Micro-interactions):**
   - Nút bấm khi di chuột vào (Hover) nâng nhẹ độ cao (`transform: translateY(-2px)`), tăng bóng đổ xanh ngọc.
   - Bảng khung giờ khi được chọn có hiệu ứng chuyển đổi mượt mà (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).
   - Huy hiệu trạng thái có chấm tròn phát sáng nhấp nháy (Pulse effect) biểu thị các ca đang diễn ra trực tiếp trên sân cỏ.

---
*Tài liệu được trích xuất và tổng hợp hoàn chỉnh từ mã nguồn đề tài Xây dựng hệ thống quản lý sân bóng đá nhân tạo Hải Châu, Đà Nẵng.*

