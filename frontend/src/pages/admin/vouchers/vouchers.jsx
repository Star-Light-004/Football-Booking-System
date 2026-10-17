import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import {
  adminGetVouchers,
  adminCreateVoucher,
  adminUpdateVoucher,
  adminDeleteVoucher,
  adminGetCustomerVouchersHistory,
} from "../../../api/vouchersApi";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import "./vouchers.css";

const INITIAL_FORM = {
  code: "",
  title: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  max_discount: 50000,
  min_booking_price: 100000,
  expiry_days: 30,
  usage_limit: 100,
  is_system_reward: false,
  is_active: true,
};

function TopHeader({ onAdd, searchTerm, onSearchChange }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder="Tìm kiếm voucher, khuyến mãi..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <button className="icon-btn" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="icon-btn" title="Trợ giúp">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="header-divider" />
        <button className="btn-new-booking" onClick={onAdd}>
          <span className="material-symbols-outlined">add</span>
          Thêm voucher
        </button>
      </div>
    </header>
  );
}

export default function AdminVouchers() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab") === "history" ? "history" : "vouchers";

  const handleTabChange = (tabKey) => {
    if (tabKey === "history") {
      navigate("/admin/vouchers?tab=history");
    } else {
      navigate("/admin/vouchers");
    }
  };

  const [vouchers, setVouchers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, system_rewards: 0, total_used: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // State Lịch sử phát voucher cho khách
  const [issuedVouchers, setIssuedVouchers] = useState([]);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [issuedSearch, setIssuedSearch] = useState("");
  const [issuedStatusFilter, setIssuedStatusFilter] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deletingVoucher, setDeletingVoucher] = useState(null);

  const { toasts, removeToast, toast } = useToast();

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await adminGetVouchers();
      if (res.data) {
        setVouchers(res.data.vouchers || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách voucher:", err);
      toast.error("Không thể tải danh sách voucher từ hệ thống!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchIssuedVouchers = async () => {
    try {
      setLoadingIssued(true);
      const res = await adminGetCustomerVouchersHistory();
      if (res.data) {
        setIssuedVouchers(res.data.issued_vouchers || res.data.customer_vouchers || []);
      }
    } catch (err) {
      console.error("Lỗi tải lịch sử phát voucher:", err);
      toast.error("Không thể tải lịch sử phát voucher cho khách!");
    } finally {
      setLoadingIssued(false);
    }
  };

  useEffect(() => {
    if (currentTab === "history") {
      fetchIssuedVouchers();
    }
  }, [currentTab]);

  // Filtered Vouchers
  const filteredVouchers = vouchers.filter((v) => {
    const matchSearch =
      v.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (activeTab === "active") return v.is_active;
    if (activeTab === "inactive") return !v.is_active;
    if (activeTab === "reward") return v.is_system_reward;
    if (activeTab === "percent") return v.discount_type === "percent";
    if (activeTab === "fixed") return v.discount_type === "fixed";
    return true;
  });

  // Filtered Issued Vouchers (Lịch sử phát cho khách)
  const filteredIssuedVouchers = issuedVouchers.filter((iv) => {
    const matchSearch =
      !issuedSearch.trim() ||
      iv.code?.toLowerCase().includes(issuedSearch.toLowerCase()) ||
      iv.customer_name?.toLowerCase().includes(issuedSearch.toLowerCase()) ||
      iv.customer_phone?.toLowerCase().includes(issuedSearch.toLowerCase()) ||
      iv.customer_email?.toLowerCase().includes(issuedSearch.toLowerCase()) ||
      iv.voucher_code?.toLowerCase().includes(issuedSearch.toLowerCase()) ||
      iv.voucher_title?.toLowerCase().includes(issuedSearch.toLowerCase()) ||
      iv.source_booking_code?.toLowerCase().includes(issuedSearch.toLowerCase()) ||
      iv.used_booking_code?.toLowerCase().includes(issuedSearch.toLowerCase());

    if (!matchSearch) return false;

    if (issuedStatusFilter === "active") return !iv.is_used && !iv.is_expired;
    if (issuedStatusFilter === "used") return iv.is_used;
    if (issuedStatusFilter === "expired") return !iv.is_used && iv.is_expired;
    return true;
  });

  const issuedStats = {
    total: issuedVouchers.length,
    active: issuedVouchers.filter((iv) => !iv.is_used && !iv.is_expired).length,
    used: issuedVouchers.filter((iv) => iv.is_used).length,
    expired: issuedVouchers.filter((iv) => !iv.is_used && iv.is_expired).length,
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingVoucher(null);
    setFormData(INITIAL_FORM);
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (v) => {
    setEditingVoucher(v);
    setFormData({
      code: v.code || "",
      title: v.title || "",
      description: v.description || "",
      discount_type: v.discount_type || "percent",
      discount_value: v.discount_value || 0,
      max_discount: v.max_discount || "",
      min_booking_price: v.min_booking_price || 0,
      expiry_days: v.expiry_days || 30,
      usage_limit: v.usage_limit !== undefined && v.usage_limit !== null ? v.usage_limit : "",
      is_system_reward: Boolean(v.is_system_reward),
      is_active: Boolean(v.is_active),
    });
    setShowModal(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.code.trim()) {
      toast.error("Vui lòng nhập mã voucher!");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề voucher!");
      return;
    }
    if (Number(formData.discount_value) <= 0) {
      toast.error("Giá trị giảm giá phải lớn hơn 0!");
      return;
    }
    if (formData.discount_type === "percent" && Number(formData.discount_value) > 100) {
      toast.error("Phần trăm giảm giá không được vượt quá 100%!");
      return;
    }

    setSubmitting(true);
    const payload = {
      ...formData,
      usage_limit:
        formData.usage_limit !== "" && formData.usage_limit !== null
          ? parseInt(formData.usage_limit, 10)
          : null,
    };

    try {
      if (editingVoucher) {
        await adminUpdateVoucher(editingVoucher.id, payload);
        toast.success("Cập nhật thông tin voucher thành công!");
      } else {
        await adminCreateVoucher(payload);
        toast.success("Tạo voucher mới thành công!");
      }
      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      console.error("Lỗi lưu voucher:", err);
      toast.error(err.response?.data?.error || "Có lỗi xảy ra khi lưu voucher!");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (v) => {
    try {
      await adminUpdateVoucher(v.id, { is_active: !v.is_active });
      toast.success(
        !v.is_active
          ? `Đã kích hoạt voucher ${v.code}`
          : `Đã tạm ngưng voucher ${v.code}`
      );
      fetchVouchers();
    } catch (err) {
      console.error("Lỗi đổi trạng thái voucher:", err);
      toast.error("Không thể thay đổi trạng thái voucher!");
    }
  };

  // Confirm delete
  const handleDeleteVoucher = async () => {
    if (!deletingVoucher) return;
    try {
      const res = await adminDeleteVoucher(deletingVoucher.id);
      toast.success(res.data?.message || "Đã xóa voucher thành công!");
      setDeletingVoucher(null);
      fetchVouchers();
    } catch (err) {
      console.error("Lỗi xóa voucher:", err);
      toast.error(err.response?.data?.error || "Không thể xóa voucher!");
    }
  };

  return (
    <div className="vouchers-page-layout">
      <AdminSidebar />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="vouchers-page-container">
        <TopHeader
          onAdd={handleOpenCreate}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <main className="vouchers-main-content">
          {/* Main Sub Tabs Switcher */}
          <div className="v-main-nav-tabs">
            <button
              className={`v-main-nav-btn ${currentTab === "vouchers" ? "active" : ""}`}
              onClick={() => handleTabChange("vouchers")}
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              Chính sách voucher
            </button>
            <button
              className={`v-main-nav-btn ${currentTab === "history" ? "active" : ""}`}
              onClick={() => handleTabChange("history")}
            >
              <span className="material-symbols-outlined">history_edu</span>
              Lịch sử phát voucher cho khách
            </button>
          </div>

          {currentTab === "vouchers" ? (
            <>
          {/* Header */}
          <div className="page-header-alt">
            <div className="header-text">
              <span className="admin-page-eyebrow">
                PITCH &amp; PULSE OPERATIONS <span>›</span> ƯU ĐÃI &amp; KHUYẾN MÃI
              </span>
              <h2>Hệ thống Voucher &amp; Khuyến mãi</h2>
              <p>
                Quản lý các mã giảm giá, voucher tri ân tự động tặng khi khách hoàn thành đặt sân. Cập nhật biến động theo thời gian thực.
              </p>
            </div>
            <button className="btn-primary-gradient" onClick={handleOpenCreate}>
              <span className="material-symbols-outlined">add</span>
              Thêm voucher mới
            </button>
          </div>

        {/* Stats Cards Grid */}
        <div className="vouchers-stats-grid">
          <div className="v-stat-card">
            <div className="v-stat-icon-wrap green">
              <span className="material-symbols-outlined">confirmation_number</span>
            </div>
            <div className="v-stat-info">
              <small>Tổng số Voucher</small>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="v-stat-card">
            <div className="v-stat-icon-wrap blue">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div className="v-stat-info">
              <small>Đang kích hoạt</small>
              <strong>{stats.active}</strong>
            </div>
          </div>

          <div className="v-stat-card">
            <div className="v-stat-icon-wrap purple">
              <span className="material-symbols-outlined">redeem</span>
            </div>
            <div className="v-stat-info">
              <small>Quà hoàn thành sân</small>
              <strong>{stats.system_rewards}</strong>
            </div>
          </div>

          <div className="v-stat-card">
            <div className="v-stat-icon-wrap amber">
              <span className="material-symbols-outlined">shopping_cart_checkout</span>
            </div>
            <div className="v-stat-info">
              <small>Lượt đã áp dụng</small>
              <strong>{stats.total_used}</strong>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="vouchers-filter-bar">
          <div className="v-search-box">
            <span className="material-symbols-outlined" style={{ color: "#94a3b8", fontSize: "1.2rem" }}>
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo mã, tên hoặc mô tả voucher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="v-filter-tabs">
            <button
              className={`v-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              Tất cả ({vouchers.length})
            </button>
            <button
              className={`v-tab-btn ${activeTab === "active" ? "active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              Đang hoạt động ({vouchers.filter((v) => v.is_active).length})
            </button>
            <button
              className={`v-tab-btn ${activeTab === "inactive" ? "active" : ""}`}
              onClick={() => setActiveTab("inactive")}
            >
              Tạm ngưng ({vouchers.filter((v) => !v.is_active).length})
            </button>
            <button
              className={`v-tab-btn ${activeTab === "reward" ? "active" : ""}`}
              onClick={() => setActiveTab("reward")}
            >
              Quà hoàn thành sân ({vouchers.filter((v) => v.is_system_reward).length})
            </button>
          </div>
        </div>

        {/* Vouchers Table */}
        <div className="vouchers-table-card">
          <div className="v-table-wrapper">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Mã Voucher & Tiêu đề</th>
                  <th>Mức giảm giá</th>
                  <th>Điều kiện áp dụng</th>
                  <th>Hạn dùng</th>
                  <th>Phân loại</th>
                  <th>Lượt sử dụng</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="v-empty-row">
                      Đang tải danh sách voucher...
                    </td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="v-empty-row">
                      Không tìm thấy voucher nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredVouchers.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="v-code-badge">
                          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                            sell
                          </span>
                          {v.code}
                        </div>
                        <div className="v-title-text">{v.title}</div>
                        {v.description && <div className="v-desc-text">{v.description}</div>}
                      </td>

                      <td>
                        <div className="v-discount-value">
                          {v.discount_type === "percent"
                            ? `Giảm ${v.discount_value}%`
                            : `Giảm ${Number(v.discount_value).toLocaleString("vi-VN")}đ`}
                        </div>
                        {v.discount_type === "percent" && v.max_discount && (
                          <div className="v-discount-sub">
                            Tối đa {Number(v.max_discount).toLocaleString("vi-VN")}đ
                          </div>
                        )}
                      </td>

                      <td>
                        <div>
                          Đơn từ:{" "}
                          <strong>
                            {Number(v.min_booking_price || 0).toLocaleString("vi-VN")}đ
                          </strong>
                        </div>
                      </td>

                      <td>
                        <span>{v.expiry_days} ngày</span>
                        <div className="v-desc-text">kể từ khi nhận</div>
                      </td>

                      <td>
                        {v.is_system_reward ? (
                          <span className="v-reward-tag">
                            <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>
                              redeem
                            </span>
                            Quà tri ân
                          </span>
                        ) : (
                          <span className="v-public-tag">
                            <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>
                              public
                            </span>
                            Công khai
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <strong style={{ fontSize: "0.95rem", color: (v.total_used || 0) > 0 ? "#16a34a" : "#0f172a" }}>
                            {v.total_used || 0}
                          </strong>
                          <span style={{ color: "#64748b" }}>
                            / {v.usage_limit ? v.usage_limit : (v.is_system_reward ? (v.total_issued || "∞") : "Không giới hạn")}
                          </span>
                        </div>
                        <div className="v-desc-text">
                          {v.usage_limit ? (
                            (v.usage_limit - (v.total_used || 0)) <= 0 ? (
                              <span style={{ color: "#ef4444", fontWeight: 700 }}>Đã hết lượt</span>
                            ) : (
                              <span style={{ color: "#166534" }}>Còn {v.usage_limit - (v.total_used || 0)} lượt</span>
                            )
                          ) : (
                            <span>{v.is_system_reward ? "Đã cấp cho khách" : "Không giới hạn"}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div
                          className={`v-switch-control ${v.is_active ? "active" : "inactive"}`}
                          onClick={() => handleToggleStatus(v)}
                          role="button"
                          tabIndex={0}
                          title={v.is_active ? "Nhấn để chuyển sang Tạm ngưng" : "Nhấn để chuyển sang Hoạt động"}
                        >
                          <div className="v-switch-track">
                            <div className="v-switch-thumb" />
                          </div>
                          <span className="v-switch-label">
                            {v.is_active ? "Hoạt động" : "Tạm ngưng"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="v-actions-group">
                          <button
                            className="v-action-btn edit"
                            onClick={() => handleOpenEdit(v)}
                            title="Chỉnh sửa voucher"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                              edit
                            </span>
                          </button>
                          <button
                            className="v-action-btn delete"
                            onClick={() => setDeletingVoucher(v)}
                            title="Xóa voucher"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
            </>
          ) : (
            <>
              {/* ═══ TAB LỊCH SỬ PHÁT VOUCHER CHO KHÁCH ═══ */}
              <div className="page-header-alt">
                <div className="header-text">
                  <span className="admin-page-eyebrow">
                    PITCH &amp; PULSE OPERATIONS <span>›</span> LỊCH SỬ PHÁT VOUCHER
                  </span>
                  <h2>Lịch sử Phát Voucher cho Khách hàng</h2>
                  <p>
                    Theo dõi tất cả các mã voucher cá nhân (FB-XXXXXX) được hệ thống tự động sinh và tặng khách hàng sau khi hoàn tất đơn đặt sân hoặc qua các chương trình tri ân.
                  </p>
                </div>
                <button
                  className="btn-primary-gradient"
                  style={{ background: "#ffffff", color: "#0f172a", border: "1px solid #cbd5e1", boxShadow: "none" }}
                  onClick={fetchIssuedVouchers}
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Làm mới dữ liệu
                </button>
              </div>

              {/* Stats Cards Grid for Issued Vouchers */}
              <div className="vouchers-stats-grid">
                <div className="v-stat-card">
                  <div className="v-stat-icon-wrap green">
                    <span className="material-symbols-outlined">confirmation_number</span>
                  </div>
                  <div className="v-stat-info">
                    <small>Tổng mã đã phát</small>
                    <strong>{issuedStats.total}</strong>
                  </div>
                </div>

                <div className="v-stat-card">
                  <div className="v-stat-icon-wrap blue">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <div className="v-stat-info">
                    <small>Khả dụng (Chưa dùng)</small>
                    <strong>{issuedStats.active}</strong>
                  </div>
                </div>

                <div className="v-stat-card">
                  <div className="v-stat-icon-wrap amber">
                    <span className="material-symbols-outlined">shopping_cart_checkout</span>
                  </div>
                  <div className="v-stat-info">
                    <small>Đã sử dụng</small>
                    <strong>{issuedStats.used}</strong>
                  </div>
                </div>

                <div className="v-stat-card">
                  <div className="v-stat-icon-wrap purple">
                    <span className="material-symbols-outlined">timer_off</span>
                  </div>
                  <div className="v-stat-info">
                    <small>Đã hết hạn</small>
                    <strong>{issuedStats.expired}</strong>
                  </div>
                </div>
              </div>

              {/* Filter & Search Bar */}
              <div className="vouchers-filter-bar">
                <div className="v-search-box">
                  <span className="material-symbols-outlined" style={{ color: "#94a3b8", fontSize: "1.2rem" }}>
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm theo mã FB-..., tên khách, SĐT, đơn đặt..."
                    value={issuedSearch}
                    onChange={(e) => setIssuedSearch(e.target.value)}
                  />
                </div>

                <div className="v-filter-tabs">
                  <button
                    className={`v-tab-btn ${issuedStatusFilter === "all" ? "active" : ""}`}
                    onClick={() => setIssuedStatusFilter("all")}
                  >
                    Tất cả ({issuedStats.total})
                  </button>
                  <button
                    className={`v-tab-btn ${issuedStatusFilter === "active" ? "active" : ""}`}
                    onClick={() => setIssuedStatusFilter("active")}
                  >
                    Khả dụng ({issuedStats.active})
                  </button>
                  <button
                    className={`v-tab-btn ${issuedStatusFilter === "used" ? "active" : ""}`}
                    onClick={() => setIssuedStatusFilter("used")}
                  >
                    Đã sử dụng ({issuedStats.used})
                  </button>
                  <button
                    className={`v-tab-btn ${issuedStatusFilter === "expired" ? "active" : ""}`}
                    onClick={() => setIssuedStatusFilter("expired")}
                  >
                    Đã hết hạn ({issuedStats.expired})
                  </button>
                </div>
              </div>

              {/* Table Card */}
              <div className="vouchers-table-card">
                <div className="v-table-wrapper">
                  <table className="v-table">
                    <thead>
                      <tr>
                        <th>Mã Voucher Cá Nhân</th>
                        <th>Khách Hàng Nhận</th>
                        <th>Thuộc Chiến Dịch</th>
                        <th>Đơn Tặng (Nguồn)</th>
                        <th>Mức Giảm</th>
                        <th>Hạn Dùng &amp; Ngày Nhận</th>
                        <th>Trạng Thái</th>
                        <th>Đơn Áp Dụng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingIssued ? (
                        <tr>
                          <td colSpan="8" className="v-empty-row">
                            Đang tải danh sách lịch sử phát voucher...
                          </td>
                        </tr>
                      ) : filteredIssuedVouchers.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="v-empty-row">
                            Không tìm thấy mã voucher nào phù hợp với bộ lọc.
                          </td>
                        </tr>
                      ) : (
                        filteredIssuedVouchers.map((iv) => {
                          const customerInitial = (iv.customer_name || "K").trim().charAt(0).toUpperCase();
                          return (
                            <tr key={iv.id}>
                              <td>
                                <div className="v-code-badge" style={{ fontSize: "0.88rem", letterSpacing: "0.5px" }}>
                                  {iv.code}
                                </div>
                              </td>

                              <td>
                                <div className="v-customer-pill">
                                  <div className="v-customer-avatar">
                                    {customerInitial}
                                  </div>
                                  <div className="v-customer-info">
                                    <span className="v-customer-name">
                                      {iv.customer_name || "Khách hàng"}
                                    </span>
                                    <span className="v-customer-phone">
                                      {iv.customer_phone || iv.customer_email || "Chưa có SĐT"}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td>
                                <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.875rem" }}>
                                  {iv.voucher_title || iv.voucher_code}
                                </div>
                                <div className="v-desc-text">
                                  Mã gốc: <code style={{ color: "#16a34a", fontWeight: 700 }}>{iv.voucher_code}</code>
                                </div>
                              </td>

                              <td>
                                {iv.source_booking_code ? (
                                  <span className="v-source-booking-pill" title="Đơn hoàn thành đã tặng mã này">
                                    <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>
                                      receipt_long
                                    </span>
                                    {iv.source_booking_code}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Admin cấp / Khác</span>
                                )}
                              </td>

                              <td>
                                <div className="v-discount-value">
                                  {iv.discount_type === "percent"
                                    ? `Giảm ${iv.discount_value}%`
                                    : `-${Number(iv.discount_value).toLocaleString("vi-VN")}đ`}
                                </div>
                                {iv.discount_amount ? (
                                  <div className="v-discount-sub" style={{ color: "#16a34a", fontWeight: 600 }}>
                                    Đã giảm: {Number(iv.discount_amount).toLocaleString("vi-VN")}đ
                                  </div>
                                ) : null}
                              </td>

                              <td>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                                  {iv.valid_until ? new Date(iv.valid_until).toLocaleDateString("vi-VN") : "—"}
                                </div>
                                <div className="v-desc-text">
                                  Nhận: {iv.created_at ? new Date(iv.created_at).toLocaleDateString("vi-VN") : "—"}
                                </div>
                              </td>

                              <td>
                                {iv.is_used ? (
                                  <span className="v-status-badge inactive" style={{ background: "#e0f2fe", color: "#0369a1" }}>
                                    <span className="dot" style={{ background: "#0284c7" }} />
                                    Đã sử dụng
                                  </span>
                                ) : iv.is_expired ? (
                                  <span className="v-status-badge inactive" style={{ background: "#fef2f2", color: "#b91c1c" }}>
                                    <span className="dot" style={{ background: "#ef4444" }} />
                                    Hết hạn
                                  </span>
                                ) : (
                                  <span className="v-status-badge active">
                                    <span className="dot" />
                                    Khả dụng
                                  </span>
                                )}
                              </td>

                              <td>
                                {iv.used_booking_code ? (
                                  <div>
                                    <span className="v-used-booking-pill" title="Đơn đã áp dụng mã này">
                                      <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>
                                        shopping_bag
                                      </span>
                                      {iv.used_booking_code}
                                    </span>
                                    {iv.used_at && (
                                      <div className="v-desc-text" style={{ fontSize: "0.72rem" }}>
                                        {new Date(iv.used_at).toLocaleDateString("vi-VN")}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Chưa dùng</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

        {/* ═══ CREATE / EDIT MODAL ═══ */}
        {showModal && (
          <div className="v-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="v-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="v-modal-header">
                <h2>
                  <span className="material-symbols-outlined" style={{ color: "#16a34a" }}>
                    confirmation_number
                  </span>
                  {editingVoucher ? "Chỉnh sửa Voucher" : "Tạo Voucher Mới"}
                </h2>
                <button
                  type="button"
                  className="v-modal-close-btn"
                  onClick={() => setShowModal(false)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitForm} className="v-modal-form">
                <div className="v-form-grid">
                  <div className="v-form-group">
                    <label>Mã Voucher (Code) *</label>
                    <input
                      type="text"
                      placeholder="VD: THANKS10, FB-VIP"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      required
                    />
                  </div>

                  <div className="v-form-group">
                    <label>Tiêu đề hiển thị *</label>
                    <input
                      type="text"
                      placeholder="VD: Giảm 10% đặt sân bóng"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="v-form-group col-span-2">
                    <label>Mô tả chi tiết</label>
                    <textarea
                      rows="2"
                      placeholder="Mô tả ưu đãi áp dụng cho khách hàng..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <div className="v-form-group">
                    <label>Loại giảm giá</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_type: e.target.value })
                      }
                    >
                      <option value="percent">Giảm theo phần trăm (%)</option>
                      <option value="fixed">Giảm số tiền cố định (VNĐ)</option>
                    </select>
                  </div>

                  <div className="v-form-group">
                    <label>
                      {formData.discount_type === "percent"
                        ? "Phần trăm giảm (%) *"
                        : "Số tiền giảm (VNĐ) *"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({ ...formData, discount_value: e.target.value })
                      }
                      required
                    />
                  </div>

                  {formData.discount_type === "percent" && (
                    <div className="v-form-group">
                      <label>Giảm tối đa (VNĐ)</label>
                      <input
                        type="number"
                        placeholder="Để trống nếu không giới hạn"
                        value={formData.max_discount}
                        onChange={(e) =>
                          setFormData({ ...formData, max_discount: e.target.value })
                        }
                      />
                    </div>
                  )}

                  <div className="v-form-group">
                    <label>Giá trị đơn đặt tối thiểu (VNĐ)</label>
                    <input
                      type="number"
                      placeholder="VD: 100000"
                      value={formData.min_booking_price}
                      onChange={(e) =>
                        setFormData({ ...formData, min_booking_price: e.target.value })
                      }
                    />
                  </div>

                  <div className="v-form-group">
                    <label>Thời hạn sử dụng (Số ngày)</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.expiry_days}
                      onChange={(e) =>
                        setFormData({ ...formData, expiry_days: e.target.value })
                      }
                    />
                  </div>

                  <div className="v-form-group">
                    <label>Số lượng voucher (Lượt dùng tối đa)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="VD: 100 (để trống = Không giới hạn)"
                      value={formData.usage_limit}
                      onChange={(e) =>
                        setFormData({ ...formData, usage_limit: e.target.value })
                      }
                    />
                  </div>

                  <div className="v-form-group col-span-2" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                    <label className="v-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_system_reward}
                        onChange={(e) =>
                          setFormData({ ...formData, is_system_reward: e.target.checked })
                        }
                      />
                      <span>🎁 Dùng làm Voucher tự động tặng khi khách hoàn thành trận đấu</span>
                    </label>

                    <label className="v-checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.checked })
                        }
                      />
                      <span>Kích hoạt voucher (cho phép sử dụng ngay)</span>
                    </label>
                  </div>
                </div>

                <div className="v-modal-footer" style={{ marginTop: 20 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={submitting}
                  >
                    Hủy bỏ
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting
                      ? "Đang lưu..."
                      : editingVoucher
                      ? "Cập nhật Voucher"
                      : "Tạo Voucher"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
        {deletingVoucher && (
          <div className="v-modal-overlay" onClick={() => setDeletingVoucher(null)}>
            <div
              className="v-modal-card"
              style={{ maxWidth: 420 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="v-modal-header">
                <h2>
                  <span className="material-symbols-outlined" style={{ color: "#ef4444" }}>
                    warning
                  </span>
                  Xác nhận xóa Voucher
                </h2>
                <button
                  type="button"
                  className="v-modal-close-btn"
                  onClick={() => setDeletingVoucher(null)}
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div style={{ padding: "20px 24px" }}>
                <p style={{ margin: "0 0 10px 0", color: "#334155" }}>
                  Bạn có chắc chắn muốn xóa voucher{" "}
                  <strong style={{ color: "#0f172a" }}>{deletingVoucher.code}</strong> (
                  {deletingVoucher.title})?
                </p>
                <small style={{ color: "#64748b" }}>
                  * Lưu ý: Nếu voucher này đã có khách hàng sử dụng trong các đơn đặt sân trước đó, hệ thống sẽ tự động chuyển voucher sang trạng thái "Ngưng hoạt động" để đảm bảo toàn vẹn dữ liệu đơn hàng.
                </small>
              </div>

              <div className="v-modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setDeletingVoucher(null)}
                >
                  Hủy
                </button>
                <button type="button" className="btn-danger" onClick={handleDeleteVoucher}>
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  </div>
);
}
