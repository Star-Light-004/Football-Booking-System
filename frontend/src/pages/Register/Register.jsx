import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; 
import axios from "axios";
import "./Register.css";

const Register = () => {

   const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });

  // ✅ Handle input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };
  // ✅ Submit
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (formData.password !== formData.confirmPassword) {
    setMessage("Mật khẩu không khớp!");
    setIsSuccess(false);
    return;
  }

  try {
    const res = await axios.post("http://127.0.0.1:8000/api/users/register/", {
      fullname: formData.fullname,
      email: formData.email,
      phone: formData.phone,
      password: formData.password
    });

    // ✅ Thành công
    setMessage("Đăng ký thành công! Đang chuyển sang đăng nhập...");
    setIsSuccess(true);

    // ⏳ delay rồi chuyển trang
    setTimeout(() => {
      navigate("/login");
    }, 500);

  } catch (err) {
    console.error(err);

    // ❌ Thất bại
    setMessage(err.response?.data?.error || "Đăng ký thất bại!");
    setIsSuccess(false);
    setTimeout(() => {
    setMessage("");
  },500);
  }
};
  return (
    <div className="register-page">
      {message && (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    {/* nền mờ */}
    <div className="absolute inset-0 bg-black/40"></div>

    {/* box */}
    <div className="relative bg-white rounded-xl shadow-lg px-6 py-4 text-center w-80">
      <p
        className={`font-medium ${
          isSuccess ? "text-green-600" : "text-red-600"
        }`}
      >
        {message}
      </p>
    </div>
  </div>
)}
      <div className="font-display bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-6xl w-full bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-primary/10">

          {/* Left Side Visual */}
          <div className="hidden md:flex md:w-1/2 relative bg-primary items-center justify-center p-12 text-white overflow-hidden">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 text-center">
              <div className="mb-8 flex justify-center">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <span className="material-icons text-primary text-5xl">sports_soccer</span>
                </div>
              </div>
              <h2 className="text-4xl font-bold mb-4">Chào mừng đến với hệ thống đặt sân</h2>
              <p className="text-white/80 text-lg leading-relaxed">
                Gia nhập cộng đồng yêu bóng đá, kết nối đam mê và tìm kiếm đối thủ xứng tầm chỉ trong vài cú nhấp chuột.
              </p>
              <div className="mt-12 grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="material-icons text-3xl mb-2">event_available</span>
                  <p className="text-sm font-medium">Đặt sân 24/7</p>
                </div>
                <div className="p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                  <span className="material-icons text-3xl mb-2">group_add</span>
                  <p className="text-sm font-medium">Tìm đội nhanh</p>
                </div>
              </div>
            </div>
            <img
              className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjxe-Xc003hxhA5606BPY7yY7eiFegQ0umPC0XzR82VjwFbjqGwybhLaSinCF6kjmMnvC2tx225wp_0SHiCZHkmItA1HM112ZNmWo7WuEXWhtmml17J8J66ql5ztk8F2qSW4AQ2GOwJBgvJWx8ErR0E4S6K7S4X2MQvLyrIsCpg8b9_OJL1Ch6sv8qn4zB-2V7WI_MkKfEX-GDrKiTtG0W8J2G3JGQDgk5zSjOzR-fycnSh-qh5mDiRcG44RaiZTs73yUlFkuoyag"
              alt="background"
            />
          </div>

          {/* Right Side */}
          <div className="w-full md:w-1/2 p-8 lg:p-12">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Đăng ký tài khoản</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Vui lòng điền thông tin để bắt đầu trải nghiệm
              </p>
            </div>

            {/* ✅ THÊM onSubmit */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Họ và tên */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Họ và tên</label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2">person</span>
                  <input
                    id="fullname"
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3"
                    type="text"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2">email</span>
                  <input
                    id="email"
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3"
                    type="email"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Số điện thoại</label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2">phone</span>
                  <input
                    id="phone"
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3"
                    type="tel"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2">lock</span>
                  <input
                    id="password"
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3"
                    type="password"
                  />
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Nhập lại mật khẩu</label>
                <div className="relative">
                  <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2">lock</span>
                  <input
                    id="confirmPassword"
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3"
                    type="password"
                  />
                </div>
              </div>

              <button
                className="w-full bg-primary text-white py-3.5 rounded-lg"
                type="submit"
              >
                ĐĂNG KÝ NGAY
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;