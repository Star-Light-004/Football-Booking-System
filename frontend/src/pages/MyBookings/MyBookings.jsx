import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { BASE_URL } from "../../config";
import PageHero from "../../components/PageHero/PageHero";
import { broadcastSyncEvent, onSyncEvent } from "../../utils/realtimeSync";
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
    case "pending": return "Chờ xác nhận";
    case "confirmed": return "Đã xác nhận";
    case "checked_in": return "Đã check-in";
    case "completed": return "Đã hoàn thành";
    case "cancelled": return "Đã hủy";
    default: return status || "Đã đặt";
  }
};

const cleanTimeSlot = (slot) => {
  if (!slot) return "";
  return slot
    .split("-")
    .map((p) => {
      const trimmed = p.trim();
      const m = trimmed.match(/^(\d{1,2}:\d{2})/);
      return m ? m[1] : trimmed;
    })
    .join(" - ");
};

const STATUS_TABS = [
  { id: "all", label: "Tất cả", icon: "apps" },
  { id: "pending", label: "Chờ xác nhận", icon: "pending_actions" },
  { id: "confirmed", label: "Đã xác nhận", icon: "check_circle" },
  { id: "checked_in", label: "Đã check-in", icon: "login" },
  { id: "completed", label: "Hoàn thành", icon: "task_alt" },
  { id: "cancelled", label: "Đã hủy", icon: "cancel" },
];

