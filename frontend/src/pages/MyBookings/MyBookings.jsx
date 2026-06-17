import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BASE_URL } from "../../config";
import "./MyBookings.css";

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

  if (services.length === 0) return <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>Không</span>;

  return (
    <div className="booking-services-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {services.map(s => (
        <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          {s.service_image && (
            <img src={s.service_image} alt={s.service_name} style={{ width: '32px', height: '32px', objectFit: 'cover', borderRadius: '4px' }} />
          )}
          <span className="service-tag">
            {s.service_name} x{s.quantity}
          </span>
        </div>
      ))}
    </div>
  );
};

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [user, setUser] = useState(null);

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

  const handleCancel = async (bookingId) => {
    const confirmCancel = window.confirm("Bạn có chắc chắn muốn hủy lượt đặt sân này không?");
    if (!confirmCancel) return;

    try {
      const response = await fetch(`${BASE_URL}/bookings/${bookingId}/update/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Cancelled" }),
      });

      if (response.ok) {
        alert("Đã hủy đặt sân thành công!");
        fetchMyBookings(user.id);
      } else {
        const data = await response.json();
        alert(data.error || "Có lỗi xảy ra khi hủy đặt sân");
      }
    } catch (error) {
      console.error("Lỗi khi hủy đặt sân:", error);
      alert("Lỗi kết nối máy chủ");
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === "Pending").length,
    completed: bookings.filter(b => b.status === "Completed" || b.status === "Confirmed" || b.status === "Checked_in").length,
    cancelled: bookings.filter(b => b.status === "Cancelled").length
  };

  return (
    <div className="my-bookings-container">
      <aside className="my-bookings-sidebar">
        <div className="profile-card">
          <div className="profile-image-container">
            <img
              src="https://www.w3schools.com/howto/img_avatar.png"
              alt="User"
              className="profile-avatar"
            />
            <div className="rank-badge">
              <span className="material-symbols-outlined">grade</span>
            </div>
          </div>
          <h3 className="profile-name">{user?.fullname || user?.full_name || user?.username || "Khách hàng"}</h3>
          <p className="profile-rank-text">THÀNH VIÊN ĐỒNG</p>
          <div className="profile-stats">
            <div className="stat-box" style={{ gridColumn: "span 2" }}>
              <span className="stat-label">THÁNG NÀY</span>
              <span className="stat-value">{stats.completed.toString().padStart(2, '0')} lượt</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="my-bookings-main">
        <header className="header-row">
          <div className="header-titles">
            <h1>Lịch sử đặt sân</h1>
            <p>Quản lý và xem lại tất cả các lượt đặt sân của bạn.</p>
          </div>
          <div className="header-actions">
            <button className="btn-filter">
              <span className="material-symbols-outlined">filter_list</span>
              Lọc
            </button>
            <Link to="/fields" className="btn-add-booking">
              <span className="material-symbols-outlined">add</span>
              Đặt sân mới
            </Link>
          </div>
        </header>

        <section className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">TỔNG LƯỢT ĐẶT</span>
            <div className="summary-value">{stats.total.toString().padStart(2, '0')}</div>
          </div>
          <div className="summary-card">
            <span className="summary-label">CHỜ XÁC NHẬN</span>
            <div className="summary-value">{stats.pending.toString().padStart(2, '0')}</div>
          </div>
          <div className="summary-card">
            <span className="summary-label">ĐÃ HOÀN THÀNH</span>
            <div className="summary-value">{stats.completed.toString().padStart(2, '0')}</div>
          </div>
          <div className="summary-card">
            <span className="summary-label">ĐÃ HỦY</span>
            <div className="summary-value">{stats.cancelled.toString().padStart(2, '0')}</div>
          </div>
        </section>

        <section className="table-container">
          <table className="bookings-table">
            <thead>
              <tr>
                <th>MÃ ĐƠN</th>
                <th>TÊN SÂN</th>
                <th>ĐỊA CHỈ</th>
                <th>DỊCH VỤ THÊM</th>
                <th>NGÀY ĐẶT</th>
                <th>GIỜ CHƠI</th>
                <th>TỔNG TIỀN</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">Chưa có dữ liệu đặt sân.</td>
                </tr>
              ) : (
                bookings.map((booking, index) => (
                  <tr key={index}>
                    <td>
                      <span className="cell-id">#BK{booking.id?.substring(0, 8).toUpperCase()}</span>
                    </td>
                    <td>
                      <div className="field-info">
                        <div className="field-image-wrapper">
                          {booking.image ? (
                            <img
                              src={`http://127.0.0.1:8000${booking.image}`}
                              alt={booking.fieldName}
                              className="table-field-image"
                            />
                          ) : (
                            <div className="table-field-image-placeholder">
                              <span className="material-symbols-outlined">sports_soccer</span>
                            </div>
                          )}
                        </div>
                        <span className="field-name">{booking.fieldName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="field-address">{booking.fieldAddress || 'Chưa cập nhật'}</span>
                    </td>
                    <td><BookingServiceRowItems bookingId={booking.id} /></td>
                    <td><span className="cell-date">{new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</span></td>
                    <td><span className="cell-time">{booking.timeSlot}</span></td>
                    <td><span className="cell-price">{booking.price.toLocaleString('vi-VN')}đ</span></td>
                    <td>
                      <span className={`status-badge ${booking.status?.toLowerCase()}`}>
                        {booking.status === "Confirmed" ? "Đã xác nhận" :
                          booking.status === "Cancelled" ? "Đã hủy" :
                            booking.status === "Pending" ? "Đang chờ" :
                              booking.status === "Completed" ? "Hoàn thành" :
                                booking.status === "Checked_in" ? "Đã check-in" :
                                  booking.status || "Đã đặt"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {booking.status === "Completed" && !booking.is_reviewed && (
                          <button
                            onClick={() => setReviewingBooking(booking)}
                            className="btn-review-action"
                          >
                            Đánh giá
                          </button>
                        )}
                        {booking.is_reviewed && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#059669' }}>check_circle</span>
                            <span style={{ color: '#059669', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>Đã đánh giá</span>
                          </div>
                        )}
                        <Link
                          to={`/my-bookings/${booking.id}`}
                          state={{ booking }}
                          className="btn-detail-link"
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          Xem chi tiết
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
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
    </div>
  );
};

export default MyBookings;
