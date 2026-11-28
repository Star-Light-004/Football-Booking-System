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
import { broadcastSyncEvent, onSyncEvent } from "../../../utils/realtimeSync";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import "./vouchers.css";

// Clean raw numbers from backend (e.g. "100000.00" -> 100000)
const cleanNumber = (val) => {
  if (val === null || val === undefined || val === "") return "";
  const n = Math.round(Number(val));
  return isNaN(n) ? "" : n;
};

// Format integer string with dots (e.g. 100000 -> "100.000")
const formatVNDInput = (val) => {
  if (val === "" || val === null || val === undefined) return "";
  const numStr = String(val).replace(/\D/g, "");
  if (!numStr) return "";
  return Number(numStr).toLocaleString("vi-VN");
};

// Parse input string with dots back to integer or empty string
const parseVNDInput = (str) => {
  if (str === "" || str === null || str === undefined) return "";
  const numStr = String(str).replace(/\D/g, "");
  return numStr === "" ? "" : Number(numStr);
};

// Render voucher title, splitting promotional discount info (e.g. "Giảm 10%...") onto its own separate line
const renderVoucherTitle = (title) => {
  if (!title) return null;
  const parts = String(title).split(/\s*[-–—]\s*/);
  if (parts.length > 1) {
    const mainTitle = parts[0];
    const discountPart = parts.slice(1).join(" - ");
    return (
      <div className="v-title-split-block">
        <span className="v-title-main">{mainTitle}</span>
        <span className="v-title-discount-badge">
          <span className="material-symbols-outlined" style={{ fontSize: "0.78rem" }}>
            percent
          </span>
          {discountPart}
        </span>
      </div>
    );
  }
  return <span className="v-title-main">{title}</span>;
};

