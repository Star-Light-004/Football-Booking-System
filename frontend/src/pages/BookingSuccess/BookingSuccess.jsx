import React, { useState } from "react";
import { useLocation, Link } from "react-router-dom";
import "./BookingSuccess.css";

const formatBookingDate = (dateValue) => {
  if (!dateValue) return "Chưa có thông tin";
  const [year, month, day] = dateValue.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("vi-VN", { weekday: "long" });
  return `${weekday}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};

const formatPrice = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const BookingSuccess = () => {
  const location = useLocation();
  const [shareFeedback, setShareFeedback] = useState("");
  const { bookingCode, fullId, bookingDetails } = location.state || {
    bookingCode: "BK123456",
    fullId: "",
    bookingDetails: null,
  };
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${fullId || bookingCode}`;

  const handleShare = async () => {
    const shareText = `Mã đặt sân: #BK${bookingCode}${fullId ? `\nMã đặt chỗ: ${fullId}` : ""}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Vé đặt sân", text: shareText });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShareFeedback("Đã sao chép mã đặt sân để chia sẻ.");
      } else {
        window.prompt("Sao chép mã đặt sân để chia sẻ:", shareText);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setShareFeedback("Không thể chia sẻ mã đặt sân lúc này.");
      }
    }
  };

  return (
    <main className="bs-page">
      <div className="bs-container">
        <nav className="bs-stepper" aria-label="Tiến trình đặt sân">
          <div className="bs-step bs-step--complete">
            <span className="bs-step__marker"><span className="material-symbols-outlined">check</span></span>
            <span className="bs-step__label">1. Chọn sân & giờ</span>
          </div>
          <span className="bs-step__line bs-step__line--complete" />
          <div className="bs-step bs-step--complete">
            <span className="bs-step__marker"><span className="material-symbols-outlined">check</span></span>
            <span className="bs-step__label">2. Thông tin & thanh toán</span>
          </div>
          <span className="bs-step__line" />
          <div className="bs-step bs-step--active">
            <span className="bs-step__marker">3</span>
            <span className="bs-step__label">3. Nhận mã QR sân</span>
          </div>
        </nav>

        <header className="bs-heading-row">
          <div className="bs-heading">
            <span className="bs-success-pill">
              <span className="material-symbols-outlined">check_circle</span>
              Đặt sân thành công
            </span>
            <h1>Xác nhận đặt sân thành công</h1>
            <p>Cảm ơn bạn đã đặt sân. Hãy lưu mã xác nhận và xuất trình QR khi đến sân.</p>
          </div>
          <div className="bs-code-chip">
            <span className="material-symbols-outlined">qr_code_2</span>
            <span className="bs-code-chip__text">
              <small>Mã đặt sân chính thức</small>
              <strong>#BK{bookingCode}</strong>
            </span>
          </div>
        </header>

        <section className="bs-main-grid" aria-label="Thông tin xác nhận">
          <article className="bs-ticket-panel">
            <div className="bs-panel-header">
              <span className="material-symbols-outlined">confirmation_number</span>
              <div>
                <h2>Vé điện tử của bạn</h2>
                <p>Xuất trình mã QR này khi đến sân</p>
              </div>
              <span className="bs-active-tag">HỢP LỆ</span>
            </div>
            <div className="bs-ticket-content">
              <div className="bs-ticket-reference">
                <span>Mã tham chiếu đặt sân</span>
                <strong>#BK{bookingCode}</strong>
              </div>
              <div className="bs-qr-frame">
                <img
                  src={qrCodeUrl}
                  alt="Mã QR xác nhận đặt sân"
                />
                <span className="bs-qr-caption">
                  <span className="material-symbols-outlined">verified_user</span>
                  Mã QR xác nhận đặt sân
                </span>
              </div>
              <p className="bs-ticket-note">
                <span className="material-symbols-outlined">info</span>
                Đưa mã QR này cho nhân viên khi đến sân để nhận chỗ.
              </p>
              <div className="bs-ticket-actions">
                <a
                  className="bs-ticket-action"
                  href={qrCodeUrl}
                  download={`ve-dat-san-${bookingCode}.png`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="material-symbols-outlined">download</span>
                  <span>Tải vé (PNG)</span>
                </a>
                <button className="bs-ticket-action" type="button" onClick={() => window.print()}>
                  <span className="material-symbols-outlined">print</span>
                  <span>In vé</span>
                </button>
                <button className="bs-ticket-action" type="button" onClick={handleShare}>
                  <span className="material-symbols-outlined">share</span>
                  <span>Chia sẻ mã</span>
                </button>
              </div>
              {shareFeedback && <p className="bs-share-feedback" role="status">{shareFeedback}</p>}
            </div>
            <section className="bs-instructions bs-instructions--ticket">
              <div className="bs-instructions-heading">
                <span className="material-symbols-outlined">assignment_turned_in</span>
                <div>
                  <h2>Hướng dẫn nhận sân</h2>
                  <p>Chuẩn bị mã xác nhận trước khi đến sân</p>
                </div>
              </div>
              <div className="bs-instruction-list">
                <div className="bs-instruction-item">
                  <span className="bs-instruction-number">1</span>
                  <div>
                    <strong>Lưu mã đặt sân</strong>
                    <p>Dùng mã <b>#BK{bookingCode}</b> để tra cứu thông tin đặt sân.</p>
                  </div>
                </div>
                <div className="bs-instruction-item">
                  <span className="bs-instruction-number">2</span>
                  <div>
                    <strong>Xuất trình mã QR</strong>
                    <p>Mở vé điện tử và đưa mã QR cho nhân viên khi đến sân.</p>
                  </div>
                </div>
                <div className="bs-instruction-item">
                  <span className="bs-instruction-number">3</span>
                  <div>
                    <strong>Tra cứu khi cần</strong>
                    <p>Vào mục tra cứu đặt sân nếu bạn cần xem lại mã xác nhận.</p>
                  </div>
                </div>
              </div>
            </section>
          </article>

          <aside className="bs-details-panel">
            <div className="bs-details-header">
              <div>
                <h2>Chi tiết xác nhận</h2>
                <p>Thông tin dùng để tra cứu đặt sân</p>
              </div>
              <span className="bs-confirmed-tag">ĐÃ XÁC NHẬN</span>
            </div>
            <div className="bs-details-content">
              <div className="bs-reference-block">
                <span>Mã đặt sân</span>
                <strong>#BK{bookingCode}</strong>
              </div>
              <div className="bs-field-summary">
                {bookingDetails?.fieldImage ? (
                  <img src={bookingDetails.fieldImage} alt={bookingDetails.fieldName || "Sân bóng"} />
                ) : (
                  <span className="material-symbols-outlined bs-field-summary__icon">stadium</span>
                )}
                <div>
                  <span className="bs-field-type">{bookingDetails?.fieldType || "SÂN BÓNG"}</span>
                  <strong>{bookingDetails?.fieldName || "Chưa có thông tin sân"}</strong>
                  <small>{bookingDetails?.fieldAddress || "Chưa có địa chỉ sân"}</small>
                </div>
              </div>
              <div className="bs-appointment-grid">
                <div className="bs-appointment-cell">
                  <span>Ngày thi đấu</span>
                  <strong>{formatBookingDate(bookingDetails?.bookingDate)}</strong>
                </div>
                <div className="bs-appointment-cell">
                  <span>Khung giờ</span>
                  <strong>{bookingDetails?.timeSlot || "Chưa có thông tin"}</strong>
                  {bookingDetails?.durationMinutes > 0 && (
                    <small>Thời lượng: {bookingDetails.durationMinutes} phút</small>
                  )}
                </div>
              </div>
              {bookingDetails?.includedAmenities?.length > 0 && (
                <div className="bs-amenities">
                  <h3>Tiện ích đi kèm miễn phí</h3>
                  {bookingDetails.includedAmenities.map((amenity) => (
                    <div className="bs-amenity" key={amenity}>
                      <span className="material-symbols-outlined">check_circle</span>
                      {amenity}
                    </div>
                  ))}
                </div>
              )}
              <div className="bs-price-breakdown">
                <div className="bs-price-row">
                  <span>Giá thuê sân ({bookingDetails?.durationMinutes || 60} phút)</span>
                  <strong>{formatPrice(bookingDetails?.fieldPrice)}</strong>
                </div>
                {bookingDetails?.services?.map((service) => (
                  <div className="bs-price-row" key={service.id}>
                    <span>
                      {service.name}{service.shoeSize ? ` (size ${service.shoeSize})` : ""} ×{service.quantity}
                    </span>
                    <strong>{formatPrice(service.totalPrice)}</strong>
                  </div>
                ))}
                {bookingDetails?.discountCode && (
                  <div className="bs-price-row bs-price-row--discount">
                    <span>Mã giảm giá ({bookingDetails.discountCode})</span>
                    <strong>-{formatPrice(bookingDetails.discountAmount)}</strong>
                  </div>
                )}
                <div className="bs-price-row bs-price-row--payment">
                  <span>Thanh toán</span>
                  <strong>{bookingDetails?.paymentMethod || "Chưa có thông tin"}</strong>
                </div>
                <div className="bs-total-row">
                  <span>Tổng tiền thanh toán</span>
                  <strong>{formatPrice(bookingDetails?.totalPrice)}</strong>
                </div>
              </div>
              <div className="bs-detail-row">
                <span>Mã đặt chỗ đầy đủ</span>
                <strong>{fullId || "Chưa có"}</strong>
              </div>
              <div className="bs-details-message">
                <span className="material-symbols-outlined">smartphone</span>
                <p>Lưu mã đặt sân để tra cứu hoặc liên hệ hỗ trợ khi cần.</p>
              </div>
              <div className="bs-actions">
                <Link to="/lookup" className="bs-button bs-button--primary">
                  <span className="material-symbols-outlined">search</span>
                  Tra cứu đặt sân
                </Link>
                <Link to="/" className="bs-button bs-button--secondary">
                  <span className="material-symbols-outlined">home</span>
                  Về trang chủ
                </Link>
              </div>
            </div>
          </aside>
        </section>

      </div>
    </main>
  );
};

export default BookingSuccess;