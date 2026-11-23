import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import { BASE_URL } from "../../config";
import "./Profile.css";
import { updateUser, changePassword } from "../../api/usersApi";
import { getMyVouchers } from "../../api/vouchersApi";
import { useToast, ToastContainer } from "../../components/Toast/Toast";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [userVouchers, setUserVouchers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setFormData({
        full_name: parsedUser.full_name || parsedUser.fullname || "",
        phone: parsedUser.phone || "",
        email: parsedUser.email || "",
      });

      if (parsedUser.id) {
        fetch(`${BASE_URL}/bookings/user/${parsedUser.id}/`)
          .then((response) => (response.ok ? response.json() : []))
          .then((data) => setRecentBookings(Array.isArray(data) ? data.slice(0, 2) : []))
          .catch((error) => console.error("Lỗi tải lịch sử hoạt động:", error));

        getMyVouchers(parsedUser.id, "all")
          .then((res) => setUserVouchers(res.data?.vouchers || []))
          .catch((err) => console.error("Lỗi tải ví voucher:", err));
      }
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const response = await updateUser(user.id, formData);
      if (response.status === 200) {
        toast.success("Cập nhật hồ sơ thành công!");
        const updatedUser = {
          ...user,
          full_name: formData.full_name,
          fullname: formData.full_name,
          phone: formData.phone,
          email: formData.email,
        };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("userChanged"));
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.error || "Có lỗi xảy ra khi cập nhật hồ sơ!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();
    if (!passwordData.new_password) {
      toast.error("Vui lòng nhập mật khẩu mới");
      return;
    }
    if (passwordData.new_password.length < 8) {
      toast.error("Mật khẩu mới phải có tối thiểu 8 ký tự");
      return;
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("Xác nhận mật khẩu mới không khớp");
      return;
    }

    setPwdLoading(true);
    try {
      const response = await changePassword(user.id, passwordData);
      if (response.status === 200) {
        toast.success("Đổi mật khẩu thành công!");
        setIsChangingPassword(false);
        setPasswordData({
          old_password: "",
          new_password: "",
          confirm_password: "",
        });
      }
    } catch (err) {
      console.error("Error changing password:", err);
      toast.error(err.response?.data?.error || "Đổi mật khẩu thất bại!");
    } finally {
      setPwdLoading(false);
    }
  };

  if (!user) return (
    <div className="profile-login-required">
      <div>
        <span className="material-symbols-outlined">lock</span>
        <h2>Vui lòng đăng nhập</h2>
        <p>Bạn cần đăng nhập để xem thông tin cá nhân.</p>
        <Link to="/login">Đăng nhập ngay</Link>
      </div>
    </div>
  );

  const displayName = user.full_name || user.fullname || "Người dùng";

  // Bản đồ hiển thị nhãn cho tất cả các vai trò
  const ROLE_LABELS = {
    admin:         'Quản trị viên',
    field_owner:   'Chủ sân',
    field_manager: 'Người quản lý sân',
    receptionist:  'Lễ tân',
    cashier:       'Nhân viên thu ngân',
    cleaner:       'Nhân viên dọn dẹp',
    service_staff: 'Nhân viên dịch vụ',
    maintenance:   'Nhân viên bảo trì sân',
    staff:         'Nhân viên',
    customer:      'Thành viên',
  };
  const roleLabel = user.is_admin ? 'Quản trị viên' : (ROLE_LABELS[user.role] || 'Thành viên');
  const isAdminRole = user.role === 'admin' || user.is_admin;

  return (
    <div className="profile-page">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <PageHero
        breadcrumb={[{ label: "Trang chủ", to: "/" }, { label: "Tài khoản", to: "/profile" }, { label: "Thông tin của tôi" }]}
        eyebrow="TÀI KHOẢN CÁ NHÂN"
        title="Thông tin tài khoản & hồ sơ"
        description="Quản lý thông tin định danh, số điện thoại liên lạc và lịch sử giao dịch của bạn tại Football Booking."
      />

      <div className="profile-content">
        <section className="profile-identity-panel">
          <div className="profile-avatar">
            <span className="material-symbols-outlined">person</span>
            <span className="profile-avatar-status" />
          </div>
          <div className="profile-identity-copy">
            <h2>
              {displayName}
              <span className="profile-verified">
                <span className="material-symbols-outlined">verified</span>
                Tài khoản đã xác minh
              </span>
            </h2>
            <div className="profile-identity-tags">
              <span className={`profile-role-tag ${isAdminRole ? "profile-role-tag--admin" : ""}`}>
                {roleLabel}
              </span>
              {user.phone && (
                <span>
                  <span className="material-symbols-outlined">phone_iphone</span>
                  {user.phone}
                </span>
              )}
            </div>
          </div>
          <div className="profile-identity-actions">
            <button type="button" onClick={() => setIsEditing(true)} className="profile-edit-button">
              <span className="material-symbols-outlined">edit</span>
              Chỉnh sửa hồ sơ
            </button>
            <button type="button" onClick={() => setIsChangingPassword(true)} className="profile-change-pwd-button">
              <span className="material-symbols-outlined">lock_reset</span>
              Đổi mật khẩu
            </button>
          </div>
        </section>

        <div className="profile-main-grid">
          <section className="profile-info-panel">
            <div className="profile-panel-heading">
              <div>
                <span className="material-symbols-outlined">badge</span>
                <div>
                  <h2>Thông tin tài khoản</h2>
                  <p>Dữ liệu định danh được bảo mật tiêu chuẩn</p>
                </div>
              </div>
              <span className="profile-active-status">
                <span /> ĐANG HOẠT ĐỘNG
              </span>
            </div>
            <div className="profile-info-grid">
              <div className="profile-info-item">
                <span className="material-symbols-outlined">person</span>
                <div>
                  <small>HỌ VÀ TÊN</small>
                  <strong>{user.full_name || user.fullname || "Chưa cập nhật"}</strong>
                </div>
              </div>
              <div className="profile-info-item">
                <span className="material-symbols-outlined">call</span>
                <div>
                  <small>SỐ ĐIỆN THOẠI</small>
                  <strong>{user.phone || "Chưa cập nhật"}</strong>
                  {user.phone && <em>Thông tin liên hệ đặt sân</em>}
                </div>
              </div>
              <div className="profile-info-item">
                <span className="material-symbols-outlined">alternate_email</span>
                <div>
                  <small>ĐỊA CHỈ EMAIL</small>
                  <strong>{user.email || "Chưa cập nhật"}</strong>
                  {user.email && <em>Email nhận thông báo</em>}
                </div>
              </div>
              <div className="profile-info-item">
                <span className="material-symbols-outlined">tag</span>
                <div>
                  <small>MÃ TÀI KHOẢN</small>
                  <strong className="profile-user-id">#{user.id || "N/A"}</strong>
                  <em>Mã định danh hệ thống</em>
                </div>
              </div>
            </div>
          </section>

          <aside className="profile-activity-panel">
            <div className="profile-panel-heading">
              <div>
                <span className="material-symbols-outlined">history</span>
                <div>
                  <h2>Lịch sử hoạt động</h2>
                  <p>Xem lại các sân bóng bạn đã đặt</p>
                </div>
              </div>
              <span className="profile-activity-count">{recentBookings.length} lượt</span>
            </div>
            {recentBookings.length > 0 ? (
              <div className="profile-recent-list">
                {recentBookings.map((booking) => (
                  <Link key={booking.id} to={`/my-bookings/${booking.id}`} state={{ booking }} className="profile-recent-item">
                    <span className="material-symbols-outlined">sports_soccer</span>
                    <div>
                      <strong>{booking.fieldName}</strong>
                      <span>{booking.timeSlot} · {new Date(booking.bookingDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <span className="profile-recent-price">{Number(booking.price || 0).toLocaleString("vi-VN")}đ</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="profile-no-activity">
                <span className="material-symbols-outlined">event_busy</span>
                <p>Chưa có lịch sử đặt sân.</p>
              </div>
            )}
            <Link to="/my-bookings" className="profile-history-link">
              Xem tất cả lịch sử đặt sân <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </aside>
        </div>

        {/* ═══ KHO VOUCHER CỦA TÔI ═══ */}
        <section className="profile-voucher-section">
          <div className="profile-voucher-header">
            <div className="profile-voucher-title-wrap">
              <span className="material-symbols-outlined profile-voucher-icon">confirmation_number</span>
              <div>
                <h2>Kho Voucher & Ưu đãi</h2>
                <p>Mã giảm giá nhận được khi hoàn thành các lượt đặt sân</p>
              </div>
            </div>
            <span className="profile-voucher-badge">
              {userVouchers.filter((v) => v.is_valid_to_use).length} voucher khả dụng
            </span>
          </div>

          {userVouchers.length > 0 ? (
            <div className="profile-voucher-grid">
              {userVouchers.map((v) => {
                const isValid = v.is_valid_to_use;
                const isUsed = v.is_used;
                return (
                  <div
                    key={v.id}
                    className={`profile-voucher-card ${isValid ? "valid" : "expired"}`}
                  >
                    <div>
                      <div className="profile-voucher-card-top">
                        <span className="profile-voucher-code">
                          {v.code}
                        </span>
                        <span
                          className={`profile-voucher-status ${
                            isUsed ? "used" : isValid ? "active" : "expired"
                          }`}
                        >
                          {isUsed ? "Đã sử dụng" : isValid ? "Khả dụng" : "Đã hết hạn"}
                        </span>
                      </div>
                      <div className="profile-voucher-card-title">
                        {v.title}
                      </div>
                      <div className="profile-voucher-card-desc">
                        {v.discount_type === "percent"
                          ? `Giảm ${v.discount_value}% (Tối đa ${Number(v.max_discount || 0).toLocaleString("vi-VN")}đ)`
                          : `Giảm ${Number(v.discount_value).toLocaleString("vi-VN")}đ`}
                      </div>
                    </div>

                    <div className="profile-voucher-card-bottom">
                      <span>Đơn từ {Number(v.min_booking_price || 0).toLocaleString("vi-VN")}đ</span>
                      <span>HSD: {new Date(v.valid_until).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="profile-voucher-empty">
              <span className="material-symbols-outlined">savings</span>
              <p>Chưa có voucher nào trong ví</p>
              <small>
                Hoàn thành một lượt đặt sân bóng để nhận ngay voucher giảm giá cho các trận đấu tiếp theo!
              </small>
            </div>
          )}
        </section>

        {/* ═══ Modal Chỉnh sửa hồ sơ ═══ */}
        {isEditing && (
          <div className="profile-modal-overlay">
            <div className="profile-edit-modal">
              <div className="profile-modal-header">
                <h3>Chỉnh sửa hồ sơ</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  type="button"
                  className="profile-modal-close"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="profile-edit-form">
                <div>
                  <label htmlFor="profile-full-name">Họ và tên</label>
                  <div className="profile-input-wrap">
                    <span className="material-symbols-outlined">person</span>
                    <input
                      id="profile-full-name"
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Nhập họ và tên..."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-phone">Số điện thoại</label>
                  <div className="profile-input-wrap">
                    <span className="material-symbols-outlined">call</span>
                    <input
                      id="profile-phone"
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Nhập số điện thoại..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-email">Địa chỉ Email</label>
                  <div className="profile-input-wrap">
                    <span className="material-symbols-outlined">mail</span>
                    <input
                      id="profile-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Nhập địa chỉ email..."
                    />
                  </div>
                </div>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="profile-modal-cancel"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="profile-modal-save"
                  >
                    {loading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ Modal Đổi mật khẩu ═══ */}
        {isChangingPassword && (
          <div className="profile-modal-overlay">
            <div className="profile-edit-modal">
              <div className="profile-modal-header">
                <h3>Đổi mật khẩu tài khoản</h3>
                <button
                  onClick={() => setIsChangingPassword(false)}
                  type="button"
                  className="profile-modal-close"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <form onSubmit={handleSubmitPassword} className="profile-edit-form">
                <div>
                  <label htmlFor="profile-old-pwd">Mật khẩu hiện tại</label>
                  <div className="profile-input-wrap">
                    <span className="material-symbols-outlined">key</span>
                    <input
                      id="profile-old-pwd"
                      type="password"
                      name="old_password"
                      value={passwordData.old_password}
                      onChange={handlePasswordChange}
                      placeholder="Nhập mật khẩu hiện tại..."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-new-pwd">Mật khẩu mới (tối thiểu 8 ký tự)</label>
                  <div className="profile-input-wrap">
                    <span className="material-symbols-outlined">lock</span>
                    <input
                      id="profile-new-pwd"
                      type="password"
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      placeholder="Nhập mật khẩu mới..."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="profile-confirm-pwd">Xác nhận mật khẩu mới</label>
                  <div className="profile-input-wrap">
                    <span className="material-symbols-outlined">lock_clock</span>
                    <input
                      id="profile-confirm-pwd"
                      type="password"
                      name="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      placeholder="Nhập lại mật khẩu mới..."
                      required
                    />
                  </div>
                </div>

                <div className="profile-modal-actions">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="profile-modal-cancel"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={pwdLoading}
                    className="profile-modal-save"
                  >
                    {pwdLoading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
