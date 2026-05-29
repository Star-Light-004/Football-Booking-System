import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { getBookingServices } from "../../api/servicesApi";
import "./BookingDetail.css";

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const location = useLocation();

  useEffect(() => {
    if (location.state?.booking) {
      setBooking(location.state.booking);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchServices = async () => {
      if (!booking?.id) return;
      try {
        setLoadingServices(true);
        const res = await getBookingServices(booking.id);
        setServices(res.data || []);
      } catch (err) {
        console.error("Lỗi lấy dịch vụ của đơn:", err);
      } finally {
        setLoadingServices(false);
      }
    };
    fetchServices();
  }, [booking]);

  const handleCancel = async () => {
    const confirmCancel = window.confirm("Bạn có chắc chắn muốn hủy lượt đặt sân này không?");
    if (!confirmCancel) return;

    try {
      const response = await fetch(`http://127.0.0.1:8000/api/bookings/${booking.id}/update/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Cancelled" }),
      });

      if (response.ok) {
        alert("Đã hủy đặt sân thành công!");
        setBooking({ ...booking, status: "Cancelled" });
      } else {
        const data = await response.json();
        alert(data.error || "Có lỗi xảy ra khi hủy đặt sân");
      }
    } catch (error) {
      console.error("Lỗi khi hủy đặt sân:", error);
      alert("Lỗi kết nối máy chủ");
    }
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
                className={`px-2 py-1 rounded-full text-xs font-semibold ${booking.status === "Cancelled"
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-700"
                  }`}
              >
                {booking.status === "Confirmed" ? "Đã xác nhận" :
                  booking.status === "Cancelled" ? "Đã hủy" :
                    booking.status === "Pending" ? "Chờ xác nhận" :
                      booking.status || "Đã đặt"}
              </span>
            </p>
          </div>

        </div>

        {/* ===== Dịch vụ đi kèm ===== */}
        {services.length > 0 && (
          <div className="mt-8 pt-6 border-t border-dashed border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">inventory_2</span>
              Dịch vụ đi kèm
            </h2>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <div className="flex flex-col gap-3">
                {services.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.service_name}</p>
                      <p className="text-xs text-slate-500">Số lượng: {item.quantity}</p>
                    </div>
                    <span className="font-bold text-primary">{item.total_price.toLocaleString()}đ</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex gap-4">
            {booking.status !== "Cancelled" && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Hủy đặt sân
              </button>
            )}

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