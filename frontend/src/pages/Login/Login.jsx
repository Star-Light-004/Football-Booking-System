import React, { useState } from "react"; // ✅ thêm useState
import { Link, useNavigate } from "react-router-dom"; // ✅ thêm useNavigate
import { login } from "../../api/authApi"; // ✅ thêm axios
import "./Login.css";
import { useToast, ToastContainer } from "../../components/Toast/Toast";

const Login = () => {

  const navigate = useNavigate(); // ✅ thêm
  const { toasts, removeToast, toast } = useToast();

  // ✅ state
  const [formData, setFormData] = useState({
    identifier: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);

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
      const res = await login({
        identifier: formData.identifier,
        password: formData.password
      });
      const userData = res.data.user;
      localStorage.setItem("user", JSON.stringify(userData));

      // Nếu là admin / staff → lưu thêm session riêng cho trang quản trị
      const ADMIN_ROLES = ["admin", "field_owner", "field_manager", "receptionist", "cashier", "cleaner", "service_staff", "maintenance"];
      if (ADMIN_ROLES.includes(userData.role)) {
        localStorage.setItem("admin_user", JSON.stringify(userData));
      }

      window.dispatchEvent(new Event("userChanged"));

      // ✅ chuyển trang home ngay, không hiện thông báo
      navigate("/");

    } catch (err) {
      toast.error(err.response?.data?.error || "Sai tài khoản hoặc mật khẩu!");
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="login-page">
        <div className="auth-card auth-card--login">
          <section className="auth-promo auth-promo--login">
            <div className="auth-promo-content">
              <span className="auth-promo-kicker"><span /> HỆ SINH THÁI ĐẶT SÂN SỐ</span>
              <h2>Chào mừng trở lại <em>sân cỏ!</em></h2>
              <p className="auth-promo-intro">Kết nối niềm đam mê bóng đá. Đặt sân siêu tốc, ghép kèo giao lưu, và trải nghiệm dịch vụ tiện ích hàng đầu.</p>
              <div className="auth-feature-list">
                <div><span className="material-symbols-outlined">schedule</span><p><strong>Giữ chỗ 24/7 tức thì</strong><small>Xem lịch trực tiếp theo thời gian thực và đặt sân không cần gọi điện.</small></p></div>
                <div><span className="material-symbols-outlined">local_offer</span><p><strong>Tích lũy điểm thưởng &amp; ưu đãi</strong><small>Nhận voucher giảm giá thuê sân, mua phụ kiện và thưởng tích điểm.</small></p></div>
                <div><span className="material-symbols-outlined">groups</span><p><strong>Tìm đối thủ &amp; bắt cặp nhanh</strong><small>Cộng đồng hơn 100.000+ đội bóng luôn sẵn sàng hữu mời tới.</small></p></div>
              </div>
              <div className="auth-promo-proof"><span className="material-symbols-outlined">verified_user</span><small>Đặt sân tiện lợi · Thông tin được bảo mật</small></div>
            </div>
          </section>

          <section className="auth-form-panel">
            <div className="auth-form-heading">
              <span className="auth-form-icon material-symbols-outlined">lock_open</span>
              <h1>Đăng nhập tài khoản</h1>
              <p>Đăng nhập để đặt sân bóng ngay hôm nay và quản lý lịch thi đấu.</p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="identifier">Email hoặc Số điện thoại <b>*</b></label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined">mail</span>
                  <input id="identifier" onChange={handleChange} placeholder="name@example.com hoặc 0901234xxx" type="text" autoComplete="username" />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-label-row"><label htmlFor="password">Mật khẩu <b>*</b></label><Link to="/contact">Quên mật khẩu?</Link></div>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined">lock</span>
                  <input id="password" onChange={handleChange} placeholder="Nhập mật khẩu của bạn" type={showPassword ? "text" : "password"} autoComplete="current-password" />
                  <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                    <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                  </button>
                </div>
              </div>

              <label className="auth-check-row"><input type="checkbox" defaultChecked /><span>Ghi nhớ đăng nhập trên thiết bị này</span></label>

              <button className="auth-submit-button" type="submit">Đăng nhập <span className="material-symbols-outlined">arrow_forward</span></button>
            </form>

            <div className="auth-divider"><span>HOẶC TIẾP TỤC VỚI</span></div>
            <div className="auth-social-buttons">
              <button type="button"><img src="https://cdn-icons-png.flaticon.com/512/281/281764.png" alt="" />Google</button>
              <button type="button"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="" />Facebook</button>
            </div>
            <p className="auth-switch-prompt">Chưa có tài khoản Football Booking? <Link to="/register">Đăng ký ngay</Link></p>
          </section>
        </div>
      </div>
    </>
  );
};

export default Login;