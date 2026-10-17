import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageHero from "../../components/PageHero/PageHero";
import { BASE_URL } from "../../config";
import "./Profile.css";
import { updateUser } from "../../api/usersApi";
import { getMyVouchers } from "../../api/vouchersApi";
import { useToast, ToastContainer } from "../../components/Toast/Toast";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [userVouchers, setUserVouchers] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });
  const [loading, setLoading] = useState(false);
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const response = await updateUser(user.id, formData);
      if (response.status === 200) {
        toast.success("Cập nhật hồ sơ thành công!");
        const updatedUser = { ...user, ...formData };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Có lỗi xảy ra khi cập nhật hồ sơ!");
    } finally {
      setLoading(false);
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
          <div className="profile-avatar"><span className="material-symbols-outlined">person</span><span className="profile-avatar-status" /></div>
          <div className="profile-identity-copy">
            <h2>{displayName}<span className="profile-verified"><span className="material-symbols-outlined">verified</span>Tài khoản đã xác minh</span></h2>
            <div className="profile-identity-tags">
              <span className={`profile-role-tag ${isAdminRole ? "profile-role-tag--admin" : ""}`}>{roleLabel}</span>
              {user.phone && <span><span className="material-symbols-outlined">phone_iphone</span>{user.phone}</span>}
            </div>
          </div>
          <button type="button" onClick={() => setIsEditing(true)} className="profile-edit-button">
            <span className="material-symbols-outlined">edit</span>Chỉnh sửa hồ sơ
          </button>
        </section>

        <div className="profile-main-grid">
          <section className="profile-info-panel">
            <div className="profile-panel-heading">
              <div><span className="material-symbols-outlined">badge</span><div><h2>Thông tin tài khoản</h2><p>Dữ liệu định danh được bảo mật tiêu chuẩn</p></div></div>
              <span className="profile-active-status"><span /> ĐANG HOẠT ĐỘNG</span>
            </div>
            <div className="profile-info-grid">
              <div className="profile-info-item"><span className="material-symbols-outlined">person</span><div><small>HỌ VÀ TÊN</small><strong>{user.full_name || user.fullname || "Chưa cập nhật"}</strong></div></div>
              <div className="profile-info-item"><span className="material-symbols-outlined">call</span><div><small>SỐ ĐIỆN THOẠI</small><strong>{user.phone || "Chưa cập nhật"}</strong>{user.phone && <em>Thông tin liên hệ đặt sân</em>}</div></div>
              <div className="profile-info-item"><span className="material-symbols-outlined">alternate_email</span><div><small>ĐỊA CHỈ EMAIL</small><strong>{user.email || "Chưa cập nhật"}</strong>{user.email && <em>Email nhận thông báo</em>}</div></div>
              <div className="profile-info-item"><span className="material-symbols-outlined">tag</span><div><small>MÃ TÀI KHOẢN</small><strong className="profile-user-id">#{user.id || "N/A"}</strong><em>Mã định danh hệ thống</em></div></div>
            </div>
          </section>

          <aside className="profile-activity-panel">
            <div className="profile-panel-heading">
              <div><span className="material-symbols-outlined">history</span><div><h2>Lịch sử hoạt động</h2><p>Xem lại các sân bóng bạn đã đặt</p></div></div>
              <span className="profile-activity-count">{recentBookings.length} lượt</span>
            </div>
            {recentBookings.length > 0 ? (
              <div className="profile-recent-list">
                {recentBookings.map((booking) => (
                  <Link key={booking.id} to={`/my-bookings/${booking.id}`} state={{ booking }} className="profile-recent-item">
                    <span className="material-symbols-outlined">sports_soccer</span>
                    <div><strong>{booking.fieldName}</strong><span>{booking.timeSlot} · {new Date(booking.bookingDate).toLocaleDateString("vi-VN")}</span></div>
                    <span className="profile-recent-price">{Number(booking.price || 0).toLocaleString("vi-VN")}đ</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="profile-no-activity"><span className="material-symbols-outlined">event_busy</span><p>Chưa có lịch sử đặt sân.</p></div>
            )}
            <Link to="/my-bookings" className="profile-history-link">Xem tất cả lịch sử đặt sân <span className="material-symbols-outlined">arrow_forward</span></Link>
          </aside>
        </div>

        {/* ═══ KHO VOUCHER CỦA TÔI ═══ */}
        <section className="profile-voucher-section" style={{ marginTop: 24, background: "#fff", padding: "24px", borderRadius: 16, border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "1.8rem", color: "#16a34a" }}>confirmation_number</span>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#111827" }}>Kho Voucher & Ưu đãi</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#6b7280" }}>Mã giảm giá nhận được khi hoàn thành các lượt đặt sân</p>
              </div>
            </div>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, background: "#f0fdf4", color: "#166534", padding: "5px 12px", borderRadius: 20, border: "1px solid #bbf7d0" }}>
              {userVouchers.filter((v) => v.is_valid_to_use).length} voucher khả dụng
            </span>
          </div>

          {userVouchers.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {userVouchers.map((v) => {
                const isValid = v.is_valid_to_use;
                const isUsed = v.is_used;
                return (
                  <div
                    key={v.id}
                    style={{
                      border: isValid ? "1.5px dashed #86efac" : "1.5px solid #e5e7eb",
                      borderRadius: 12,
                      padding: "16px",
                      background: isValid ? "#fafffa" : "#f9fafb",
                      opacity: isValid ? 1 : 0.65,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 0.2s, box-shadow 0.2s",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: "1.1rem", color: isValid ? "#15803d" : "#6b7280", letterSpacing: "0.5px" }}>
                          {v.code}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: isUsed ? "#e5e7eb" : isValid ? "#dcfce7" : "#fee2e2",
                            color: isUsed ? "#4b5563" : isValid ? "#166534" : "#b91c1c",
                          }}
                        >
                          {isUsed ? "Đã sử dụng" : isValid ? "Khả dụng" : "Đã hết hạn"}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1f2937", marginBottom: 4 }}>
                        {v.title}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#4b5563" }}>
                        {v.discount_type === "percent"
                          ? `Giảm ${v.discount_value}% (Tối đa ${Number(v.max_discount || 0).toLocaleString("vi-VN")}đ)`
                          : `Giảm ${Number(v.discount_value).toLocaleString("vi-VN")}đ`}
                      </div>
                    </div>

                    <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #f3f4f6", fontSize: "0.75rem", color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
                      <span>Đơn từ {Number(v.min_booking_price || 0).toLocaleString("vi-VN")}đ</span>
                      <span>HSD: {new Date(v.valid_until).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "30px 20px", textAlign: "center", background: "#f9fafb", borderRadius: 12, border: "1px dashed #d1d5db" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "2.2rem", color: "#9ca3af" }}>savings</span>
              <p style={{ margin: "8px 0 4px", fontWeight: 700, color: "#374151" }}>Chưa có voucher nào trong ví</p>
              <small style={{ color: "#6b7280" }}>
                Hoàn thành một lượt đặt sân bóng để nhận ngay voucher giảm giá cho các trận đấu tiếp theo!
              </small>
            </div>
          )}
        </section>

        {/* Edit Profile Modal */}
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
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                    ) : (
                      "Lưu thay đổi"
                    )}
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

