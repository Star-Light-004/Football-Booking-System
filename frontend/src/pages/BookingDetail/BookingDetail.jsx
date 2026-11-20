import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { getBookingServices } from "../../api/servicesApi";
import { useToast, ToastContainer } from "../../components/Toast/Toast";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import PageHero from "../../components/PageHero/PageHero";
import { BASE_URL } from "../../config";
import "./BookingDetail.css";

const canCustomerCancel = (status) => {
  const s = String(status || "").trim().toLowerCase();
  return ["pending", "chờ xác nhận", "cho xac nhan", "confirmed", "đã xác nhận", "da xac nhan"].includes(s);
};

const resolveImgUrl = (urlOrPath) => {
  if (!urlOrPath) return "";
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) return urlOrPath;
  const baseUrl = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace("/api", "") : "http://localhost:8000";
  return `${baseUrl}${urlOrPath.startsWith("/") ? "" : "/"}${urlOrPath}`;
};

const formatDateLongVN = (dateStr) => {
  if (!dateStr) return "Chưa xác định";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const getStatusConfig = (status) => {
  const s = String(status || "").trim().toLowerCase();
  if (s === "confirmed" || s === "đã xác nhận" || s === "da xac nhan") {
    return {
      label: "Đã xác nhận",
      badgeClass: "bkd-status--confirmed",
      icon: "check_circle",
      desc: "Lượt đặt sân của bạn đã được xác nhận thành công. Vui lòng đến đúng giờ để nhận sân thi đấu.",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
    };
  }
  if (s === "completed" || s === "hoàn thành" || s === "hoan thanh") {
    return {
      label: "Đã hoàn thành",
      badgeClass: "bkd-status--completed",
      icon: "task_alt",
      desc: "Trận đấu đã kết thúc. Cảm ơn bạn đã lựa chọn thi đấu tại Cụm sân bóng đá nhân tạo Hải Châu!",
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
    };
  }
  if (s === "cancelled" || s === "đã hủy" || s === "da huy") {
    return {
      label: "Đã hủy",
      badgeClass: "bkd-status--cancelled",
      icon: "cancel",
      desc: "Lượt đặt sân này đã được hủy bỏ.",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
    };
  }
  return {
    label: "Chờ xác nhận",
    badgeClass: "bkd-status--pending",
    icon: "hourglass_top",
    desc: "Đơn đặt sân đang được bộ phận lễ tân kiểm duyệt và giữ khung giờ thi đấu.",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  };
};

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, removeToast, toast } = useToast();

  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (location.state?.booking) {
      setBooking(location.state.booking);
    } else if (id) {
      setLoadingBooking(true);
      fetch(`${BASE_URL}/bookings/${id}/update/`)
        .then((res) => {
          if (!res.ok) throw new Error("Không tìm thấy đơn");
          return res.json();
        })
        .then((data) => {
          setBooking(data);
        })
        .catch((err) => {
          console.error("Lỗi lấy thông tin đặt sân:", err);
          toast.error("Không tìm thấy thông tin lượt đặt sân này");
        })
        .finally(() => setLoadingBooking(false));
    }
  }, [id, location.state]);

  useEffect(() => {
    if (!booking?.id) return;
    setLoadingServices(true);
    getBookingServices(booking.id)
      .then((res) => setServices(res.data || []))
      .catch((err) => console.error("Lỗi lấy dịch vụ:", err))
      .finally(() => setLoadingServices(false));
  }, [booking?.id]);

  const handleConfirmCancelBooking = async () => {
    if (!booking?.id) return;
    try {
      setCancelling(true);
      const response = await fetch(`${BASE_URL}/bookings/${booking.id}/update/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Cancelled" }),
      });

      if (response.ok) {
        toast.success("Đã hủy đặt sân thành công!");
        setBooking((prev) => ({ ...prev, status: "Cancelled" }));
        setShowCancelConfirm(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Có lỗi xảy ra khi hủy đặt sân");
      }
    } catch (error) {
      console.error("Lỗi khi hủy đặt sân:", error);
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success(`Đã sao chép mã đặt sân: ${code}`);
  };

  if (loadingBooking) {
    return (
      <div className="bkd-page-wrapper">
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <div className="bkd-loading-state">
          <span className="material-symbols-outlined bkd-spin-icon">progress_activity</span>
          <p>Đang tải thông tin chi tiết lượt đặt sân...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="bkd-page-wrapper">
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <div className="bkd-empty-state">
          <span className="material-symbols-outlined">receipt_long</span>
          <h2>Không tìm thấy thông tin lượt đặt sân</h2>
          <p>Mã đặt sân không tồn tại hoặc bạn không có quyền xem thông tin này.</p>
          <Link to="/my-bookings" className="bkd-btn-primary">
            Quay lại lịch sử đặt sân
          </Link>
        </div>
      </div>
    );
  }

  const stCfg = getStatusConfig(booking.status);
  const shortId = `#BK-${String(booking.id).slice(0, 8).toUpperCase()}`;
  const totalAmount = Number(booking.price || 0);
  const discountVal = Number(booking.discountAmount || 0);
  const fieldImgUrl = resolveImgUrl(booking.fieldImage || booking.image);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=BK-${booking.id}`;

  return (
    <div className="bkd-page-wrapper">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <PageHero
        breadcrumb={[
          { label: "Trang chủ", to: "/" },
          { label: "Lịch sử đặt sân", to: "/my-bookings" },
          { label: `Đơn ${shortId}` },
        ]}
        eyebrow="CHI TIẾT VÉ THI ĐẤU"
        title={`Chi tiết đơn đặt ${shortId}`}
        description="Quản lý thông tin chi tiết lịch thi đấu, dịch vụ đi kèm và thẻ nhận sân của bạn."
        action={(
          <div className="bkd-hero-actions">
            <Link to="/my-bookings" className="bkd-hero-btn bkd-hero-btn--back">
              <span className="material-symbols-outlined">arrow_back</span>
              Quay lại danh sách
            </Link>
            <Link to="/fields" className="bkd-hero-btn bkd-hero-btn--new">
              <span className="material-symbols-outlined">sports_soccer</span>
              Đặt sân mới
            </Link>
          </div>
        )}
      />

      <div className="bkd-container">
        {/* ── Status Banner ── */}
        <div
          className="bkd-status-banner"
          style={{
            backgroundColor: stCfg.bg,
            borderColor: stCfg.border,
            color: stCfg.color,
          }}
        >
          <div className="bkd-status-banner__icon">
            <span className="material-symbols-outlined">{stCfg.icon}</span>
          </div>
          <div className="bkd-status-banner__content">
            <div className="bkd-status-banner__badge">
              <span className="bkd-dot" style={{ backgroundColor: stCfg.color }} />
              <strong>{stCfg.label}</strong>
              <span className="bkd-id-tag">{shortId}</span>
            </div>
            <p className="bkd-status-banner__desc">{stCfg.desc}</p>
          </div>
          <div className="bkd-status-banner__actions">
            <button
              type="button"
              className="bkd-btn-copy"
              onClick={() => handleCopyCode(shortId)}
              title="Sao chép mã đặt sân"
            >
              <span className="material-symbols-outlined">content_copy</span>
              <span>Sao chép mã</span>
            </button>
            <button
              type="button"
              className="bkd-btn-print"
              onClick={() => window.print()}
              title="In phiếu đặt sân"
            >
              <span className="material-symbols-outlined">print</span>
              <span>In vé</span>
            </button>
          </div>
        </div>

        {/* ── Main 2-Column Content Grid ── */}
        <div className="bkd-main-grid">
          {/* ══ CỘT TRÁI: Chi tiết sân & dịch vụ ══ */}
          <div className="bkd-left-col">
            {/* 1. Thẻ sân bóng */}
            <div className="bkd-card bkd-field-card">
              <div className="bkd-field-media">
                {fieldImgUrl ? (
                  <img
                    src={fieldImgUrl}
                    alt={booking.fieldName || "Sân bóng"}
                    className="bkd-field-img"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.parentElement?.querySelector(".bkd-field-fallback");
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="bkd-field-fallback"
                  style={{ display: fieldImgUrl ? "none" : "flex" }}
                >
                  <span className="material-symbols-outlined">sports_soccer</span>
                </div>
                <div className="bkd-field-badge">
                  <span className="material-symbols-outlined">stadium</span>
                  <span>Cụm sân Hải Châu, Đà Nẵng</span>
                </div>
              </div>

              <div className="bkd-field-info">
                <div className="bkd-field-header">
                  <div>
                    <span className="bkd-section-kicker">THÔNG TIN SÂN BÓNG</span>
                    <h2 className="bkd-field-title">{booking.fieldName || "Sân bóng đá cỏ nhân tạo"}</h2>
                  </div>
                  <span className="bkd-tag-grass">Mặt cỏ FIFA tiêu chuẩn</span>
                </div>

                <div className="bkd-field-address">
                  <span className="material-symbols-outlined">location_on</span>
                  <span>{booking.fieldAddress || "Đường 2 Tháng 9, Quận Hải Châu, Đà Nẵng"}</span>
                </div>
              </div>
            </div>

            {/* 2. Thẻ Lịch Thi Đấu & Thời Gian */}
            <div className="bkd-card">
              <div className="bkd-card-header">
                <span className="material-symbols-outlined bkd-header-icon">calendar_month</span>
                <h3>Lịch Thi Đấu &amp; Khung Giờ</h3>
              </div>

              <div className="bkd-info-grid">
                <div className="bkd-info-item">
                  <span className="bkd-info-label">Ngày thi đấu</span>
                  <div className="bkd-info-value bkd-highlight">
                    <span className="material-symbols-outlined">event</span>
                    <strong>{formatDateLongVN(booking.bookingDate)}</strong>
                  </div>
                </div>

                <div className="bkd-info-item">
                  <span className="bkd-info-label">Khung giờ đặt sân</span>
                  <div className="bkd-info-value bkd-highlight-time">
                    <span className="material-symbols-outlined">schedule</span>
                    <strong>{booking.timeSlot}</strong>
                  </div>
                </div>

                <div className="bkd-info-item">
                  <span className="bkd-info-label">Người đặt sân</span>
                  <div className="bkd-info-value">
                    <span className="material-symbols-outlined">person</span>
                    <span>{booking.customerName || "Khách hàng"}</span>
                  </div>
                </div>

                <div className="bkd-info-item">
                  <span className="bkd-info-label">Số điện thoại liên hệ</span>
                  <div className="bkd-info-value">
                    <span className="material-symbols-outlined">call</span>
                    <span>{booking.phone || "Chưa cung cấp"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Dịch vụ & Vật tư đi kèm */}
            <div className="bkd-card">
              <div className="bkd-card-header">
                <span className="material-symbols-outlined bkd-header-icon">inventory_2</span>
                <h3>Dịch Vụ &amp; Tiện Ích Đã Chọn</h3>
              </div>

              {loadingServices ? (
                <div className="bkd-services-loading">
                  <span className="material-symbols-outlined bkd-spin-icon">progress_activity</span>
                  <span>Đang tải thông tin dịch vụ...</span>
                </div>
              ) : services.length > 0 ? (
                <div className="bkd-services-list">
                  {services.map((item) => (
                    <div key={item.id} className="bkd-service-row">
                      <div className="bkd-service-main">
                        <div className="bkd-service-icon-box">
                          <span className="material-symbols-outlined">
                            {/giày|giay|shoe/i.test(item.service_name) ? "sports" : "sports_soccer"}
                          </span>
                        </div>
                        <div>
                          <strong className="bkd-service-name">
                            {item.service_name}
                            {item.shoe_size ? ` (Size ${item.shoe_size})` : ""}
                          </strong>
                          <div className="bkd-service-sub">Số lượng: ×{item.quantity}</div>
                        </div>
                      </div>
                      <div className="bkd-service-total">
                        {Number(item.total_price || 0).toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bkd-services-empty">
                  <span className="material-symbols-outlined">dry_cleaning</span>
                  <p>Không đăng ký dịch vụ phụ trợ thêm trong lượt đặt này.</p>
                </div>
              )}
            </div>

            {/* 4. Tổng Kết Chi Phí & Thanh Toán */}
            <div className="bkd-card bkd-invoice-card">
              <div className="bkd-card-header">
                <span className="material-symbols-outlined bkd-header-icon">payments</span>
                <h3>Chi Tiết Thanh Toán</h3>
              </div>

              <div className="bkd-invoice-rows">
                <div className="bkd-invoice-row">
                  <span className="bkd-invoice-label">Tiền thuê sân bóng</span>
                  <span className="bkd-invoice-val">
                    {(totalAmount + discountVal).toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {discountVal > 0 && (
                  <div className="bkd-invoice-row bkd-discount-row">
                    <span className="bkd-invoice-label">
                      Giảm giá Voucher {booking.voucherCode ? `(${booking.voucherCode})` : ""}
                    </span>
                    <span className="bkd-invoice-val">- {discountVal.toLocaleString("vi-VN")}đ</span>
                  </div>
                )}

                <div className="bkd-invoice-divider" />

                <div className="bkd-invoice-row bkd-invoice-row--total">
                  <div>
                    <span className="bkd-total-label">Tổng thanh toán</span>
                    <span className="bkd-vat-note">(Đã bao gồm chiếu sáng ban đêm &amp; VAT)</span>
                  </div>
                  <strong className="bkd-total-amount">
                    {totalAmount.toLocaleString("vi-VN")} VNĐ
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* ══ CỘT PHẢI: Vé QR điện tử & Thao tác ══ */}
          <div className="bkd-right-col">
            {/* Vé vào sân điện tử (QR Card) */}
            <div className="bkd-ticket-card">
              <div className="bkd-ticket-top-notch" />
              <div className="bkd-ticket-header">
                <div className="bkd-ticket-header-title">
                  <span className="material-symbols-outlined">qr_code_scanner</span>
                  <span>VÉ VÀO SÂN ĐIỆN TỬ</span>
                </div>
                <div className="bkd-ticket-stadium">SÂN BÓNG HẢI CHÂU</div>
              </div>

              <div className="bkd-ticket-body">
                <div className="bkd-qr-image-wrapper">
                  <img
                    src={qrUrl}
                    alt={`Mã QR vé vào sân ${shortId}`}
                    className="bkd-qr-image"
                  />
                  <div className="bkd-qr-code-txt">{shortId}</div>
                </div>

                <div className="bkd-ticket-details">
                  <div className="bkd-ticket-row">
                    <span className="bkd-tk-lbl">Sân thi đấu:</span>
                    <strong className="bkd-tk-val">{booking.fieldName}</strong>
                  </div>
                  <div className="bkd-ticket-row">
                    <span className="bkd-tk-lbl">Thời gian:</span>
                    <strong className="bkd-tk-val">{booking.timeSlot}</strong>
                  </div>
                  <div className="bkd-ticket-row">
                    <span className="bkd-tk-lbl">Ngày đá:</span>
                    <strong className="bkd-tk-val">{booking.bookingDate}</strong>
                  </div>
                </div>

                <div className="bkd-ticket-hint">
                  <span className="material-symbols-outlined">info</span>
                  <span>
                    Xuất trình mã QR này hoặc cung cấp mã <strong>{shortId}</strong> cho nhân viên lễ tân tại quầy khi đến sân.
                  </span>
                </div>

                <a
                  href={qrUrl}
                  download={`ve-vao-san-${shortId.replace('#', '')}.png`}
                  className="bkd-btn-download-qr"
                >
                  <span className="material-symbols-outlined">download</span>
                  <span>Lưu ảnh QR vào điện thoại</span>
                </a>
              </div>
              <div className="bkd-ticket-bottom-notch" />
            </div>

            {/* Khối Thao tác & Hỗ trợ */}
            <div className="bkd-card bkd-actions-card">
              <div className="bkd-card-header">
                <span className="material-symbols-outlined bkd-header-icon">settings</span>
                <h3>Thao Tác Với Đơn</h3>
              </div>

              <div className="bkd-action-buttons">
                {canCustomerCancel(booking.status) && (
                  <button
                    type="button"
                    className="bkd-btn-cancel-order"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    <span className="material-symbols-outlined">event_busy</span>
                    <span>Hủy lượt đặt sân này</span>
                  </button>
                )}

                <button
                  type="button"
                  className="bkd-btn-rebook"
                  onClick={() => navigate("/fields")}
                >
                  <span className="material-symbols-outlined">sports_soccer</span>
                  <span>Đặt thêm sân khác</span>
                </button>
              </div>

              <div className="bkd-support-box">
                <div className="bkd-support-title">
                  <span className="material-symbols-outlined">support_agent</span>
                  <strong>Cần hỗ trợ về lịch đặt?</strong>
                </div>
                <p>
                  Hotline ban quản lý: <a href="tel:0905123456">0905 123 456</a> (Hỗ trợ 24/7)
                </p>
                <small>Địa chỉ: Đường 2 Tháng 9, Phường Hòa Cường Bắc, Quận Hải Châu, Đà Nẵng</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Xác Nhận Hủy Đặt Sân */}
      <ConfirmModal
        isOpen={showCancelConfirm}
        title="Xác nhận hủy đặt sân"
        message={`Bạn có chắc chắn muốn hủy lượt đặt sân #${shortId} không? Lịch sân sẽ được mở lại cho người khác và hành động này không thể hoàn tác.`}
        confirmText={cancelling ? "Đang hủy..." : "Hủy đặt sân"}
        cancelText="Giữ lại đơn"
        type="danger"
        onConfirm={handleConfirmCancelBooking}
        onClose={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};

export default BookingDetail;
