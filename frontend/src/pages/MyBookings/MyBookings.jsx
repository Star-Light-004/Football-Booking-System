import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./MyBookings.css";

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
  fetchMyBookings();
}, []);
useEffect(() => {
  console.log("BOOKINGS:", bookings); 
   if (bookings.length > 0) {
    console.log("FIRST BOOKING:", bookings[0]);
  }
}, [bookings]);

const fetchMyBookings = async () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    const res = await fetch(
      `http://127.0.0.1:8000/api/bookings/user/${user.id}/`
    );

    const data = await res.json();
    setBookings(data);
  } catch (err) {
    console.log("Lỗi load bookings:", err);
  }
};

  return (
    <>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 lg:px-20 lg:py-12 flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 flex flex-col gap-2 shrink-0">
          {/* sidebar categories omitted for brevity */}
        </aside>
        <section className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Lịch sử đặt sân
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Quản lý và xem lại tất cả các lượt đặt sân của bạn.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-sm">filter_list</span>
                Lọc
              </button>
              <Link
                to="/booking"
                className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Đặt sân mới
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">event_busy</span>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Chưa có lượt đặt sân nào</h3>
                <p className="text-slate-500 dark:text-slate-400">Hãy đặt sân đầu tiên của bạn!</p>
                <Link
                  to="/fields"
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">search</span>
                  Tìm sân
                </Link>
              </div>
            ) : (
              bookings.map((booking, index) => (
                <div key={index} className="bg-white dark:bg-slate-900/50 p-6 rounded-xl shadow-sm border border-primary/5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1">{booking.fieldName}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">{booking.fieldAddress}</p>
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            (booking.status || "Đã đặt") === "Đã hủy"
                              ? "bg-red-100 text-red-700 dark:bg-red-200/20 dark:text-red-200"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-200/20 dark:text-emerald-200"
                          }`}
                        >
                          {booking.status || "Đã đặt"}
                        </span>
                      </div>
                    </div>
                                          {booking.image ? (
                        <img
                          src={`http://127.0.0.1:8000${booking.image}`}
                          alt="field"
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-primary">
                          sports_soccer
                        </span>
                      )}
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-slate-400">calendar_today</span>
                      <span className="text-slate-700 dark:text-slate-300">{new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-slate-400">schedule</span>
                      <span className="text-slate-700 dark:text-slate-300">{booking.timeSlot}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-slate-400">person</span>
                      <span className="text-slate-700 dark:text-slate-300">{booking.customerName}</span>

                    </div>
                               <div className="flex items-center gap-2 text-sm">
  <span className="material-symbols-outlined text-slate-400">
    phone
  </span>
  <span className="text-slate-700 dark:text-slate-300">
    {booking.phone || "Chưa có SĐT"}
  </span>
</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-primary">{booking.price.toLocaleString('vi-VN')} VND</div>
                    <Link
                    to={`/my-bookings/${booking.id}`}
                    state={{ booking }}   
                    className="text-primary hover:text-primary/80 font-medium text-sm"
                  >
                    Chi tiết
                  </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
};

export default MyBookings;
