import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; 
import { register, socialAuth, checkUserExists } from "../../api/authApi";
import { useToast, ToastContainer } from "../../components/Toast/Toast";
import "./Register.css";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "383437703357-19e07jh06d4e2t2e3fl508j8l8kbfn96.apps.googleusercontent.com";
const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID || "1097234858348981";

const Register = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false
  });

  // Errors state cho từng ô
  const [errors, setErrors] = useState({});

  // ── Khởi tạo Google Identity Services & Facebook SDK từ trình duyệt ──────────
  useEffect(() => {
    // 1. Tải Google Identity Services
    if (!window.google) {
      const googleScript = document.createElement("script");
      googleScript.src = "https://accounts.google.com/gsi/client";
      googleScript.async = true;
      googleScript.defer = true;
      document.body.appendChild(googleScript);
    }

    // 2. Tải Facebook JavaScript SDK
    if (!window.FB) {
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: "v18.0"
        });
      };
      const fbScript = document.createElement("script");
      fbScript.src = "https://connect.facebook.net/vi_VN/sdk.js";
      fbScript.async = true;
      fbScript.defer = true;
      document.body.appendChild(fbScript);
    }
  }, []);

  // ── Validation logic cho từng ô ──────────────────────────────────────────
  const validateField = (field, value, allData = formData) => {
    let error = "";

    switch (field) {
      case "fullname": {
        const trimmed = (value || "").trim();
        if (!trimmed) {
          error = "Họ và tên không được để trống";
        } else if (trimmed.length < 2) {
          error = "Họ và tên phải có tối thiểu 2 ký tự";
        } else if (!/^[a-zA-ZàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ\s]+$/.test(trimmed)) {
          error = "Họ và tên chỉ được chứa chữ cái, không chứa số hoặc ký tự đặc biệt";
        }
        break;
      }

      case "email": {
        const trimmed = (value || "").trim().toLowerCase();
        if (!trimmed) {
          error = "Vui lòng nhập địa chỉ Gmail";
        } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(trimmed)) {
          error = "Gmail phải có đuôi @gmail.com (ví dụ: example@gmail.com)";
        }
        break;
      }

      case "phone": {
        const trimmed = (value || "").trim().replace(/\s/g, "");
        if (!trimmed) {
          error = "Số điện thoại không được để trống";
        } else if (!/^[0-9+]+$/.test(trimmed)) {
          error = "Số điện thoại chỉ được chứa các chữ số";
        } else if (!/^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(trimmed)) {
          error = "Số điện thoại phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08, 09";
        }
        break;
      }

      case "password": {
        if (!value) {
          error = "Mật khẩu không được để trống";
        } else if (value.length < 8) {
          error = "Mật khẩu phải có tối thiểu 8 ký tự";
        }
        break;
      }

      case "confirmPassword": {
        if (!value) {
          error = "Vui lòng nhập lại mật khẩu để xác nhận";
        } else if (value !== allData.password) {
          error = "Mật khẩu xác nhận không khớp";
        }
        break;
      }

      case "agreeTerms": {
        if (!value) {
          error = "Bạn cần đồng ý với Điều khoản và Chính sách bảo mật để tiếp tục";
        }
        break;
      }

      default:
        break;
    }

    return error;
  };

  // ✅ Xử lý khi nhập dữ liệu
  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;

    const newFormData = {
      ...formData,
      [id]: fieldValue
    };
    setFormData(newFormData);

    // Xóa lỗi của trường này khi người dùng sửa đổi
    if (errors[id]) {
      setErrors((prev) => ({
        ...prev,
        [id]: ""
      }));
    }

    // Nếu sửa password thì kiểm tra lại confirmPassword nếu đã nhập
    if (id === "password" && formData.confirmPassword) {
      const confirmErr = validateField("confirmPassword", formData.confirmPassword, newFormData);
      setErrors((prev) => ({
        ...prev,
        confirmPassword: confirmErr
      }));
    }
  };

  // ✅ Xử lý khi rời khỏi ô nhập (onBlur) để kiểm tra tức thì & kiểm tra trùng lặp
  const handleBlur = async (e) => {
    const { id, value, type, checked } = e.target;
    const fieldValue = type === "checkbox" ? checked : value;
    const err = validateField(id, fieldValue);
    if (err) {
      setErrors((prev) => ({ ...prev, [id]: err }));
      return;
    }

    // Nếu định dạng Gmail hợp lệ thì kiểm tra xem đã có người đăng ký chưa
    if (id === "email" && fieldValue.trim()) {
      try {
        const res = await checkUserExists({ email: fieldValue.trim().toLowerCase() });
        if (res.data?.email_exists) {
          setErrors((prev) => ({
            ...prev,
            email: "Gmail này đã có người đăng ký. Vui lòng dùng Gmail khác!"
          }));
        }
      } catch (errCheck) {
        console.error("Lỗi kiểm tra email trùng:", errCheck);
      }
    }

    // Nếu định dạng Số điện thoại hợp lệ thì kiểm tra xem đã có người đăng ký chưa
    if (id === "phone" && fieldValue.trim()) {
      try {
        const res = await checkUserExists({ phone: fieldValue.trim() });
        if (res.data?.phone_exists) {
          setErrors((prev) => ({
            ...prev,
            phone: "Số điện thoại này đã có người đăng ký. Vui lòng dùng số khác!"
          }));
        }
      } catch (errCheck) {
        console.error("Lỗi kiểm tra phone trùng:", errCheck);
      }
    }
  };

  // ✅ Submit form đăng ký thông thường
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate toàn bộ các trường
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key], formData);
      if (err) {
        newErrors[key] = err;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ!");

      // Cuộn đến ô lỗi đầu tiên
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.focus();
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        fullname: formData.fullname.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim().replace(/\s/g, ""),
        password: formData.password
      });

      toast.success("Đăng ký tài khoản thành công! Đang chuyển hướng...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (err) {
      const backendError = err.response?.data?.error || "Đăng ký thất bại, vui lòng thử lại!";
      toast.error(backendError);

      const lowerErr = backendError.toLowerCase();
      // Nếu lỗi số điện thoại hoặc email đã tồn tại thì gán lỗi vào ô tương ứng và focus
      if (lowerErr.includes("số điện thoại")) {
        setErrors((prev) => ({ ...prev, phone: backendError }));
        document.getElementById("phone")?.focus();
      } else if (lowerErr.includes("gmail") || lowerErr.includes("email")) {
        setErrors((prev) => ({ ...prev, email: backendError }));
        document.getElementById("email")?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Xử lý lưu kết quả đăng ký mạng xã hội từ tài khoản máy người dùng ───────
  const completeSocialRegistration = async (provider, email, fullname) => {
    try {
      setIsSocialLoading(true);
      toast.info(`Đang tạo tài khoản với thông tin ${provider === "google" ? "Google" : "Facebook"} của bạn...`);

      const res = await socialAuth({
        provider,
        email: email.trim().toLowerCase(),
        fullname: fullname ? fullname.trim() : undefined
      });

      const userData = res.data.user;
      localStorage.setItem("user", JSON.stringify(userData));
      window.dispatchEvent(new Event("userChanged"));

      toast.success(`Đăng ký thành công bằng tài khoản ${provider === "google" ? "Google" : "Facebook"} (${email})!`);

      setTimeout(() => {
        navigate("/");
      }, 1200);

    } catch (err) {
      toast.error(err.response?.data?.error || `Đăng ký bằng ${provider} thất bại!`);
    } finally {
      setIsSocialLoading(false);
    }
  };

  // ── Đăng ký bằng Google (Lấy tài khoản Google đang có trên trình duyệt) ────
  const handleGoogleSignIn = () => {
    if (!window.google?.accounts?.oauth2) {
      toast.info("Đang kết nối dịch vụ Google Sign-In, vui lòng thử lại sau giây lát...");
      return;
    }

    try {
      // Mở Popup chọn tài khoản Google đang đăng nhập trên trình duyệt
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "email profile openid",
        prompt: "select_account", // Bắt buộc mở danh sách tài khoản Google có trên máy
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            if (tokenResponse.error === "popup_closed_by_user") {
              toast.warning("Bạn đã đóng cửa sổ chọn tài khoản Google.");
            } else {
              toast.error("Không thể kết nối tài khoản Google: " + tokenResponse.error);
            }
            return;
          }

          if (tokenResponse.access_token) {
            try {
              // Lấy thông tin thật của tài khoản Google trên máy thông qua API chính thức của Google
              const googleInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              const googleUser = await googleInfoRes.json();

              if (googleUser?.email) {
                await completeSocialRegistration("google", googleUser.email, googleUser.name);
              } else {
                toast.error("Không tìm thấy email của tài khoản Google này!");
              }
            } catch (fetchErr) {
              console.error("Lỗi fetch userinfo Google:", fetchErr);
              toast.error("Không thể đọc thông tin tài khoản Google từ trình duyệt!");
            }
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch (err) {
      console.error("Lỗi Google Auth:", err);
      toast.error("Không thể khởi động cửa sổ Google Sign-In!");
    }
  };

  // ── Đăng ký bằng Facebook (Lấy tài khoản Facebook đang có trên trình duyệt) ──
  const handleFacebookSignIn = () => {
    if (!window.FB) {
      toast.info("Đang kết nối Facebook SDK, vui lòng thử lại sau giây lát...");
      return;
    }

    try {
      // Gọi Facebook Login popup của chính tài khoản Facebook trên máy
      window.FB.login(
        (response) => {
          if (response.authResponse) {
            window.FB.api("/me", { fields: "name,email" }, async (fbUser) => {
              if (fbUser && fbUser.name) {
                const fbEmail = fbUser.email || `${fbUser.id}@facebook.com`;
                await completeSocialRegistration("facebook", fbEmail, fbUser.name);
              } else {
                toast.error("Không thể lấy thông tin tài khoản Facebook trên máy!");
              }
            });
          } else {
            toast.warning("Bạn đã hủy xác thực với tài khoản Facebook.");
          }
        },
        { scope: "public_profile,email" }
      );
    } catch (err) {
      console.error("Lỗi Facebook Auth:", err);
      toast.error("Không thể khởi động cửa sổ Facebook Login!");
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="register-page">
        <div className="register-page-content">
          <div className="auth-card auth-card--register">
            {/* Promo Banner Bên Trái */}
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

            {/* Form Đăng Ký Bên Phải */}
            <section className="auth-form-panel register-form-panel">
              <div className="auth-form-heading register-form-heading">
                <h1>Đăng ký tài khoản</h1>
                <p>Vui lòng điền thông tin để bắt đầu trải nghiệm đặt sân siêu tốc.</p>
              </div>

              <form className="auth-form register-form" onSubmit={handleSubmit} noValidate>
                {/* 1. Họ và tên */}
                <div className="auth-field">
                  <label htmlFor="fullname">Họ và tên <b>*</b></label>
                  <div className={`auth-input-wrap ${errors.fullname ? "has-error" : ""}`}>
                    <span className="material-symbols-outlined">person</span>
                    <input 
                      id="fullname" 
                      value={formData.fullname}
                      onChange={handleChange} 
                      onBlur={handleBlur}
                      placeholder="Nguyễn Văn A" 
                      type="text" 
                      autoComplete="name" 
                    />
                  </div>
                  {errors.fullname && (
                    <div className="auth-field-error">
                      <span className="material-symbols-outlined">error</span>
                      <span>{errors.fullname}</span>
                    </div>
                  )}
                </div>

                {/* 2. Gmail */}
                <div className="auth-field">
                  <label htmlFor="email">Gmail <b>*</b></label>
                  <div className={`auth-input-wrap ${errors.email ? "has-error" : ""}`}>
                    <span className="material-symbols-outlined">mail</span>
                    <input 
                      id="email" 
                      value={formData.email}
                      onChange={handleChange} 
                      onBlur={handleBlur}
                      placeholder="example@gmail.com" 
                      type="email" 
                      autoComplete="email" 
                    />
                  </div>
                  {errors.email && (
                    <div className="auth-field-error">
                      <span className="material-symbols-outlined">error</span>
                      <span>{errors.email}</span>
                    </div>
                  )}
                </div>

                {/* 3. Số điện thoại */}
                <div className="auth-field">
                  <label htmlFor="phone">Số điện thoại <b>*</b></label>
                  <div className={`auth-input-wrap ${errors.phone ? "has-error" : ""}`}>
                    <span className="material-symbols-outlined">call</span>
                    <input 
                      id="phone" 
                      value={formData.phone}
                      onChange={handleChange} 
                      onBlur={handleBlur}
                      placeholder="0987 654 321" 
                      type="tel" 
                      autoComplete="tel" 
                    />
                  </div>
                  {errors.phone && (
                    <div className="auth-field-error">
                      <span className="material-symbols-outlined">error</span>
                      <span>{errors.phone}</span>
                    </div>
                  )}
                </div>

                {/* 4. Mật khẩu */}
                <div className="auth-field">
                  <label htmlFor="password">Mật khẩu <b>*</b></label>
                  <div className={`auth-input-wrap ${errors.password ? "has-error" : ""}`}>
                    <span className="material-symbols-outlined">lock</span>
                    <input 
                      id="password" 
                      value={formData.password}
                      onChange={handleChange} 
                      onBlur={handleBlur}
                      placeholder="Tối thiểu 8 ký tự" 
                      type={showPassword ? "text" : "password"} 
                      autoComplete="new-password" 
                    />
                    <button 
                      className="auth-password-toggle" 
                      type="button" 
                      onClick={() => setShowPassword((visible) => !visible)} 
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  {errors.password && (
                    <div className="auth-field-error">
                      <span className="material-symbols-outlined">error</span>
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>

                {/* 5. Nhập lại mật khẩu */}
                <div className="auth-field">
                  <label htmlFor="confirmPassword">Nhập lại mật khẩu <b>*</b></label>
                  <div className={`auth-input-wrap ${errors.confirmPassword ? "has-error" : ""}`}>
                    <span className="material-symbols-outlined">lock_reset</span>
                    <input 
                      id="confirmPassword" 
                      value={formData.confirmPassword}
                      onChange={handleChange} 
                      onBlur={handleBlur}
                      placeholder="Nhập lại mật khẩu vừa tạo" 
                      type={showConfirmPassword ? "text" : "password"} 
                      autoComplete="new-password" 
                    />
                    <button 
                      className="auth-password-toggle" 
                      type="button" 
                      onClick={() => setShowConfirmPassword((visible) => !visible)} 
                      aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      <span className="material-symbols-outlined">{showConfirmPassword ? "visibility_off" : "visibility"}</span>
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <div className="auth-field-error">
                      <span className="material-symbols-outlined">error</span>
                      <span>{errors.confirmPassword}</span>
                    </div>
                  )}
                </div>

                {/* 6. Đồng ý điều khoản */}
                <div className="auth-terms-group">
                  <label className="auth-check-row register-terms">
                    <input 
                      id="agreeTerms"
                      type="checkbox" 
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                    />
                    <span>Tôi đồng ý với <Link to="/contact">Điều khoản dịch vụ</Link> và <Link to="/contact">Chính sách bảo mật</Link> của Football Booking.</span>
                  </label>
                  {errors.agreeTerms && (
                    <div className="auth-field-error" style={{ marginTop: 2, marginBottom: 8 }}>
                      <span className="material-symbols-outlined">error</span>
                      <span>{errors.agreeTerms}</span>
                    </div>
                  )}
                </div>

                <button 
                  className="auth-submit-button" 
                  type="submit" 
                  disabled={isSubmitting || isSocialLoading}
                >
                  {isSubmitting ? (
                    <>ĐANG XỬ LÝ... <span className="material-symbols-outlined animate-spin">refresh</span></>
                  ) : (
                    <>ĐĂNG KÝ NGAY <span className="material-symbols-outlined">arrow_forward</span></>
                  )}
                </button>
              </form>

              {/* Phân cách đăng ký mạng xã hội */}
              <div className="auth-divider"><span>HOẶC ĐĂNG KÝ NHANH BẰNG</span></div>
              <div className="auth-social-buttons">
                <button 
                  type="button" 
                  onClick={handleGoogleSignIn}
                  disabled={isSocialLoading}
                  title="Đăng ký bằng tài khoản Google trên máy"
                >
                  <img src="https://cdn-icons-png.flaticon.com/512/281/281764.png" alt="Google" />
                  {isSocialLoading ? "Đang kết nối..." : "Google"}
                </button>
                <button 
                  type="button" 
                  onClick={handleFacebookSignIn}
                  disabled={isSocialLoading}
                  title="Đăng ký bằng tài khoản Facebook trên máy"
                >
                  <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" />
                  {isSocialLoading ? "Đang kết nối..." : "Facebook"}
                </button>
              </div>

              <p className="auth-switch-prompt">Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link></p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;