import React, { useState } from "react";
import "./Lookup.css";

const Lookup = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const statusMap = {
  Confirmed: "Đã đặt",
  Cancelled: "Đã hủy",
  Pending: "Chờ xử lý",
  Completed: "Hoàn thành",
  "Đã đặt": "Đã đặt",
  "Đã hủy": "Đã hủy",
};

  const handleLookup = async () => {
  try {
    const res = await fetch(
      `http://127.0.0.1:8000/api/bookings/lookup/?phone=${phoneNumber}&date=${bookingDate}`
    );

    const data = await res.json();

    setResults(data);
    setSearched(true);
  } catch (err) {
    console.log("Lookup error:", err);
    setResults([]);
    setSearched(true);
  }
};

  return (
    <>
      <main className="flex-1 w-full max-w-[960px] mx-auto px-4 py-8 md:py-12">

        {/* SEARCH BOX */}

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/5 p-6 md:p-8 mb-8">

          <div className="mb-8">
            <h2 className="text-slate-900 dark:text-slate-100 text-2xl md:text-3xl font-bold mb-2">
              Tra cứu đặt sân
            </h2>

            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Nhập thông tin bên dưới để kiểm tra chi tiết đơn đặt sân của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">

            {/* PHONE */}

            <div className="flex flex-col gap-2">

              <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">
                  call
                </span>
                Số điện thoại
              </label>

              <input
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-12 px-4 focus:ring-primary focus:border-primary"
                placeholder="Nhập số điện thoại của bạn"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            {/* DATE */}

            <div className="flex flex-col gap-2">

              <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">
                  calendar_today
                </span>
                Ngày đặt sân
              </label>

              <input
                className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 h-12 px-4 focus:ring-primary focus:border-primary"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>

            {/* BUTTON */}

            <div className="md:col-span-2 mt-2">

              <button
                type="button"
                onClick={handleLookup}
                className="w-full bg-primary text-white font-bold h-12 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                <span className="material-symbols-outlined">search</span>
                Tra cứu ngay
              </button>

            </div>

          </div>
        </div>

        {/* RESULT */}

        {searched && results.length === 0 && (

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/5 p-6 text-center">

            <span className="material-symbols-outlined text-5xl text-slate-400 mb-3">
              search_off
            </span>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Không tìm thấy đơn đặt sân
            </h3>

            <p className="text-slate-500 text-sm mt-1">
              Hãy kiểm tra lại số điện thoại hoặc ngày đặt sân.
            </p>

          </div>

        )}

        {results.length > 0 && (

          <div className="flex flex-col gap-4">

            {results.map((booking, index) => (

              <div
                key={index}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/5 p-6"
              >

                <div className="flex justify-between items-start mb-4">

                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {booking.fieldName}
                    </h3>

                    <p className="text-sm text-slate-500">
                      {booking.fieldAddress}
                    </p>
                  </div>

                              {/* FIELD HEADER */}
                  <div className="flex items-start justify-between mb-4">

                    <div className="flex gap-3 items-center">

                      {/* IMAGE */}
                      {booking.fieldImage ? (
                        <img
                          src={`http://127.0.0.1:8000${booking.fieldImage}`}
                          alt="field"
                          className="w-14 h-14 object-cover rounded-lg"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-primary text-3xl">
                          sports_soccer
                        </span>
                      )}

                      {/* NAME + ADDRESS */}
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                          {booking.fieldName}
                        </h3>

                        <p className="text-sm text-slate-500">
                          {booking.fieldAddress}
                        </p>
                      </div>

                    </div>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">

                  <div>
                    <div className="text-slate-500">Khách hàng</div>
                    <div className="font-semibold">{booking.customerName}</div>
                  </div>

                  <div>
                    <div className="text-slate-500">Số điện thoại</div>
                    <div className="font-semibold">{booking.phone}</div>
                  </div>

                  <div>
                    <div className="text-slate-500">Ngày đặt</div>
                    <div className="font-semibold">
                      {new Date(booking.bookingDate).toLocaleDateString("vi-VN")}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">Khung giờ</div>
                    <div className="font-semibold">{booking.timeSlot}</div>
                  </div>

                </div>

                    <div className="flex justify-between items-center mt-4">

                    <div className="text-slate-500 text-sm">
                      Giá tiền:
                    </div>

                    <div className="text-primary font-bold text-lg">
                      {booking.price.toLocaleString("vi-VN")} VND
                    </div>

                  <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    booking.status === "Cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {statusMap[booking.status] || booking.status}
                </span>

                </div>

              </div>

            ))}

          </div>

        )}

      </main>
    </>
  );
};

export default Lookup;