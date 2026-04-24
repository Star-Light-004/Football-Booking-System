import React from "react";
import { useLocation, Link } from "react-router-dom";
import "./BookingSuccess.css";

const BookingSuccess = () => {
  const location = useLocation();
  const { bookingCode } = location.state || { bookingCode: "FB123456" }; // Default for demo

  return (
    <main className="flex-1 w-full max-w-[960px] mx-auto px-4 py-8 md:py-12">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-primary/5 p-6 md:p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">check_circle</span>
          </div>
          <h1 className="text-slate-900 dark:text-slate-100 text-3xl font-bold mb-2">
            Đặt sân thành công!
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Cảm ơn bạn đã đặt sân. Thông tin đặt sân của bạn đã được gửi qua email và SMS.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-slate-900 dark:text-slate-100 text-xl font-semibold mb-4">
            Mã đặt sân của bạn
          </h2>
          <div className="text-2xl font-mono font-bold text-primary mb-4">
            {bookingCode}
          </div>
          <div className="flex justify-center">
            {/* Placeholder for QR code - in real app, generate QR with bookingCode */}
            <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-slate-500">QR Code</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/lookup"
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Tra cứu đặt sân
          </Link>
          <Link
            to="/"
            className="bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-6 py-3 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
};

export default BookingSuccess;