import React, { useState, useEffect } from "react";
import "./Lookup.css";

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

  return (
    <div className="booking-result-card">
      <div className="card-top-bar">
        <span className="status-badge">
          {booking.status === "Confirmed" ? "ĐÃ XÁC NHẬN" :
            booking.status === "Cancelled" ? "ĐÃ HỦY" :
              booking.status === "Completed" ? "HOÀN THÀNH" :
                booking.status === "Checked_in" ? "ĐÃ CHECK-IN" : "CHỜ XÁC NHẬN"}
        </span>
        <div className="booking-meta">
          <span>Mã đơn: <span className="booking-id-text">#BK{booking.booking_id_short}</span></span>
          <span>Đặt lúc: {booking.createdAt}</span>
        </div>
      </div>

      <div className="card-body">
        <div className="card-info-main">
          <div className="info-item">
            <span className="info-label">SÂN BÓNG</span>
            <span className="info-value">{booking.fieldName}</span>
          </div>

          <div className="info-item">
            <span className="info-label">THỜI GIAN</span>
            <span className="info-value">{booking.timeSlot}</span>
            <span className="info-subvalue">{formatDateLong(booking.bookingDate)}</span>
          </div>

          <div className="info-item">
            <span className="info-label">NGƯỜI ĐẶT</span>
            <span className="info-value">{booking.customerName}</span>
          </div>

          <div className="info-item">
            <span className="info-label">SỐ ĐIỆN THOẠI</span>
            <span className="info-value">{maskPhone(booking.phone)}</span>
          </div>

          {/* Dịch vụ đi kèm */}
          <div className="info-item mt-2">
            <span className="info-label">DỊCH VỤ THÊM</span>
            {services.length > 0 ? (
              <div className="flex flex-wrap gap-4 mt-2">
                {services.map(s => (
                  <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {s.service_image && (
                      <img src={s.service_image} alt={s.service_name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
                    )}
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {s.service_name} x{s.quantity}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="info-value text-slate-400 italic" style={{ fontSize: '13px' }}>Không</span>
            )}
          </div>

          <div className="price-section">
            <span className="info-label">Tổng cộng</span>
            <span className="total-price">{booking.price.toLocaleString("vi-VN")}đ</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center' }}>
            <button className="btn-download-receipt" style={{ marginTop: 0 }}>
              <span className="material-symbols-outlined">download</span>
              Tải biên lai
            </button>
            {booking.status === "Completed" && !booking.is_reviewed && (
              <button
                onClick={onReviewClick}
                className="btn-download-receipt"
                style={{ marginTop: 0, backgroundColor: '#29a847', color: 'white', border: 'none' }}
              >
                <span className="material-symbols-outlined">star</span>
                Đánh giá
              </button>
            )}
            {booking.is_reviewed && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#059669' }}>check_circle</span>
                <span style={{ color: '#059669', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>Đã đánh giá</span>
              </div>
            )}
          </div>
        </div>

        <div className="qr-container">
          <span className="qr-label">MÃ QR CHECK-IN</span>
          <div className="qr-box">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${booking.id}`}
              alt="QR Code"
            />
          </div>
          <p className="qr-hint">Đưa mã này cho nhân viên khi đến sân để nhận chỗ.</p>
        </div>
      </div>
    </div>
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
      alert("Vui lòng nhập ít nhất số điện thoại hoặc mã đặt sân");
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
      {/* SEARCH CARD */}
      <div className="lookup-search-card">
        <h1 className="lookup-title">Tra cứu đặt sân</h1>
        <p className="lookup-subtitle">
          Nhập thông tin bên dưới để kiểm tra chi tiết đơn đặt sân của bạn.
        </p>

        <div className="lookup-grid">
          <div className="input-group">
            <label className="input-label">
              <span className="material-symbols-outlined">call</span>
              Số điện thoại
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="Nhập số điện thoại của bạn"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <span className="material-symbols-outlined">confirmation_number</span>
              Mã đặt sân
            </label>
            <input
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

      {/* RESULTS SECTION */}
      {searched && (
        <>
          <div className="results-separator">
            <div className="separator-line"></div>
            <span className="separator-text">Kết quả tìm kiếm</span>
            <div className="separator-line"></div>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm w-full max-w-[800px]">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
              <h3 className="text-xl font-bold text-slate-800">Không tìm thấy đơn đặt sân</h3>
              <p className="text-slate-500 mt-2">Vui lòng kiểm tra lại thông tin tra cứu.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 w-full max-w-[800px]">
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

      {/* FOOTER */}
      <footer className="lookup-footer">
        <p className="support-text">
          Bạn gặp vấn đề khi tra cứu? <a href="#" className="support-link">Liên hệ hỗ trợ 24/7</a>
        </p>
        <div className="footer-badges">
          <div className="footer-badge">
            <span className="material-symbols-outlined">verified_user</span>
            Bảo mật 100%
          </div>
          <div className="footer-badge">
            <span className="material-symbols-outlined">bolt</span>
            Cập nhật tức thì
          </div>
        </div>
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