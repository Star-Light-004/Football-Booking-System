import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom"; 
import { register } from "../../api/authApi";
import "./Register.css";

const Register = () => {

   const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    const res = await register({
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
        <div className="register-message-overlay" role="status" aria-live="polite">
          <div className={`register-message-card ${isSuccess ? "success" : "error"}`}>
            <span className="material-symbols-outlined">{isSuccess ? "check_circle" : "error"}</span>
            <p>{message}</p>
          </div>
        </div>
      )}
      <div className="register-page-content">
        <div className="auth-card auth-card--register">
          <section className="auth-promo auth-promo--register">
            <span className="auth-promo-kicker"><span /> CỘNG ĐỒNG THỂ THAO</span>
            <span className="register-promo-trophy material-symbols-outlined">emoji_events</span>
            <div className="register-promo-brand"><span className="material-symbols-outlined">sports_soccer</span></div>
            <h2>Chào mừng đến với hệ thống đặt sân</h2>
            <p>Gia nhập cộng đồng yêu bóng đá, kết nối đam mê và tìm kiếm đối thủ xứng tầm chỉ trong vài cú nhấp chuột.</p>
            <div className="register-promo-features">
              <div><span className="material-symbols-outlined">event_available</span><strong>Đặt sân 24/7</strong><small>Xác nhận tức thì</small></div>
              <div><span className="material-symbols-outlined">group_add</span><strong>Tìm đội nhanh</strong><small>Kết nối cộng đồng</small></div>
            </div>
            <div className="register-promo-bottom">
              <div><strong>24/7</strong><small>ĐẶT SÂN TRỰC TUYẾN</small></div>
              <div><strong>QR</strong><small>NHẬN SÂN NHANH</small></div>
            </div>
          </section>

          <section className="auth-form-panel register-form-panel">
            <div className="auth-form-heading register-form-heading">
              <h1>Đăng ký tài khoản</h1>
              <p>Vui lòng điền thông tin để bắt đầu trải nghiệm đặt sân siêu tốc.</p>
            </div>

            <form className="auth-form register-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="fullname">Họ và tên <b>*</b></label>
                <div className="auth-input-wrap"><span className="material-symbols-outlined">person</span><input id="fullname" onChange={handleChange} placeholder="Nguyễn Văn A" type="text" autoComplete="name" /></div>
              </div>
              <div className="auth-field">
                <label htmlFor="email">Email <b>*</b></label>
                <div className="auth-input-wrap"><span className="material-symbols-outlined">mail</span><input id="email" onChange={handleChange} placeholder="example@football.vn" type="email" autoComplete="email" /></div>
              </div>
              <div className="auth-field">
                <label htmlFor="phone">Số điện thoại <b>*</b></label>
                <div className="auth-input-wrap"><span className="material-symbols-outlined">call</span><input id="phone" onChange={handleChange} placeholder="0987 654 321" type="tel" autoComplete="tel" /></div>
              </div>
              <div className="auth-field">
                <label htmlFor="password">Mật khẩu <b>*</b></label>
                <div className="auth-input-wrap"><span className="material-symbols-outlined">lock</span><input id="password" onChange={handleChange} placeholder="Tối thiểu 8 ký tự" type={showPassword ? "text" : "password"} autoComplete="new-password" /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}><span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span></button></div>
              </div>
              <div className="auth-field">
                <label htmlFor="confirmPassword">Nhập lại mật khẩu <b>*</b></label>
                <div className="auth-input-wrap"><span className="material-symbols-outlined">lock_reset</span><input id="confirmPassword" onChange={handleChange} placeholder="Nhập lại mật khẩu vừa tạo" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" /><button className="auth-password-toggle" type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}><span className="material-symbols-outlined">{showConfirmPassword ? "visibility_off" : "visibility"}</span></button></div>
              </div>

              <label className="auth-check-row register-terms"><input type="checkbox" /><span>Tôi đồng ý với <Link to="/contact">Điều khoản dịch vụ</Link> và <Link to="/contact">Chính sách bảo mật</Link> của Football Booking.</span></label>
              <button className="auth-submit-button" type="submit">ĐĂNG KÝ NGAY <span className="material-symbols-outlined">arrow_forward</span></button>
            </form>

            <div className="auth-divider"><span>HOẶC ĐĂNG KÝ NHANH BẰNG</span></div>
            <div className="auth-social-buttons">
              <button type="button"><img src="https://cdn-icons-png.flaticon.com/512/281/281764.png" alt="" />Google</button>
              <button type="button"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="" />Facebook</button>
            </div>
            <p className="auth-switch-prompt">Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link></p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Register;