const RATING_LEVELS = [
  { value: 5, label: "Rất tuyệt vời", desc: "Mặt sân, trang thiết bị và dịch vụ đều hoàn hảo!", color: "#16a34a", bg: "#f0fdf4" },
  { value: 4, label: "Hài lòng", desc: "Chất lượng sân tốt, trải nghiệm thi đấu tuyệt vời.", color: "#059669", bg: "#ecfdf5" },
  { value: 3, label: "Bình thường", desc: "Sân mức ổn, đáp ứng tốt nhu cầu thi đấu cơ bản.", color: "#d97706", bg: "#fffbeb" },
  { value: 2, label: "Chưa hài lòng", desc: "Cần cải thiện thêm về mặt cỏ hoặc dịch vụ hỗ trợ.", color: "#ea580c", bg: "#fff7ed" },
  { value: 1, label: "Thất vọng", desc: "Trải nghiệm không tốt, mong sân sớm khắc phục.", color: "#dc2626", bg: "#fef2f2" },
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
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const { toasts, removeToast, toast } = useToast();

  const bookingsRef = useRef([]);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);

  const fetchMyBookings = async (userId, isSilent = false) => {
    if (!userId) return;
    try {
      const res = await fetch(`${BASE_URL}/bookings/user/${userId}/`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Kiểm tra xem có trạng thái đơn nào vừa được Ban quản lý thay đổi không
        if (isSilent && bookingsRef.current.length > 0) {
          const oldMap = new Map(bookingsRef.current.map((b) => [b.id, b.status]));
          const changed = data.find((b) => oldMap.has(b.id) && oldMap.get(b.id) !== b.status);
          if (changed) {
            toast.info(`Đơn đặt sân "${changed.fieldName || 'bóng đá'}" vừa được cập nhật: ${getBookingStatusLabel(changed.status)}`);
          }
        }
        setBookings(data);
      }
    } catch (err) {
      console.log("Lỗi load bookings:", err);
    }
  };

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
    fetchMyBookings(userData?.id, false);

    // 1. Đồng bộ tức thì khi có sự kiện từ tab khác (Cross-tab sync 0ms)
    const cleanupSync = onSyncEvent((event) => {
      if (event.type?.startsWith("booking_")) {
        fetchMyBookings(userData?.id, true);
      }
    });

    // 2. Smart Polling tự động kiểm tra mỗi 3.5 giây khi tab đang hiển thị
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible" && userData?.id) {
        fetchMyBookings(userData?.id, true);
      }
    }, 3500);

    // 3. Cập nhật tức thì khi người dùng chuyển lại vào tab này
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && userData?.id) {
        fetchMyBookings(userData?.id, true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanupSync();
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
          setHoverRating(0);
          setComment("");
          fetchMyBookings(user.id);
        }, 1800);
      } else {
        setSubmitError(data.error || "Có lỗi xảy ra khi gửi đánh giá");
      }
    } catch (error) {
      setSubmitError("Lỗi kết nối máy chủ");
    }
  };

  const openReviewModal = (booking) => {
    setReviewingBooking(booking);
    setRating(5);
    setHoverRating(0);
    setComment("");
    setSubmitError("");
    setSubmitSuccess(false);
  };

  const currentRatingLevel =
    RATING_LEVELS.find((r) => r.value === Number(hoverRating || rating)) || RATING_LEVELS[0];

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
        broadcastSyncEvent("booking_cancelled", { bookingId: cancellingBookingId });
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
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    const dateCmp = (b.bookingDate || "").localeCompare(a.bookingDate || "");
    if (dateCmp !== 0) return dateCmp;
    const getStartTime = (slot) => (slot || "").split("-")[0]?.trim() || "";
    return getStartTime(a.timeSlot).localeCompare(getStartTime(b.timeSlot));
  });

  const fieldOptions = [...new Set(bookings.map((booking) => booking.fieldName).filter(Boolean))];
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(sortedBookings.length / pageSize));
  const visibleBookings = sortedBookings.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const featuredBooking = sortedBookings.find((booking) => normalizeStatusKey(booking.status) !== "cancelled") || sortedBookings[0];

  const handleExport = () => {
    const rows = [
      ["Mã đặt sân", "Sân bóng", "Địa chỉ", "Ngày thi đấu", "Khung giờ", "Chi phí", "Trạng thái"],
      ...sortedBookings.map((booking) => [
        `BK${booking.id?.substring(0, 8).toUpperCase()}`,
        booking.fieldName,
        booking.fieldAddress,
        booking.bookingDate,
        cleanTimeSlot(booking.timeSlot),
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
                        <span><span className="material-symbols-outlined">schedule</span>{cleanTimeSlot(booking.timeSlot) || "Chưa có khung giờ"}</span>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "2px" }}>
                        <strong>{Number(booking.price || 0).toLocaleString("vi-VN")}đ</strong>

                        {/* Thông tin thanh toán người dùng đã chọn */}
                        {(() => {
                          const pay = booking.payment_info || {};
                          const badgeType = pay.badge_type || "pay_at_field";
                          const iconMap = {
                            deposit_paid: "payments",
                            full_paid: "verified",
                            pending_deposit: "hourglass_top",
                            pending_full: "hourglass_top",
                            pay_at_field: "storefront",
                          };
                          const icon = iconMap[badgeType] || "payments";

                          return (
                            <span className={`myb-pay-badge myb-pay-badge--${badgeType}`} title={pay.sub_label || pay.method}>
                              <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>{icon}</span>
                              <span>{pay.status_label || "Thanh toán tại sân"}</span>
                            </span>
                          );
                        })()}
                      </div>

                      {/* Dòng chi tiết phụ nếu có tiền cọc hoặc phương thức */}
                      {(() => {
                        const pay = booking.payment_info;
                        if (pay?.sub_label) {
                          return (
                            <small
                              style={{
                                color: pay.badge_type === "deposit_paid" ? "#d97706" : "#64748b",
                                fontWeight: 600,
                                display: "block",
                                fontSize: "0.75rem",
                                marginTop: "2px",
                              }}
                            >
                              {pay.sub_label}
                            </small>
                          );
                        }
                        return null;
                      })()}

                      {booking.discountAmount > 0 && (
                        <small style={{ color: "#16a34a", fontWeight: 600, display: "block", fontSize: "0.75rem", marginTop: "2px" }}>
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
                        <button onClick={() => openReviewModal(booking)} className="btn-review-action btn-review-inline">
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
                  <span>{cleanTimeSlot(featuredBooking.timeSlot)} · {new Date(featuredBooking.bookingDate).toLocaleDateString("vi-VN")}</span>
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
        <div className="review-modal-overlay" onClick={() => setReviewingBooking(null)}>
          <div className="review-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-header">
              <div className="review-modal-title-group">
                <div className="review-modal-icon-badge">
                  <span className="material-symbols-outlined">rate_review</span>
                </div>
                <div>
                  <h3 className="review-modal-title">Đánh giá sân bóng</h3>
                  <p className="review-modal-subtitle">Góp ý trải nghiệm để nâng cao chất lượng dịch vụ</p>
                </div>
              </div>
              <button
                type="button"
                className="review-modal-close"
                onClick={() => setReviewingBooking(null)}
                aria-label="Đóng modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="review-modal-body">
              {submitSuccess ? (
                <div className="review-success-state">
                  <div className="review-success-icon-wrap">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <h4>Đã gửi đánh giá thành công!</h4>
                  <p>Cảm ơn bạn đã đóng góp ý kiến quý báu giúp ban quản lý nâng cao chất lượng sân bóng.</p>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="review-form">
                  {submitError && (
                    <div className="review-error-banner">
                      <span className="material-symbols-outlined">error</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Field preview card */}
                  <div className="review-field-preview">
                    <div className="review-field-avatar">
                      <span className="material-symbols-outlined">sports_soccer</span>
                    </div>
                    <div className="review-field-info">
                      <h4>{reviewingBooking.fieldName || reviewingBooking.field || "Sân bóng đá"}</h4>
                      <div className="review-field-meta">
                        {(reviewingBooking.bookingDate || reviewingBooking.date) && (
                          <span>
                            <span className="material-symbols-outlined">calendar_today</span>
                            {new Date(reviewingBooking.bookingDate || reviewingBooking.date).toLocaleDateString("vi-VN")}
                          </span>
                        )}
                        {(reviewingBooking.timeSlot || reviewingBooking.time) && (
                          <span>
                            <span className="material-symbols-outlined">schedule</span>
                            {reviewingBooking.timeSlot || reviewingBooking.time}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div className="review-form-group">
                    <label className="review-field-label">
                      <span>Mức độ hài lòng</span>
                      <span
                        className="review-rating-active-pill"
                        style={{ color: currentRatingLevel.color, background: currentRatingLevel.bg }}
                      >
                        {currentRatingLevel.label}
                      </span>
                    </label>

                    <div className="review-stars-wrapper">
                      <div className="review-stars-list" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = (hoverRating || rating) >= star;
                          return (
                            <button
                              type="button"
                              key={star}
                              className={`review-star-item ${isFilled ? "filled" : ""}`}
                              onMouseEnter={() => setHoverRating(star)}
                              onClick={() => setRating(star)}
                              aria-label={`${star} sao`}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                star
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <span className="review-rating-score-text">
                        <strong>{hoverRating || rating}</strong>/5
                      </span>
                    </div>
                    <p className="review-level-desc">{currentRatingLevel.desc}</p>
                  </div>

                  {/* Comment Textarea */}
                  <div className="review-form-group">
                    <div className="review-label-between">
                      <label className="review-field-label" htmlFor="review-comment-input">
                        Nhận xét của bạn
                      </label>
                      <span className="review-counter">{comment.length}/500</span>
                    </div>
                    <textarea
                      id="review-comment-input"
                      value={comment}
                      maxLength={500}
                      onChange={(e) => setComment(e.target.value)}
                      rows="4"
                      placeholder="Hãy chia sẻ thêm về chất lượng mặt cỏ, hệ thống chiếu sáng, bóng thi đấu, phòng thay đồ hoặc thái độ phục vụ..."
                      className="review-textarea"
                    />
                  </div>

                  {/* Actions */}
                  <div className="review-modal-actions">
                    <button
                      type="button"
                      onClick={() => setReviewingBooking(null)}
                      className="btn-review-secondary"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="btn-review-primary"
                    >
                      <span className="material-symbols-outlined">send</span>
                      Gửi đánh giá
                    </button>
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
