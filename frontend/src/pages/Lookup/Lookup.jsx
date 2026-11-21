import React, { useState, useEffect, useCallback, useRef } from "react";
import PageHero from "../../components/PageHero/PageHero";
import "./Lookup.css";

const isCompletedBooking = (status) => ["completed", "hoàn thành", "hoan thanh"].includes(String(status || "").trim().toLowerCase());
const hasReviewedBooking = (isReviewed) => isReviewed === true || isReviewed === "true";

const RATING_LEVELS = [
  { value: 5, label: "Rất tuyệt vời", desc: "Mặt sân, trang thiết bị và dịch vụ đều hoàn hảo!", color: "#16a34a", bg: "#f0fdf4" },
  { value: 4, label: "Hài lòng", desc: "Chất lượng sân tốt, trải nghiệm thi đấu tuyệt vời.", color: "#059669", bg: "#ecfdf5" },
  { value: 3, label: "Bình thường", desc: "Sân mức ổn, đáp ứng tốt nhu cầu thi đấu cơ bản.", color: "#d97706", bg: "#fffbeb" },
  { value: 2, label: "Chưa hài lòng", desc: "Cần cải thiện thêm về mặt cỏ hoặc dịch vụ hỗ trợ.", color: "#ea580c", bg: "#fff7ed" },
  { value: 1, label: "Thất vọng", desc: "Trải nghiệm không tốt, mong sân sớm khắc phục.", color: "#dc2626", bg: "#fef2f2" },
];
import { BASE_URL, getFullImageUrl } from "../../config";
import { useToast, ToastContainer } from "../../components/Toast/Toast";
import { onSyncEvent } from "../../utils/realtimeSync";

