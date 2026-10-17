import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BASE_URL } from "../../config";
import PageHero from "../../components/PageHero/PageHero";
import "./MyBookings.css";

const normalizeStatusKey = (status) => {
  const s = String(status || "").trim().toLowerCase();
  if (["pending", "chờ xác nhận", "cho xac nhan", "đang chờ", "dang cho"].includes(s)) return "pending";
  if (["confirmed", "đã xác nhận", "da xac nhan"].includes(s)) return "confirmed";
  if (["checked_in", "checked in", "đã check-in", "da check-in", "đã check in"].includes(s)) return "checked_in";
  if (["completed", "hoàn thành", "hoan thanh", "đã hoàn thành"].includes(s)) return "completed";
  if (["cancelled", "canceled", "đã hủy", "da huy", "hủy"].includes(s)) return "cancelled";
  return s;
};

const isCompletedBooking = (status) => normalizeStatusKey(status) === "completed";
const hasReviewedBooking = (isReviewed) => isReviewed === true || isReviewed === "true";

// Khách hàng có thể hủy đơn nếu ở trạng thái 'Chờ xác nhận' hoặc 'Đã xác nhận'
const canCustomerCancel = (status) => {
  const s = normalizeStatusKey(status);
  return s === "pending" || s === "confirmed";
};

const getBookingStatusLabel = (status) => {
  const s = normalizeStatusKey(status);
  switch (s) {
    case "pending":    return "Chờ xác nhận";
    case "confirmed":  return "Đã xác nhận";
    case "checked_in": return "Đã check-in";
    case "completed":  return "Đã hoàn thành";
    case "cancelled":  return "Đã hủy";
    default:           return status || "Đã đặt";
  }
};

const STATUS_TABS = [
  { id: "all",        label: "Tất cả",       icon: "apps" },
  { id: "pending",    label: "Chờ xác nhận", icon: "pending_actions" },
  { id: "confirmed",  label: "Đã xác nhận",  icon: "check_circle" },
  { id: "checked_in", label: "Đã check-in",  icon: "login" },
  { id: "completed",  label: "Hoàn thành",   icon: "task_alt" },
  { id: "cancelled",  label: "Đã hủy",       icon: "cancel" },
];

import { useToast, ToastContainer } from "../../components/Toast/Toast";