const INITIAL_FORM = {
  code: "",
  title: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  max_discount: 50000,
  min_booking_price: 100000,
  applicable_to: "all",
  expiry_days: 30,
  expiry_date: "",
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
        <button className="icon-btn" title="Thông báo" type="button">
          <span className="material-symbols-outlined">notifications</span>
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

  const fetchVouchers = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await adminGetVouchers();
      if (res.data) {
        setVouchers(res.data.vouchers || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách voucher:", err);
      if (!isSilent) toast.error("Không thể tải danh sách voucher từ hệ thống!");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers(false);

    // Smart polling định kỳ mỗi 3.5s để cập nhật voucher tự động
    const timer = setInterval(() => {
      fetchVouchers(true);
    }, 3500);

    // Lắng nghe sự kiện realtime khi App hoặc tab khác thay đổi voucher
    const unsub = onSyncEvent((event) => {
      if (event?.type?.startsWith("voucher_")) {
        fetchVouchers(true);
      }
    });

    return () => {
      clearInterval(timer);
      unsub();
    };
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

  const handleExportCSV = () => {
    if (currentTab === "vouchers") {
      if (!filteredVouchers || filteredVouchers.length === 0) {
        toast.warning("Không có dữ liệu voucher để xuất");
        return;
      }

      const headers = [
        "Mã voucher",
        "Tiêu đề",
        "Mô tả",
        "Loại giảm giá",
        "Giá trị giảm",
        "Đơn tối thiểu (VNĐ)",
        "Giảm tối đa (VNĐ)",
        "Ngày bắt đầu",
        "Ngày hết hạn",
        "Trạng thái",
        "Lượt dùng tối đa",
        "Đã dùng",
        "Quà tặng tự động",
      ];

      const rows = filteredVouchers.map((v) => [
        `"${v.code || ""}"`,
        `"${(v.title || "").replace(/"/g, '""')}"`,
        `"${(v.description || "").replace(/"/g, '""')}"`,
        v.discount_type === "percent" ? "Phần trăm (%)" : "Tiền mặt (VNĐ)",
        v.discount_type === "percent" ? `${v.discount_value}%` : v.discount_value,
        v.min_booking_value || 0,
        v.max_discount || 0,
        v.start_date ? new Date(v.start_date).toLocaleDateString("vi-VN") : "",
        v.end_date ? new Date(v.end_date).toLocaleDateString("vi-VN") : "",
        v.is_active ? "Đang chạy" : "Tạm ngưng",
        v.usage_limit || "Không giới hạn",
        v.used_count || 0,
        v.is_system_reward ? "Có" : "Không",
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Danh_Sach_Voucher_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Xuất danh sách voucher thành công!");
    } else {
      if (!filteredIssuedVouchers || filteredIssuedVouchers.length === 0) {
        toast.warning("Không có lịch sử phát voucher để xuất");
        return;
      }

      const headers = [
        "Mã phát voucher",
        "Mã voucher chính sách",
        "Tiêu đề voucher",
        "Khách hàng nhận",
        "Số điện thoại",
        "Email",
        "Đơn nguồn tích điểm",
        "Trạng thái sử dụng",
        "Mã đơn đã dùng",
        "Ngày phát hành",
        "Ngày hết hạn",
      ];

      const rows = filteredIssuedVouchers.map((iv) => [
        `"${iv.code || ""}"`,
        `"${iv.voucher_code || ""}"`,
        `"${(iv.voucher_title || "").replace(/"/g, '""')}"`,
        `"${(iv.customer_name || "").replace(/"/g, '""')}"`,
        `"${iv.customer_phone || ""}"`,
        `"${iv.customer_email || ""}"`,
        `"${iv.source_booking_code || ""}"`,
        iv.is_used ? "Đã dùng" : iv.is_expired ? "Hết hạn" : "Còn hiệu lực",
        `"${iv.used_booking_code || ""}"`,
        iv.created_at ? new Date(iv.created_at).toLocaleDateString("vi-VN") : "",
        iv.expires_at ? new Date(iv.expires_at).toLocaleDateString("vi-VN") : "",
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Lich_Su_Phat_Voucher_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Xuất lịch sử phát voucher thành công!");
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingVoucher(null);
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);
    setFormData({
      ...INITIAL_FORM,
      expiry_days: 30,
      expiry_date: targetDate.toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (v) => {
    setEditingVoucher(v);
    const days = Number(v.expiry_days) || 30;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const expiryDateStr = targetDate.toISOString().slice(0, 10);

    setFormData({
      code: v.code || "",
      title: v.title || "",
      description: v.description || "",
      discount_type: v.discount_type || "percent",
      discount_value:
        v.discount_type === "percent"
          ? (Number(v.discount_value) || 0)
          : cleanNumber(v.discount_value),
      max_discount: cleanNumber(v.max_discount),
      min_booking_price: cleanNumber(v.min_booking_price),
      applicable_to: v.applicable_to || "all",
      expiry_days: days,
      expiry_date: expiryDateStr,
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
      code: formData.code.trim().toUpperCase(),
      title: formData.title.trim(),
      description: formData.description?.trim() || "",
      discount_type: formData.discount_type,
      discount_value: Number(formData.discount_value) || 0,
      max_discount:
        formData.discount_type === "percent" && formData.max_discount !== "" && formData.max_discount !== null
          ? Number(formData.max_discount)
          : null,
      min_booking_price:
        formData.min_booking_price !== "" && formData.min_booking_price !== null
          ? Number(formData.min_booking_price)
          : 0,
      applicable_to: formData.applicable_to || "all",
      expiry_days: Number(formData.expiry_days) || 30,
      usage_limit:
        formData.usage_limit !== "" && formData.usage_limit !== null
          ? parseInt(formData.usage_limit, 10)
          : null,
      is_system_reward: Boolean(formData.is_system_reward),
      is_active: Boolean(formData.is_active),
    };

    try {
      if (editingVoucher) {
        await adminUpdateVoucher(editingVoucher.id, payload);
        toast.success("Cập nhật thông tin voucher thành công!");
      } else {
        await adminCreateVoucher(payload);
        toast.success("Tạo voucher mới thành công!");
      }
      broadcastSyncEvent("voucher_updated");
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
      broadcastSyncEvent("voucher_updated");
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
      broadcastSyncEvent("voucher_updated");
      toast.success(res.data?.message || "Đã xóa voucher thành công!");
      setDeletingVoucher(null);
      fetchVouchers();
    } catch (err) {
      console.error("Lỗi xóa voucher:", err);
      toast.error(err.response?.data?.error || "Không thể xóa voucher!");
    }
  };

  return (
    <div className="vouchers-admin-page">
      <AdminSidebar />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <TopHeader
        onAdd={handleOpenCreate}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <main className="main-content vouchers-admin-main">
        <div className="content-inner">
          {/* Header */}
          <div className="page-header">
            <div>
              <span className="booking-admin-eyebrow">
                {currentTab === "vouchers" ? (
                  <>VẬN HÀNH CƠ SỞ <span>›</span> ƯU ĐÃI &amp; KHUYẾN MÃI</>
                ) : (
                  <>VẬN HÀNH CƠ SỞ <span>›</span> LỊCH SỬ PHÁT VOUCHER</>
                )}
              </span>
              <h2>
                {currentTab === "vouchers"
                  ? "Hệ thống Voucher & Khuyến mãi"
                  : "Lịch sử Phát Voucher cho Khách hàng"}
              </h2>
              <p>
                {currentTab === "vouchers"
                  ? "Quản lý các mã giảm giá, voucher tri ân tự động tặng khi khách hoàn thành đặt sân. Cập nhật biến động theo thời gian thực."
                  : "Theo dõi tất cả các mã voucher cá nhân (FB-XXXXXX) được hệ thống tự động sinh và tặng khách hàng sau khi hoàn tất đơn đặt sân hoặc qua các chương trình tri ân."}
              </p>
            </div>
            <div className="header-actions-group" style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
              <button
                type="button"
                className="btn-export"
                onClick={handleExportCSV}
                title="Xuất file CSV / Excel"
              >
                <span className="material-symbols-outlined">download</span>
                Xuất CSV
              </button>
              {currentTab === "vouchers" ? (
                <button className="btn-add-tour" onClick={handleOpenCreate}>
                  <span className="material-symbols-outlined">add</span>
                  Thêm voucher mới
                </button>
              ) : (
                <button
                  className="btn-export"
                  onClick={fetchIssuedVouchers}
                  title="Làm mới dữ liệu"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Làm mới dữ liệu
                </button>
              )}
            </div>
          </div>

          {/* Main Sub Tabs Switcher - Đặt xuống dưới dòng chữ giới thiệu trang */}
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
                  <th style={{ textAlign: "center", width: "80px" }}>Thao tác</th>
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
                        <div className="v-title-text">{renderVoucherTitle(v.title)}</div>
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
                        <div>
                          {v.applicable_to === "field_only" ? (
                            <span className="v-scope-tag field-only" title="Chỉ giảm tiền thuê sân bóng, không giảm dịch vụ">
                              <span className="material-symbols-outlined" style={{ fontSize: "0.82rem" }}>
                                sports_soccer
                              </span>
                              Chỉ giờ sân
                            </span>
                          ) : (
                            <span className="v-scope-tag all" title="Giảm cả tiền thuê sân và dịch vụ đi kèm">
                              <span className="material-symbols-outlined" style={{ fontSize: "0.82rem" }}>
                                all_inclusive
                              </span>
                              Sân + Dịch vụ
                            </span>
                          )}
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
                                {renderVoucherTitle(iv.voucher_title || iv.voucher_code)}
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
        </div>

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
                      onChange={(e) => {
                        const newType = e.target.value;
                        setFormData({
                          ...formData,
                          discount_type: newType,
                          discount_value: newType === "percent" ? 10 : 20000,
                        });
                      }}
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
                    {formData.discount_type === "percent" ? (
                      <div className="v-input-with-affix">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max="100"
                          placeholder="VD: 10, 20"
                          value={formData.discount_value}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discount_value: e.target.value === "" ? "" : Number(e.target.value),
                            })
                          }
                          required
                        />
                        <span className="v-input-affix">%</span>
                      </div>
                    ) : (
                      <div className="v-input-with-affix">
                        <input
                          type="text"
                          placeholder="VD: 20.000, 50.000"
                          value={formData.discount_value !== "" ? formatVNDInput(formData.discount_value) : ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              discount_value: parseVNDInput(e.target.value),
                            })
                          }
                          required
                        />
                        <span className="v-input-affix">VNĐ</span>
                      </div>
                    )}
                  </div>

                  {formData.discount_type === "percent" && (
                    <div className="v-form-group">
                      <label>Giảm tối đa (VNĐ)</label>
                      <div className="v-input-with-affix">
                        <input
                          type="text"
                          placeholder="Để trống nếu không giới hạn"
                          value={formData.max_discount !== "" ? formatVNDInput(formData.max_discount) : ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              max_discount: parseVNDInput(e.target.value),
                            })
                          }
                        />
                        <span className="v-input-affix">VNĐ</span>
                      </div>
                    </div>
                  )}

                  <div className="v-form-group">
                    <label>Giá trị đơn đặt tối thiểu (VNĐ)</label>
                    <div className="v-input-with-affix">
                      <input
                        type="text"
                        placeholder="VD: 100.000 (để 0 nếu không yêu cầu)"
                        value={formData.min_booking_price !== "" ? formatVNDInput(formData.min_booking_price) : ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_booking_price: parseVNDInput(e.target.value),
                          })
                        }
                      />
                      <span className="v-input-affix">VNĐ</span>
                    </div>
                  </div>

                  {/* ═══ THỜI HẠN HIỆU LỰC (ĐIỀN NGÀY HẾT HẠN HOẶC CHỌN SỐ NGÀY) ═══ */}
                  <div className="v-form-group col-span-2 v-expiry-sync-box">
                    <div className="v-expiry-header">
                      <span className="material-symbols-outlined" style={{ color: "#16a34a", fontSize: "1.15rem" }}>
                        event_upcoming
                      </span>
                      <strong>Thời hạn hiệu lực của Voucher</strong>
                    </div>

                    <div className="v-expiry-grid">
                      <div className="v-expiry-col">
                        <label>Số ngày có hiệu lực</label>
                        <div className="v-input-with-affix">
                          <input
                            type="number"
                            min="1"
                            placeholder="VD: 30"
                            value={formData.expiry_days}
                            onChange={(e) => {
                              const days = parseInt(e.target.value, 10);
                              if (isNaN(days) || days <= 0) {
                                setFormData({ ...formData, expiry_days: "", expiry_date: "" });
                              } else {
                                const target = new Date();
                                target.setDate(target.getDate() + days);
                                setFormData({
                                  ...formData,
                                  expiry_days: days,
                                  expiry_date: target.toISOString().slice(0, 10),
                                });
                              }
                            }}
                            required
                          />
                          <span className="v-input-affix">ngày</span>
                        </div>
                      </div>

                      <div className="v-expiry-divider">
                        <span>HOẶC</span>
                      </div>

                      <div className="v-expiry-col">
                        <label>Chọn ngày hết hạn cụ thể</label>
                        <input
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={formData.expiry_date || ""}
                          onChange={(e) => {
                            const selectedDateStr = e.target.value;
                            if (!selectedDateStr) {
                              setFormData({ ...formData, expiry_date: "" });
                              return;
                            }
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const selected = new Date(selectedDateStr);
                            selected.setHours(0, 0, 0, 0);
                            const diffTime = selected.getTime() - today.getTime();
                            const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
                            setFormData({
                              ...formData,
                              expiry_days: diffDays,
                              expiry_date: selectedDateStr,
                            });
                          }}
                        />
                      </div>
                    </div>

                    {formData.expiry_days > 0 && formData.expiry_date && (
                      <div className="v-expiry-preview">
                        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#16a34a" }}>
                          check_circle
                        </span>
                        <span>
                          Voucher sẽ có hiệu lực trong <strong>{formData.expiry_days} ngày</strong> (tương đương hết hạn vào ngày{" "}
                          <strong>
                            {new Date(formData.expiry_date).toLocaleDateString("vi-VN", {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </strong>
                          ).
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="v-form-group col-span-2">
                    <label>Số lượng voucher phát hành (Lượt dùng tối đa)</label>
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

                  {/* 🔹 Mục tick chọn phạm vi áp dụng */}
                  <div className="v-form-group col-span-2">
                    <label style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, color: "#1e293b" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", color: "#16a34a" }}>
                        tune
                      </span>
                      Phạm vi áp dụng giảm giá *
                    </label>
                    <div className="v-scope-radio-group">
                      <label className={`v-scope-card ${formData.applicable_to === "field_only" ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="applicable_to"
                          value="field_only"
                          checked={formData.applicable_to === "field_only"}
                          onChange={() => setFormData({ ...formData, applicable_to: "field_only" })}
                        />
                        <div className="v-scope-content">
                          <div className="v-scope-title">
                            <span className="material-symbols-outlined">sports_soccer</span>
                            <strong>Chỉ giảm giá giờ sân</strong>
                          </div>
                          <small>Chỉ áp dụng giảm trừ vào tiền thuê sân bóng, không trừ vào tiền các dịch vụ phụ trợ đi kèm.</small>
                        </div>
                      </label>

                      <label className={`v-scope-card ${formData.applicable_to === "all" ? "active" : ""}`}>
                        <input
                          type="radio"
                          name="applicable_to"
                          value="all"
                          checked={formData.applicable_to === "all"}
                          onChange={() => setFormData({ ...formData, applicable_to: "all" })}
                        />
                        <div className="v-scope-content">
                          <div className="v-scope-title">
                            <span className="material-symbols-outlined">all_inclusive</span>
                            <strong>Giảm cả giờ sân + dịch vụ đi kèm</strong>
                          </div>
                          <small>Áp dụng giảm trừ cho toàn bộ tổng chi phí đơn đặt (bao gồm tiền thuê sân và dịch vụ).</small>
                        </div>
                      </label>
                    </div>
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
  );
}