const BookingResultItem = ({ booking, formatDateLong, maskPhone, onReviewClick }) => {
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoadingServices(true);
        const res = await fetch(`${BASE_URL}/services/booking-services/${booking.id}/`);
        const data = await res.json();
        setServices(data || []);
      } catch (err) {
        console.error("Lỗi lấy dịch vụ:", err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [booking.id]);

  const statusLabel = booking.status === "Confirmed" ? "ĐÃ XÁC NHẬN & GIỮ CHỖ" :
    booking.status === "Cancelled" ? "ĐÃ HỦY" :
      isCompletedBooking(booking.status) ? "ĐÃ HOÀN THÀNH" :
        booking.status === "Checked_in" ? "ĐÃ CHECK-IN" : "CHỜ XÁC NHẬN";
  const statusClass = booking.status === "Cancelled" ? "cancelled" :
    isCompletedBooking(booking.status) ? "completed" :
      booking.status === "Checked_in" ? "checked-in" :
        booking.status === "Pending" ? "pending" : "confirmed";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${booking.id}`;

  return (
    <article className="lookup-result-card">
      <header className="lookup-result-header">
        <div className="lookup-result-header__title">
          <span className="material-symbols-outlined">confirmation_number</span>
          <div>
            <strong>VÉ ĐIỆN TỬ SÂN BÓNG (DIGITAL MATCH PASS)</strong>
            <small>Xuất trình mã này tại sân để xác nhận đặt chỗ</small>
          </div>
        </div>
        <span className={`lookup-result-status lookup-result-status--${statusClass}`}>{statusLabel}</span>
      </header>

      <div className="lookup-result-content">
        <section className="lookup-qr-column">
          <div className="lookup-reference">
            <span>Mã đặt sân:</span>
            <strong>#BK{booking.booking_id_short}</strong>
          </div>
          <div className="lookup-qr-frame">
            <img src={qrUrl} alt={`Mã QR check-in đơn ${booking.booking_id_short}`} />
            <span><span className="material-symbols-outlined">verified_user</span> QR xác nhận đặt sân</span>
          </div>
          <p className="lookup-qr-hint">Đưa mã QR này cho nhân viên khi đến sân để nhận chỗ.</p>
          <a className="lookup-qr-download" href={qrUrl} download={`ma-qr-${booking.booking_id_short}.png`} target="_blank" rel="noreferrer">
            <span className="material-symbols-outlined">download</span>Tải QR
          </a>
        </section>

        <section className="lookup-booking-details">
          <div className="lookup-field-heading">
            {booking.fieldImage ? (
              <img src={getFullImageUrl(booking.fieldImage)} alt={booking.fieldName} />
            ) : (
              <span className="material-symbols-outlined lookup-field-placeholder">stadium</span>
            )}
            <div>
              <span className="lookup-field-type">SÂN BÓNG</span>
              <h2>{booking.fieldName}</h2>
              <p><span className="material-symbols-outlined">location_on</span>{booking.fieldAddress || "Chưa cập nhật địa chỉ"}</p>
            </div>
          </div>

          <div className="lookup-appointment-grid">
            <div><span>Ngày thi đấu</span><strong>{formatDateLong(booking.bookingDate)}</strong></div>
            <div><span>Khung giờ</span><strong className="lookup-time-value">{booking.timeSlot}</strong></div>
            <div><span>Người đặt sân</span><strong>{booking.customerName}</strong></div>
            <div><span>Số điện thoại</span><strong>{maskPhone(booking.phone)}</strong></div>
          </div>

          <div className="lookup-service-section">
            <span className="lookup-section-label">DỊCH VỤ ĐI KÈM</span>
            {loadingServices ? (
              <span className="lookup-service-empty">Đang tải dịch vụ...</span>
            ) : services.length > 0 ? (
              <div className="lookup-service-list">
                {services.map((service) => (
                  <span className="lookup-service-chip" key={service.id}>
                    {service.service_image && <img src={getFullImageUrl(service.service_image)} alt="" />}
                    {service.service_name}{service.shoe_size ? ` · size ${service.shoe_size}` : ""} ×{service.quantity}
                  </span>
                ))}
              </div>
            ) : (
              <span className="lookup-service-empty">Không có dịch vụ thêm</span>
            )}
          </div>

          <div className="lookup-price-row">
            <span>Tổng chi phí</span>
            <strong>{Number(booking.price || 0).toLocaleString("vi-VN")}đ</strong>
          </div>
          <div className="lookup-booking-actions">
            <button className="btn-download-receipt" type="button">
              <span className="material-symbols-outlined">download</span>Tải biên lai
            </button>
            {isCompletedBooking(booking.status) && !hasReviewedBooking(booking.is_reviewed) && (
              <button onClick={onReviewClick} className="btn-download-receipt btn-review-lookup" type="button">
                <span className="material-symbols-outlined">star</span>Đánh giá
              </button>
            )}
            {hasReviewedBooking(booking.is_reviewed) && (
              <span className="lookup-reviewed"><span className="material-symbols-outlined">check_circle</span>Đã đánh giá</span>
            )}
          </div>
        </section>
      </div>
    </article>
  );
};

const Lookup = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const { toasts, removeToast, toast } = useToast();

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

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
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
          setComment("");
          handleLookup();
        }, 2000);
      } else {
        setSubmitError(data.error || "Có lỗi xảy ra khi gửi đánh giá");
      }
    } catch (error) {
      setSubmitError("Lỗi kết nối máy chủ");
    }
  };

  const handleLookup = useCallback(async (isSilent = false) => {
    if (!phoneNumber && !bookingId) {
      if (!isSilent) toast.warning("Vui lòng nhập ít nhất số điện thoại hoặc mã đặt sân");
      return;
    }

    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/bookings/lookup/?phone=${phoneNumber}&booking_id=${bookingId}`
      );
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } catch (err) {
      if (!isSilent) {
        console.log("Lookup error:", err);
        setResults([]);
        setSearched(true);
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [phoneNumber, bookingId, toast]);

  // Realtime Polling & Cross-tab Sync khi đang hiển thị kết quả
  useEffect(() => {
    if (!searched || results.length === 0) return;

    const unsub = onSyncEvent((event) => {
      if (event?.type?.startsWith("booking_")) {
        handleLookup(true);
      }
    });

    const pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        handleLookup(true);
      }
    }, 4000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        handleLookup(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsub();
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [searched, results.length, handleLookup]);

  const getDayOfWeek = (dateString) => {
    const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const maskPhone = (phone) => {
    if (!phone) return "";
    if (phone.length >= 7) {
      return phone.substring(0, 4) + " *** " + phone.substring(phone.length - 3);
    }
    return phone;
  };

  const formatDateLong = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${getDayOfWeek(dateString)}, ${day} Tháng ${month}, ${year}`;
  };

  return (
    <div className="lookup-page-wrapper">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PageHero
        breadcrumb={[{ label: "Trang chủ", to: "/" }, { label: "Tra cứu đặt sân" }]}
        eyebrow="HỆ THỐNG TRA CỨU THỜI GIAN THỰC"
        title="Tra cứu vé & đơn đặt sân"
        description="Nhập số điện thoại hoặc mã đặt sân để lấy lại mã QR vé sân và thông tin thi đấu."
      />
      <div className="lookup-search-card">
        <div className="lookup-grid">
          <div className="input-group">
            <label className="input-label" htmlFor="lookup-phone">
              <span className="material-symbols-outlined">call</span>
              Số điện thoại
            </label>
            <input
              id="lookup-phone"
              type="tel"
              className="input-field"
              placeholder="Nhập số điện thoại của bạn"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="lookup-booking-id">
              <span className="material-symbols-outlined">confirmation_number</span>
              Mã đặt sân <span className="lookup-optional-label">Không bắt buộc</span>
            </label>
            <input
              id="lookup-booking-id"
              type="text"
              className="input-field"
              placeholder="VD: BK123456"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
            />
          </div>

          <button
            className="btn-lookup-now"
            onClick={handleLookup}
            disabled={loading}
          >
            <span className="material-symbols-outlined">
              {loading ? "sync" : "search"}
            </span>
            {loading ? "Đang tra cứu..." : "Tra cứu ngay"}
          </button>
        </div>
      </div>

      {searched && (
        <>
          <div className="lookup-results-heading">
            <div>
              <h2>Kết quả tra cứu</h2>
              <span><span /> {results.length} đơn đặt sân</span>
            </div>
            {results.length > 0 && <small>Dữ liệu đặt sân của bạn</small>}
          </div>

          {results.length === 0 ? (
            <div className="lookup-empty-state">
              <span className="material-symbols-outlined">search_off</span>
              <h3>Không tìm thấy đơn đặt sân</h3>
              <p>Vui lòng kiểm tra lại số điện thoại hoặc mã đặt sân.</p>
            </div>
          ) : (
            <div className="lookup-results-list">
              {results.map((booking) => (
                <BookingResultItem
                  key={booking.id}
                  booking={booking}
                  formatDateLong={formatDateLong}
                  maskPhone={maskPhone}
                  onReviewClick={() => openReviewModal(booking)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <footer className="lookup-footer">
        <span className="material-symbols-outlined lookup-footer-icon">info</span>
        <div className="lookup-footer-copy">
          <strong>Lưu ý khi đến nhận sân</strong>
          <p>Chuẩn bị mã QR và xuất trình cho nhân viên tại sân để xác nhận lượt đặt.</p>
        </div>
        <a href="tel:1900889922" className="lookup-support-link">Hỗ trợ 1900 88 99 22</a>
      </footer>

      {/* Review Modal */}
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
                      <label className="review-field-label" htmlFor="lookup-review-comment-input">
                        Nhận xét của bạn
                      </label>
                      <span className="review-counter">{comment.length}/500</span>
                    </div>
                    <textarea
                      id="lookup-review-comment-input"
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
    </div>
  );
};

export default Lookup;
