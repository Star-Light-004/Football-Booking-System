import React, { useState, useEffect } from "react";
import PageHero from "../../components/PageHero/PageHero";
import "./Lookup.css";

const isCompletedBooking = (status) => ["completed", "hoàn thành", "hoan thanh"].includes(String(status || "").trim().toLowerCase());
const hasReviewedBooking = (isReviewed) => isReviewed === true || isReviewed === "true";
import { BASE_URL } from "../../config";
import { useToast, ToastContainer } from "../../components/Toast/Toast";

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
              <img src={booking.fieldImage} alt={booking.fieldName} />
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
                    {service.service_image && <img src={service.service_image} alt="" />}
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
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const { toasts, removeToast, toast } = useToast();

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

  const handleLookup = async () => {
    if (!phoneNumber && !bookingId) {
      toast.warning("Vui lòng nhập ít nhất số điện thoại hoặc mã đặt sân");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/bookings/lookup/?phone=${phoneNumber}&booking_id=${bookingId}`
      );
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } catch (err) {
      console.log("Lookup error:", err);
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

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
                  onReviewClick={() => setReviewingBooking(booking)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden" style={{ backgroundColor: 'white', borderRadius: '1rem', width: '100%', maxWidth: '28rem', overflow: 'hidden' }}>
            <div className="p-4 border-b border-slate-200 flex justify-between items-center" style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="font-bold text-lg text-slate-900" style={{ fontWeight: 700, fontSize: '1.125rem' }}>Đánh giá sân bóng</h3>
              <button
                onClick={() => setReviewingBooking(null)}
                className="text-slate-400 hover:text-slate-600"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 md:p-6" style={{ padding: '1.5rem' }}>
              {submitSuccess ? (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '1rem', borderRadius: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <span className="material-symbols-outlined">check_circle</span>
                  Cảm ơn bạn đã gửi đánh giá!
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {submitError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg" style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem' }}>{submitError}</div>}
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Mức độ hài lòng</label>
                    <select value={rating} onChange={(e) => setRating(e.target.value)} className="w-full border rounded-lg p-2.5" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem' }}>
                      <option value={5}>⭐⭐⭐⭐⭐ (Rất tuyệt vời)</option>
                      <option value={4}>⭐⭐⭐⭐ (Tuyệt vời)</option>
                      <option value={3}>⭐⭐⭐ (Bình thường)</option>
                      <option value={2}>⭐⭐ (Tạm được)</option>
                      <option value={1}>⭐ (Tệ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Nhận xét của bạn</label>
                    <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="4" className="w-full border rounded-lg p-2.5 resize-none" style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.625rem', resize: 'none' }}></textarea>
                  </div>
                  <div className="flex justify-end gap-2" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setReviewingBooking(null)} className="px-4 py-2 bg-slate-100 rounded-lg" style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Hủy</button>
                    <button type="submit" className="px-4 py-2 text-white bg-primary rounded-lg" style={{ padding: '0.5rem 1rem', backgroundColor: '#29a847', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Gửi đánh giá</button>
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