const BookingServiceRowItems = ({ bookingId }) => {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${BASE_URL}/services/booking-services/${bookingId}/`);
        const data = await res.json();
        setServices(data || []);
      } catch (err) {
        console.error("Lỗi lấy dịch vụ:", err);
      }
    };
    if (bookingId) fetchServices();
  }, [bookingId]);

  if (services.length === 0) return <span className="booking-services-empty">Không có dịch vụ thêm</span>;

  return (
    <div className="booking-services-list">
      {services.map(s => (
        <div key={s.id} className="booking-service-row">
          {s.service_image && (
            <img src={s.service_image} alt={s.service_name} />
          )}
          <span className="service-tag">
            {s.service_name}{s.shoe_size ? ` - size ${s.shoe_size}` : ''} x{s.quantity}
          </span>
        </div>
      ))}
    </div>
  );
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
    fetchMyBookings(userData?.id);
  }, []);

  const fetchMyBookings = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(
        `${BASE_URL}/bookings/user/${userId}/`
      );
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.log("Lỗi load bookings:", err);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      if (!user) {
        setSubmitError("Vui lòng đăng nhập để đánh giá");
        return;
      }

      const response = await fetch(`${BASE_URL}/reviews/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          booking_id: reviewingBooking.id,
          user_id: user.id,
          rating: Number(rating),
          comment
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setReviewingBooking(null);
          setSubmitSuccess(false);
          setRating(5);
          setComment("");
          fetchMyBookings(user.id);
        }, 2000);
      } else {
        setSubmitError(data.error || "Có lỗi xảy ra khi gửi đánh giá");
      }
    } catch (error) {
      setSubmitError("Lỗi kết nối máy chủ");
    }
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingBookingId, setCancellingBookingId] = useState(null);

  const handleCancel = async (bookingId) => {
    setCancellingBookingId(bookingId);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    setShowCancelModal(false);
    try {
      const response = await fetch(`${BASE_URL}/bookings/${cancellingBookingId}/update/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Cancelled" }),
      });

      if (response.ok) {
        toast.success("Đã hủy đặt sân thành công!");
        fetchMyBookings(user.id);
      } else {
        const data = await response.json();
        toast.error(data.error || "Có lỗi xảy ra khi hủy đặt sân");
      }
    } catch (error) {
      console.error("Lỗi khi hủy đặt sân:", error);
      toast.error("Lỗi kết nối máy chủ");
    }
    setCancellingBookingId(null);
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => normalizeStatusKey(b.status) === "pending").length,
    confirmed: bookings.filter((b) => normalizeStatusKey(b.status) === "confirmed").length,
    checked_in: bookings.filter((b) => normalizeStatusKey(b.status) === "checked_in").length,
    completed: bookings.filter((b) => normalizeStatusKey(b.status) === "completed").length,
    cancelled: bookings.filter((b) => normalizeStatusKey(b.status) === "cancelled").length,
  };

  const totalSpent = bookings
    .filter((booking) => normalizeStatusKey(booking.status) !== "cancelled")
    .reduce((sum, booking) => sum + Number(booking.price || 0), 0);

  const filteredBookings = bookings.filter((booking) => {
    const bookingStatus = normalizeStatusKey(booking.status);
    const matchesStatus = activeFilter === "all" || bookingStatus === activeFilter;
    const searchValue = `${booking.fieldName || ""} ${booking.fieldAddress || ""} ${booking.id || ""}`.toLowerCase();
    const matchesSearch = searchValue.includes(searchTerm.trim().toLowerCase());
    const matchesField = fieldFilter === "all" || booking.fieldName === fieldFilter;
    const bookingDay = new Date(`${booking.bookingDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysFromToday = Math.floor((bookingDay - today) / (24 * 60 * 60 * 1000));
    const matchesTime = timeFilter === "all"
      || (timeFilter === "next7" && daysFromToday >= 0 && daysFromToday <= 7)
      || (timeFilter === "next30" && daysFromToday >= 0 && daysFromToday <= 30)
      || (timeFilter === "past" && daysFromToday < 0);
    return matchesStatus && matchesSearch && matchesField && matchesTime;
  });
  const fieldOptions = [...new Set(bookings.map((booking) => booking.fieldName).filter(Boolean))];
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const visibleBookings = filteredBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const featuredBooking = bookings.find((booking) => normalizeStatusKey(booking.status) !== "cancelled") || bookings[0];

  const handleExport = () => {
    const rows = [
      ["Mã đặt sân", "Sân bóng", "Địa chỉ", "Ngày thi đấu", "Khung giờ", "Chi phí", "Trạng thái"],
      ...filteredBookings.map((booking) => [
        `BK${booking.id?.substring(0, 8).toUpperCase()}`,
        booking.fieldName,
        booking.fieldAddress,
        booking.bookingDate,
        booking.timeSlot,
        booking.price,
        getBookingStatusLabel(booking.status),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const fileUrl = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const downloadLink = document.createElement("a");
    downloadLink.href = fileUrl;
    downloadLink.download = "lich-su-dat-san.csv";
    downloadLink.click();
    URL.revokeObjectURL(fileUrl);
  };

  return (
    <div className="my-bookings-container">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PageHero
        breadcrumb={[{ label: "Trang chủ", to: "/" }, { label: "Lịch sử đặt sân" }]}
        eyebrow="LỊCH THI ĐẤU CỦA BẠN"
        title="Lịch sử đặt sân"
        description="Quản lý lịch thi đấu, tra cứu mã nhận sân và xem lại các trận đã hoàn thành."
        action={(
          <Link to="/fields" className="btn-add-booking">
            <span className="material-symbols-outlined">add_circle</span>
            Đặt sân mới
          </Link>
        )}
      />
      <main className="history-dashboard">
        <section className="history-content">
          <section className="summary-grid">
            <article className="summary-card summary-card--mint">
              <span className="summary-label">TỔNG SỐ TRẬN ĐÃ ĐẶT</span>
              <div className="summary-value">{stats.total}<small> trận</small></div>
              <span className="summary-foot"><span className="material-symbols-outlined">sports_soccer</span> Lịch sử đặt sân</span>
            </article>
            <article className="summary-card summary-card--green">
              <span className="summary-label">CHỜ XÁC NHẬN</span>
              <div className="summary-value">{stats.pending}<small> trận</small></div>
              <span className="summary-foot"><span className="material-symbols-outlined">pending_actions</span> Đang chờ duyệt</span>
            </article>
            <article className="summary-card summary-card--blue">
              <span className="summary-label">ĐÃ XÁC NHẬN</span>
              <div className="summary-value">{stats.confirmed}<small> trận</small></div>
              <span className="summary-foot"><span className="material-symbols-outlined">check_circle</span> Sẵn sàng đá sân</span>
            </article>
            <article className="summary-card summary-card--lavender">
              <span className="summary-label">TỔNG CHI PHÍ ĐẶT SÂN</span>
              <div className="summary-value summary-value--money">{totalSpent.toLocaleString("vi-VN")}<small>đ</small></div>
              <span className="summary-foot"><span className="material-symbols-outlined">payments</span> Không tính lượt đã hủy</span>
            </article>
          </section>

          <section className="history-tools" aria-label="Tìm và lọc lịch sử đặt sân">
            <div className="status-order-title">
              <span className="material-symbols-outlined flag-icon">flag</span>
              <span>TRẠNG THÁI ĐƠN</span>
            </div>
            <div className="status-pills-list" role="tablist" aria-label="Lọc theo trạng thái đơn">
              {STATUS_TABS.map((tab) => {
                const isActive = activeFilter === tab.id;
                const count = tab.id === "all" ? stats.total : stats[tab.id] || 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-status={tab.id}
                    className={`status-pill-btn ${isActive ? "active" : ""}`}
                    onClick={() => {
                      setActiveFilter(tab.id);
                      setCurrentPage(1);
                    }}
                  >
                    <span className="material-symbols-outlined pill-icon">{tab.icon}</span>
                    <span className="pill-label">{tab.label}</span>
                    {count > 0 && <span className="pill-badge">{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="history-filter-row">
              <label className="history-search">
                <span className="material-symbols-outlined">search</span>
                <input
                  type="search"
                  placeholder="Tìm theo tên sân, mã đặt..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                />
              </label>
              <label className="history-select-wrap">
                <span className="material-symbols-outlined">calendar_month</span>
                <select value={timeFilter} onChange={(event) => { setTimeFilter(event.target.value); setCurrentPage(1); }} aria-label="Lọc theo thời gian">
                  <option value="all">Tất cả thời gian</option>
                  <option value="next7">7 ngày tới</option>
                  <option value="next30">30 ngày tới</option>
                  <option value="past">Lịch đã qua</option>
                </select>
              </label>
              <label className="history-select-wrap">
                <span className="material-symbols-outlined">stadium</span>
                <select value={fieldFilter} onChange={(event) => { setFieldFilter(event.target.value); setCurrentPage(1); }} aria-label="Lọc theo sân">
                  <option value="all">Tất cả sân</option>
                  {fieldOptions.map((fieldName) => <option key={fieldName} value={fieldName}>{fieldName}</option>)}
                </select>
              </label>
              <button type="button" className="history-export-button" onClick={handleExport} disabled={filteredBookings.length === 0}>
                <span className="material-symbols-outlined">download</span> Xuất CSV
              </button>
            </div>
          </section>

          <section className="history-booking-list" aria-label="Danh sách đặt sân">
            {filteredBookings.length === 0 ? (
              <div className="history-empty">
                <span className="material-symbols-outlined">event_busy</span>
                <strong>{bookings.length ? "Không tìm thấy lượt đặt phù hợp" : "Chưa có dữ liệu đặt sân"}</strong>
                <p>{bookings.length ? "Thử từ khóa khác hoặc chọn trạng thái khác." : "Các lượt đặt sân của bạn sẽ xuất hiện tại đây."}</p>
              </div>
            ) : visibleBookings.map((booking, index) => {
              const statusCategory = normalizeStatusKey(booking.status);
              const bookingCode = `#BK${booking.id?.substring(0, 8).toUpperCase()}`;

              return (
                <article className={`history-booking-card ${index === 0 ? "history-booking-card--featured" : ""}`} key={booking.id || index}>
                  <div className="history-card-topline">
                    <span className={`history-status history-status--${statusCategory}`}>
                      <span />{getBookingStatusLabel(booking.status)}
                    </span>
                    <span className="history-booking-code">MÃ: {bookingCode}</span>
                    <span className="history-card-date">{new Date(booking.bookingDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                  <div className="history-card-main">
                    <div className="history-field-image">
                      {booking.image ? (
                        <img src={`http://127.0.0.1:8000${booking.image}`} alt={booking.fieldName} />
                      ) : (
                        <span className="material-symbols-outlined">stadium</span>
                      )}
                    </div>
                    <div className="history-field-details">
                      <h2>{booking.fieldName || "Sân bóng"}</h2>
                      <p><span className="material-symbols-outlined">location_on</span>{booking.fieldAddress || "Chưa cập nhật địa chỉ"}</p>
                      <div className="history-booking-meta">
                        <span><span className="material-symbols-outlined">calendar_month</span>{new Date(booking.bookingDate).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                        <span><span className="material-symbols-outlined">schedule</span>{booking.timeSlot || "Chưa có khung giờ"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="history-card-services">
                    <span className="history-services-label">DỊCH VỤ ĐI KÈM</span>
                    <BookingServiceRowItems bookingId={booking.id} />
                  </div>
                  <div className="history-card-footer">
                    <div className="history-card-total">
                      <span>Tổng chi phí</span>
                      <strong>{Number(booking.price || 0).toLocaleString("vi-VN")}đ</strong>
                      {booking.discountAmount > 0 && (
                        <small style={{ color: "#16a34a", fontWeight: 600, display: "block", fontSize: "0.75rem" }}>
                          (Đã giảm {Number(booking.discountAmount).toLocaleString("vi-VN")}đ với mã {booking.voucherCode})
                        </small>
                      )}
                    </div>
                    <div className="history-card-actions">
                      {isCompletedBooking(booking.status) && (
                        <span style={{ fontSize: "0.75rem", color: "#15803d", background: "#f0fdf4", padding: "4px 8px", borderRadius: 6, border: "1px solid #bbf7d0", display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>redeem</span>
                          Tặng voucher 10%
                        </span>
                      )}
                      {canCustomerCancel(booking.status) && (
                        <button
                          type="button"
                          className="btn-cancel-action"
                          onClick={() => handleCancel(booking.id)}
                          title="Hủy lượt đặt sân này"
                        >
                          <span className="material-symbols-outlined">cancel</span>
                          Hủy đặt sân
                        </button>
                      )}
                      {isCompletedBooking(booking.status) && !hasReviewedBooking(booking.is_reviewed) && (
                        <button onClick={() => setReviewingBooking(booking)} className="btn-review-action btn-review-inline">
                          <span className="material-symbols-outlined">star</span> Đánh giá
                        </button>
                      )}
                      {isCompletedBooking(booking.status) && hasReviewedBooking(booking.is_reviewed) && (
                        <span className="reviewed-label"><span className="material-symbols-outlined">task_alt</span> Đã đánh giá</span>
                      )}
                      <Link to={`/my-bookings/${booking.id}`} state={{ booking }} className="history-detail-link">
                        <span className="material-symbols-outlined">description</span> Chi tiết
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          {filteredBookings.length > 0 && (
            <nav className="history-pagination" aria-label="Phân trang lịch sử đặt sân">
              <span>Hiển thị {Math.min((currentPage - 1) * pageSize + 1, filteredBookings.length)}–{Math.min(currentPage * pageSize, filteredBookings.length)} trong {filteredBookings.length} lượt</span>
              <div>
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Trang trước">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
                  <button key={page} type="button" className={currentPage === page ? "active" : ""} onClick={() => setCurrentPage(page)} aria-current={currentPage === page ? "page" : undefined}>{page}</button>
                ))}
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage === pageCount} aria-label="Trang sau">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </nav>
          )}

          <section className="history-support-banner">
            <span className="material-symbols-outlined">support_agent</span>
            <div><strong>Cần hỗ trợ về lịch sử đặt sân?</strong><p>Mở chi tiết lượt đặt để xem lại thông tin và trạng thái.</p></div>
            <Link to="/lookup">Tra cứu đặt sân</Link>
          </section>
        </section>

        <aside className="history-rail">
          <section className="history-ticket-card">
            <div className="history-ticket-heading">
              <div><span className="material-symbols-outlined">qr_code_2</span><strong>VÉ VÀO SÂN ĐIỆN TỬ</strong></div>
              <span className="history-ticket-dot" />
            </div>
            {featuredBooking ? (
              <>
                <div className="history-ticket-qr">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${featuredBooking.id}`}
                    alt={`QR đặt sân ${featuredBooking.fieldName}`}
                  />
                  <strong>#BK{featuredBooking.id?.substring(0, 8).toUpperCase()}</strong>
                </div>
                <div className="history-ticket-info">
                  <strong>{featuredBooking.fieldName}</strong>
                  <span>{featuredBooking.timeSlot} · {new Date(featuredBooking.bookingDate).toLocaleDateString("vi-VN")}</span>
                  <small>Xuất trình mã QR này cho nhân viên khi đến sân.</small>
                </div>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${featuredBooking.id}`}
                  download={`ma-qr-dat-san-${featuredBooking.id?.substring(0, 8)}.png`}
                  className="history-ticket-download"
                >
                  <span className="material-symbols-outlined">download</span>Lưu ảnh QR vào điện thoại
                </a>
                <Link to={`/my-bookings/${featuredBooking.id}`} state={{ booking: featuredBooking }} className="history-ticket-link">
                  <span className="material-symbols-outlined">description</span> Xem chi tiết lượt đặt
                </Link>
              </>
            ) : (
              <div className="history-ticket-empty"><span className="material-symbols-outlined">confirmation_number</span><p>Đặt sân để nhận vé QR tại đây.</p></div>
            )}
          </section>

          <section className="history-rail-card history-promo-card">
            <span className="material-symbols-outlined">sports_soccer</span>
            <p>Tiếp tục trận đấu</p>
            <strong>Kéo đội bóng vào trận tiếp theo</strong>
            <Link to="/fields">Tìm sân phù hợp <span className="material-symbols-outlined">arrow_forward</span></Link>
          </section>

          <section className="history-rail-card history-policy-card">
            <h2><span className="material-symbols-outlined">verified_user</span>Quyền lợi người đặt sân</h2>
            <p><span className="material-symbols-outlined">check_circle</span>Thông tin đặt sân được lưu trong lịch sử tài khoản.</p>
            <p><span className="material-symbols-outlined">check_circle</span>Chỉ lượt đặt hoàn thành mới có thể gửi đánh giá.</p>
            <Link to="/lookup">Tra cứu mã đặt sân <span className="material-symbols-outlined">arrow_forward</span></Link>
          </section>

          <section className="history-rail-card history-support-card">
            <span className="material-symbols-outlined">headset_mic</span>
            <div><strong>Hỗ trợ khách hàng</strong><a href="tel:1900889922">1900 88 99 22</a><small>Hằng ngày · 06:00–23:00</small></div>
          </section>
        </aside>
      </main>

      {reviewingBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Đánh giá sân bóng</h3>
              <button onClick={() => setReviewingBooking(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 md:p-6">
              {submitSuccess ? (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  Cảm ơn bạn đã gửi đánh giá!
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                  {submitError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{submitError}</div>}
                  <div>
                    <label className="block text-sm font-medium mb-1">Mức độ hài lòng</label>
                    <select value={rating} onChange={(e) => setRating(e.target.value)} className="w-full border rounded-lg p-2.5">
                      <option value={5}>⭐⭐⭐⭐⭐ (Rất tuyệt vời)</option>
                      <option value={4}>⭐⭐⭐⭐ (Tuyệt vời)</option>
                      <option value={3}>⭐⭐⭐ (Bình thường)</option>
                      <option value={2}>⭐⭐ (Tạm được)</option>
                      <option value={1}>⭐ (Tệ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Nhận xét của bạn</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="4" className="w-full border rounded-lg p-2.5 resize-none"></textarea>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setReviewingBooking(null)} className="px-4 py-2 bg-slate-100 rounded-lg">Hủy</button>
                    <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg">Gửi đánh giá</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="modal" style={{ background: '#fff', borderRadius: '1rem', padding: '1.5rem', maxWidth: '400px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1e293b', margin: '0 0 0.5rem 0' }}>Xác nhận hủy đặt sân</h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>Bạn có chắc chắn muốn hủy lượt đặt sân này không?</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellingBookingId(null);
                }}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#64748b',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Không, giữ lại
              </button>
              <button
                onClick={confirmCancel}
                style={{
                  padding: '0.625rem 1.25rem',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '0.5rem',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Có, hủy đặt sân
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
