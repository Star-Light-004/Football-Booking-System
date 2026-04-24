import React, { useState } from "react"; // ✅ thêm useState
import { Link, useNavigate } from "react-router-dom"; // ✅ thêm useNavigate
import axios from "axios"; // ✅ thêm axios
import "./Login.css";

const Login = () => {

  const navigate = useNavigate(); // ✅ thêm

  // ✅ state
  const [formData, setFormData] = useState({
    identifier: "",
    password: ""
  });

  // ✅ handle input
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  // ✅ submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/users/login/", {
        identifier: formData.identifier,
        password: formData.password
      });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("userChanged"));

      alert("Đăng nhập thành công!");
      console.log(res.data);

      // ✅ chuyển trang home
      navigate("/");

    } catch (err) {
      console.error(err.response?.data);
      alert(err.response?.data?.error || "Sai tài khoản hoặc mật khẩu!");
    }
  };

  return (
    <>
      <div className="login-page bg-background-light dark:bg-background-dark min-h-screen flex flex-col">
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/50 z-10" />
            <div
              className="w-full h-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA-5EF4Bd2I7vWZIIH-2I-WTmhPK7P8gTLyjJfUqI-3w3TfLnp4XBPT7LO204mG9c-6HV2XYCTdldRNlwjfvJv8VZsKYp4IY1o7Z_sE-j0CdGc-fvbmRuUsqv27jRRxri_Ld5Rw5rDhdQygYBKemYyIpaLILnm_HPd7D9vuI_HJoaaOkvrFoG7UMEmIVy8gJiNBV4YFkz_-oKwytmjruQaRjFqVlK4e_OkEbqbAP9k5CjBC_QZDdMKdyW2Qwto26FHqQCV71-TXujw')",
              }}
            />
          </div>

          <div className="relative z-20 w-full max-w-md bg-white/95 dark:bg-background-dark/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-white/20">
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 mb-4 bg-primary/10 rounded-full">
                <span className="material-symbols-outlined text-primary text-4xl">sports_soccer</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Chào mừng trở lại!
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Đăng nhập để đặt sân bóng ngay hôm nay
              </p>
            </div>

            <div className="px-8 pb-8">

              {/* ✅ thêm onSubmit */}
              <form action="#" className="space-y-5" onSubmit={handleSubmit}>

                <div>
                  <label
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    htmlFor="identifier"
                  >
                    Email hoặc Số điện thoại
                  </label>
                  <div className="relative input-group">
                    <span className="material-icons input-icon">person</span>
                    <input
                      id="identifier"
                      onChange={handleChange} // ✅ thêm
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-slate-100"
                      placeholder="name@example.com"
                      type="text"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                    htmlFor="password"
                  >
                    Mật khẩu
                  </label>
                  <div className="relative input-group">
                    <span className="material-icons input-icon">lock</span>
                    <input
                      id="password"
                      onChange={handleChange} // ✅ thêm
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-slate-900 dark:text-slate-100"
                      placeholder="Nhập mật khẩu"
                      type="password"
                    />
                  </div>
                </div>

                <button
                  className="login-button w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
                  type="submit"
                >
                  Đăng nhập
                </button>

              </form>

              <div className="mt-8 relative text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <span className="relative px-4 bg-white dark:bg-background-dark text-xs font-medium text-slate-500 uppercase tracking-widest">
                  Hoặc đăng nhập với
                </span>
              </div>

              <div className="mt-6 flex gap-3 social-buttons">
                <button type="button" className="google-login flex items-center justify-center">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/281/281764.png"
                    alt="Google"
                    className="social-icon"
                  />
                  Đăng nhập với Google
                </button>
                <button type="button" className="facebook-login flex items-center justify-center">
                  <img
                    src="https://cdn-icons-png.flaticon.com/512/733/733547.png"
                    alt="Facebook"
                    className="social-icon"
                  />
                  Đăng nhập với Facebook
                </button>
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Chưa có tài khoản?
                <Link className="font-bold text-primary hover:underline ml-1" to="/register">
                  Đăng ký ngay
                </Link>
              </p>
            </div>
          </div>

          <div className="fixed bottom-6 right-6 hidden md:block">
            <p className="text-white/60 text-xs flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">copyright</span> 2024 Football Booking System
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;