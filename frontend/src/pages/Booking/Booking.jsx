import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Booking.css";

const COUNTDOWN_SECONDS = 15;

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingData = location.state;

  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  /* ── Countdown modal state ─────────────────────────────────────── */
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      try {
        const res = await axios.get(
          `http://127.0.0.1:8000/api/users/profile/?user_id=${user.id}`
        );
        setCustomerName(res.data.fullname);
        setPhoneNumber(res.data.phone);
      } catch (err) {
        console.log("Lỗi lấy user:", err);
      }
    };
    fetchUser();
  }, []);

  /* Hủy / đóng modal */
  const handleCancel = () => {
    clearInterval(timerRef.current);
    setShowModal(false);
    setCountdown(COUNTDOWN_SECONDS);
  };

  /* Khởi động bộ đếm khi modal mở */
  useEffect(() => {
    if (!showModal) return;

    setCountdown(COUNTDOWN_SECONDS);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setShowModal(false);   // hết giờ → tự đóng
          return COUNTDOWN_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [showModal]);

  /* Mở modal khi nhấn nút submit */
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowModal(true);
  };


  /* Xác nhận thực sự đặt sân */
  const handleConfirm = async () => {
    clearInterval(timerRef.current);
    setSubmitting(true);

    const user = JSON.parse(localStorage.getItem("user"));
    const booking = {
      customer_id: user?.id,
      field_id: bookingData.fieldId,
      booking_date: bookingData.selectedDate,
      start_time: bookingData.selectedTimeSlot.split("-")[0].trim(),
      end_time: bookingData.selectedTimeSlot.split("-")[1].trim(),
      total_price: bookingData.price,
    };

    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/bookings/create/",
        booking
      );
      const bookingCode = res.data.booking_id;
      navigate("/booking/success", { state: { bookingCode } });
    } catch (err) {
      console.log("Lỗi đặt sân:", err);
      setSubmitting(false);
      setShowModal(false);
    }
  };

  const formattedDate = bookingData?.selectedDate
    ? new Date(bookingData.selectedDate).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
    : "Chưa chọn";

  /* Phần trăm vòng tròn đếm ngược */
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (countdown / COUNTDOWN_SECONDS) * circumference;
  const isLow = countdown <= 5;

  return (
    <main className="bk-page">
      <div className="bk-wrapper">

        {/* Page heading */}
        <div className="bk-heading">
          <h1>Xác nhận đặt sân</h1>
          <p>Vui lòng kiểm tra lại thông tin và hoàn tất biểu mẫu bên dưới</p>
        </div>

        <form onSubmit={handleSubmit} className="bk-layout">

          {/* ===== LEFT COLUMN ===== */}
          <div className="bk-left">

            {/* Customer Info Card */}
            <div className="bk-card">
              <h3 className="bk-card-title">
                <span className="bk-card-icon">🧑</span>
                Thông tin khách hàng
              </h3>

              <div className="bk-form-group bk-full">
                <label className="bk-label">Họ và tên *</label>
                <input
                  className="bk-input"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="bk-form-row">
                <div className="bk-form-group">
                  <label className="bk-label">Số điện thoại *</label>
                  <input
                    className="bk-input"
                    type="tel"
                    placeholder="090 123 4567"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="bk-form-group">
                  <label className="bk-label">Email (Tùy chọn)</label>
                  <input
                    className="bk-input"
                    type="email"
                    placeholder="example@gmail.com"
                  />
                </div>
              </div>

              <div className="bk-form-group bk-full">
                <label className="bk-label">Ghi chú thêm</label>
                <textarea
                  className="bk-input bk-textarea"
                  placeholder="Yêu cầu thêm về dụng cụ hoặc nước uống..."
                  rows={4}
                />
              </div>
            </div>

            {/* Payment Card */}
            <div className="bk-card">
              <h3 className="bk-card-title">
                <span className="bk-card-icon">💵</span>
                Phương thức thanh toán
              </h3>

              <label
                className={`bk-payment-option${paymentMethod === "cash" ? " selected" : ""
                  }`}
              >
                <div className="bk-radio-wrap">
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === "cash"}
                    onChange={() => setPaymentMethod("cash")}
                    className="bk-radio"
                  />
                </div>
                <div className="bk-payment-text">
                  <span className="bk-payment-name">Thanh toán tại sân</span>
                  <span className="bk-payment-desc">
                    Trả tiền mặt hoặc chuyển khoản tại quầy
                  </span>
                </div>
              </label>

              <label
                className={`bk-payment-option bk-payment-disabled${paymentMethod === "ewallet" ? " selected" : ""
                  }`}
              >
                <div className="bk-radio-wrap">
                  <input
                    type="radio"
                    name="payment"
                    value="ewallet"
                    disabled
                    className="bk-radio"
                  />
                </div>
                <div className="bk-payment-text">
                  <span className="bk-payment-name">
                    Ví điện tử MoMo / ZaloPay
                  </span>
                  <span className="bk-payment-desc">Sắp ra mắt</span>
                </div>
              </label>
            </div>
          </div>

          {/* ===== RIGHT COLUMN: Summary ===== */}
          <div className="bk-right">
            <div className="bk-summary-card">
              <h3 className="bk-summary-title">Chi tiết đặt sân</h3>

              {bookingData && (
                <>
                  <div className="bk-summary-row bk-summary-block">
                    <div className="bk-summary-label">SÂN BÓNG</div>
                    <div className="bk-summary-value-row">
                      <div>
                        <div className="bk-summary-value">
                          {bookingData.fieldName}
                        </div>
                        {bookingData.fieldAddress && (
                          <div className="bk-summary-sub">
                            {bookingData.fieldAddress}
                          </div>
                        )}
                      </div>
                      <span className="bk-summary-icon">🏟️</span>
                    </div>
                  </div>

                  <div className="bk-summary-divider" />

                  <div className="bk-summary-row bk-summary-block">
                    <div className="bk-summary-label">THỜI GIAN</div>
                    <div className="bk-summary-value-row">
                      <div>
                        <div className="bk-summary-value">
                          {bookingData.selectedTimeSlot || "Chưa chọn"}
                        </div>
                        <div className="bk-summary-sub">{formattedDate}</div>
                      </div>
                      <span className="bk-summary-icon">📅</span>
                    </div>
                  </div>

                  <div className="bk-summary-divider" />

                  <div className="bk-price-row">
                    <span>Giá thuê sân</span>
                    <span>
                      {bookingData.price
                        ? bookingData.price.toLocaleString() + "đ"
                        : "—"}
                    </span>
                  </div>
                  <div className="bk-price-row">
                    <span>Phí dịch vụ</span>
                    <span>0đ</span>
                  </div>

                  <div className="bk-summary-divider" />

                  <div className="bk-total-row">
                    <span>Tổng cộng</span>
                    <span className="bk-total-price">
                      {bookingData.price
                        ? bookingData.price.toLocaleString() + "đ"
                        : "—"}
                    </span>
                  </div>
                </>
              )}

              <button type="submit" className="bk-submit-btn">
                ✔ XÁC NHẬN ĐẶT SÂN
              </button>

              <p className="bk-terms">
                Bằng cách nhấn nút này, bạn đồng ý với các{" "}
                <a href="#" className="bk-terms-link">
                  Điều khoản &amp; Chính sách
                </a>{" "}
                của chúng tôi.
              </p>
            </div>

            {/* Info note */}
            <div className="bk-info-note">
              <span className="bk-info-icon">ℹ️</span>
              <p>
                Chúng tôi sẽ gửi tin nhắn xác nhận đến số điện thoại của bạn
                ngay sau khi bạn đặt sân thành công.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* ═══════════════ COUNTDOWN MODAL ═══════════════ */}
      {showModal && (
        <div className="cd-overlay" onClick={handleCancel}>
          <div
            className={`cd-modal${isLow ? " cd-modal--urgent" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="cd-header">
              <span className="cd-header-icon">⚽</span>
              <h2 className="cd-title">Xác nhận đặt sân</h2>
              <p className="cd-subtitle">
                Vui lòng xác nhận trong thời gian quy định
              </p>
            </div>

            {/* Booking summary mini */}
            <div className="cd-info-box">
              <div className="cd-info-row">
                <span className="cd-info-label">🏟️ Sân</span>
                <span className="cd-info-value">
                  {bookingData?.fieldName || "—"}
                </span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">📅 Ngày</span>
                <span className="cd-info-value">{formattedDate}</span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">🕐 Giờ</span>
                <span className="cd-info-value">
                  {bookingData?.selectedTimeSlot || "—"}
                </span>
              </div>
              <div className="cd-info-row cd-info-row--total">
                <span className="cd-info-label">💰 Tổng</span>
                <span className="cd-info-value cd-info-price">
                  {bookingData?.price
                    ? bookingData.price.toLocaleString() + "đ"
                    : "—"}
                </span>
              </div>
            </div>

            {/* Circular countdown */}
            <div className="cd-timer-wrap">
              <svg className="cd-ring" viewBox="0 0 88 88">
                {/* background circle */}
                <circle
                  cx="44" cy="44" r={radius}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="7"
                />
                {/* progress arc */}
                <circle
                  cx="44" cy="44" r={radius}
                  fill="none"
                  stroke={isLow ? "#ef4444" : "#16a34a"}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
                  transform="rotate(-90 44 44)"
                />
              </svg>
              <div className={`cd-timer-num${isLow ? " cd-timer-num--low" : ""}`}>
                {countdown}
              </div>
              <p className="cd-timer-label">giây còn lại</p>
            </div>

            {/* Warning when low */}
            {isLow && (
              <p className="cd-warning">
                ⚠️ Sắp hết thời gian! Nhấn xác nhận ngay.
              </p>
            )}

            {/* Buttons */}
            <div className="cd-actions">
              <button
                className="cd-btn cd-btn--cancel"
                onClick={handleCancel}
                disabled={submitting}
              >
                ✕ Hủy bỏ
              </button>
              <button
                className="cd-btn cd-btn--confirm"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <span className="cd-spinner" />
                ) : (
                  "✔ Xác nhận"
                )}
              </button>
            </div>

            <p className="cd-note">
              Nếu không xác nhận trong {COUNTDOWN_SECONDS}s, yêu cầu sẽ tự động hủy
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default Booking;