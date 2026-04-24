import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useParams, Link, useNavigate } from "react-router-dom";
import "./BookingDetail.css";

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
 

  const location = useLocation();

useEffect(() => {
  if (location.state?.booking) {
    setBooking(location.state.booking);
  }
}, [location.state]);

  const handleCancel = () => {
  const confirmCancel = window.confirm("Bạn có chắc muốn hủy đơn này không?");
  
  if (!confirmCancel) return;

  // 👉 Nếu sau này có API thì gọi ở đây
  // await fetch(`/api/bookings/cancel/${booking.id}/`, { method: "POST" });

  alert("Đã hủy đơn!");
  navigate("/my-bookings");
};

  if (!booking) return <div>Loading...</div>;

  return (
    <main className="flex-1 w-full max-w-[960px] mx-auto px-4 py-8 md:py-12">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/5 p-6 md:p-8">
        <div className="mb-6">
          <Link to="/my-bookings" className="text-primary hover:underline">
            ← Quay lại danh sách đặt sân
          </Link>
          <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-bold mt-4">
            Chi tiết đặt sân #{booking.id}
          </h1>
        </div>

        {/* ===== Thông tin khách hàng (trên cùng) ===== */}
<div className="mb-6">
  <h2 className="text-xl font-semibold mb-4">Thông tin khách hàng</h2>
  <p><strong>Họ tên:</strong> {booking.customerName}</p>
  <p><strong>Số điện thoại:</strong> {booking.phone}</p>
  <p><strong>Tổng tiền:</strong> {booking.price.toLocaleString('vi-VN')} VND</p>
</div>

            {/* ===== Ảnh + Thông tin sân (nằm ngang) ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Ảnh sân */}
              <div>
                {booking.image && (
                  <img
                    src={`http://127.0.0.1:8000${booking.image}`}
                    alt="field"
                    className="w-full h-56 object-cover rounded-lg shadow-md"
                  />
                )}
              </div>

              {/* Thông tin sân */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Thông tin sân</h2>
                <p><strong>Tên sân:</strong> {booking.fieldName}</p>
                <p><strong>Địa chỉ:</strong> {booking.fieldAddress}</p>
                <p><strong>Ngày:</strong> {new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</p>
                <p><strong>Giờ:</strong> {booking.timeSlot}</p>
                <p className="flex items-center gap-2">
                  <strong>Trạng thái:</strong>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      booking.status === "Đã hủy"
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {booking.status || "Đã đặt"}
                  </span>
                </p>
              </div>

            </div>

        <div className="mt-6">
                      <div className="flex gap-4">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Hủy đặt sân
              </button>

              <button className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg">
                In hóa đơn
              </button>
            </div>
        </div>
      </div>
    </main>
  );
};

export default BookingDetail;