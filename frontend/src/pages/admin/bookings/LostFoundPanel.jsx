import React, { useState } from "react";
import "./LostFoundPanel.css";

/* ── Hàm định dạng ngày đặt / ngày đá dạng DD/MM/YYYY ── */
export const formatLostItemDate = (dateVal) => {
  if (!dateVal) {
    const today = new Date();
    const d = String(today.getDate()).padStart(2, "0");
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const y = today.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    return str;
  }
  return str;
};

/* ── Modal Chỉnh sửa thông tin & Trạng thái đồ thất lạc ── */
export function EditLostItemModal({ item, onClose, onSave }) {
  const [formData, setFormData] = useState({
    itemType: item.itemType || "",
    description: item.description || "",
    fieldName: item.fieldName || "",
    location: item.location || "",
    guestInfo: item.guestInfo || "",
    customerPhone: item.customerPhone || "",
    bookingDate: item.bookingDate || item.date || new Date().toLocaleDateString("en-CA"),
    status: item.status || "pending",
    returnNote: item.returnNote || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.itemType.trim()) return;
    onSave({
      ...item,
      ...formData,
      returnedAt:
        formData.status === "returned" && !item.returnedAt
          ? new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay"
          : item.returnedAt,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "1rem",
          width: "100%",
          maxWidth: "520px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #f1f5f9",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "#fef3c7",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.3rem" }}>edit_note</span>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                Chỉnh sửa thông tin đồ khách quên
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                Cập nhật trạng thái xử lý và thông tin bàn giao đồ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Trạng thái xử lý */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.4rem" }}>
              Trạng thái đồ thất lạc <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: "100%",
                padding: "0.65rem 0.8rem",
                borderRadius: "0.5rem",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.875rem",
                fontWeight: 700,
                color: formData.status === "returned" ? "#15803d" : formData.status === "contacted" ? "#0369a1" : "#b45309",
                background: formData.status === "returned" ? "#f0fdf4" : formData.status === "contacted" ? "#f0f9ff" : "#fffbeb",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="pending">⏳ Đang giữ đồ (Chờ khách đến nhận)</option>
              <option value="returned">✅ Đã bàn giao lại cho khách</option>
              <option value="contacted">📞 Đã liên hệ - Khách hẹn đến lấy</option>
            </select>
          </div>

          {/* Tên đồ vật & Ngày đặt */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Loại / Tên đồ vật <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                value={formData.itemType}
                onChange={(e) => setFormData({ ...formData, itemType: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Ngày đặt sân / Ngày đá
              </label>
              <input
                type="date"
                value={formData.bookingDate}
                onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Vị trí tìm thấy & Sân bóng */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Sân bóng
              </label>
              <input
                type="text"
                value={formData.fieldName}
                onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Vị trí tìm thấy
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Khách ca / Người liên hệ & SĐT liên hệ */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Thông tin ca đá / Khách
              </label>
              <input
                type="text"
                value={formData.guestInfo}
                onChange={(e) => setFormData({ ...formData, guestInfo: e.target.value })}
                placeholder="VD: Khách: Bac (06:00 - 07:00)"
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
                Số điện thoại liên hệ
              </label>
              <input
                type="text"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                placeholder="09xx xxx xxx"
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Mô tả chi tiết đồ vật */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
              Mô tả chi tiết đồ vật
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                outline: "none",
                resize: "vertical",
              }}
            />
          </div>

          {/* Ghi chú bàn giao / Người nhận lại */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.3rem" }}>
              Ghi chú bàn giao / Người nhận lại đồ
            </label>
            <input
              type="text"
              value={formData.returnNote}
              onChange={(e) => setFormData({ ...formData, returnNote: e.target.value })}
              placeholder="VD: Đã bàn giao lại cho khách lúc 18h30"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          {/* Modal Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "0.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              style={{
                padding: "0.55rem 1.25rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#059669",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>save</span>
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Panel Quản lý Đồ khách quên (Lost & Found) ── */
export function LostFoundBookingPanel({
  lostItems = [],
  onUpdateItem,
  onDeleteItem,
  onAddNewItem,
  readOnly = false,
  title,
  subtitle,
}) {
  const [filterStatus, setFilterStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  const filtered = lostItems.filter((item) => {
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "pending" && (item.status === "pending" || !item.status)) ||
      (filterStatus === "returned" && item.status === "returned") ||
      (filterStatus === "contacted" && item.status === "contacted");
    const matchQuery =
      !query.trim() ||
      String(item.itemType || "").toLowerCase().includes(query.toLowerCase()) ||
      String(item.description || "").toLowerCase().includes(query.toLowerCase()) ||
      String(item.fieldName || "").toLowerCase().includes(query.toLowerCase()) ||
      String(item.guestInfo || "").toLowerCase().includes(query.toLowerCase()) ||
      String(item.customerPhone || "").toLowerCase().includes(query.toLowerCase()) ||
      String(item.location || "").toLowerCase().includes(query.toLowerCase()) ||
      String(item.bookingDate || item.date || "").toLowerCase().includes(query.toLowerCase());
    return matchStatus && matchQuery;
  });

  const pendingCount = lostItems.filter((i) => i.status === "pending" || !i.status).length;
  const returnedCount = lostItems.filter((i) => i.status === "returned").length;

  return (
    <div
      className="bookings-card"
      style={{
        marginTop: "1rem",
        padding: "1.5rem",
        borderRadius: "1rem",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
      }}
    >
      {/* Header thanh lọc & tìm kiếm */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.25rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.6rem" }}>luggage</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              {title || "Danh sách đồ khách để quên trên sân bóng (Lost & Found)"}
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              {subtitle || "Ghi nhận từ nhân viên dọn dẹp sau ca đá. Lễ tân liên hệ người đặt sân để bàn giao lại đồ thất lạc."}
            </p>
          </div>
        </div>

        {/* Thanh tìm kiếm & Bộ nút lọc & Nút ghi nhận mới nếu có */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end", minWidth: "320px" }}>
          {onAddNewItem && (
            <button
              type="button"
              className="btn-new-booking"
              onClick={onAddNewItem}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                height: "38px",
                padding: "0 14px",
                fontSize: "0.82rem",
                fontWeight: 600,
                borderRadius: "8px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>add</span>
              Ghi nhận đồ mới
            </button>
          )}

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "0 10px",
              height: "38px",
              minWidth: "240px",
              flex: "1 1 240px",
              maxWidth: "360px",
            }}
          >
            <span className="material-symbols-outlined" style={{ color: "#94a3b8", fontSize: "1.15rem", marginRight: "6px" }}>search</span>
            <input
              type="text"
              placeholder="Tìm theo tên đồ, vị trí, tên khách, ngày, sân..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "0.85rem", width: "100%" }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: "2px", display: "flex" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>cancel</span>
              </button>
            )}
          </div>

          <div style={{ display: "flex", background: "#f1f5f9", padding: "3px", borderRadius: "8px", gap: "2px" }}>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              style={{
                border: "none",
                background: filterStatus === "all" ? "#ffffff" : "transparent",
                color: filterStatus === "all" ? "#0f172a" : "#64748b",
                fontWeight: filterStatus === "all" ? 700 : 500,
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow: filterStatus === "all" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Tất cả</span>
              <span
                style={{
                  background: filterStatus === "all" ? "#0f172a" : "#e2e8f0",
                  color: filterStatus === "all" ? "#ffffff" : "#64748b",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {lostItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("pending")}
              style={{
                border: "none",
                background: filterStatus === "pending" ? "#ffffff" : "transparent",
                color: filterStatus === "pending" ? "#d97706" : "#64748b",
                fontWeight: filterStatus === "pending" ? 700 : 500,
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow: filterStatus === "pending" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Chờ trả khách</span>
              <span
                style={{
                  background: filterStatus === "pending" ? "#d97706" : "#fef3c7",
                  color: filterStatus === "pending" ? "#ffffff" : "#92400e",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterStatus("returned")}
              style={{
                border: "none",
                background: filterStatus === "returned" ? "#ffffff" : "transparent",
                color: filterStatus === "returned" ? "#059669" : "#64748b",
                fontWeight: filterStatus === "returned" ? 700 : 500,
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow: filterStatus === "returned" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>Đã trả lại</span>
              <span
                style={{
                  background: filterStatus === "returned" ? "#059669" : "#d1fae5",
                  color: filterStatus === "returned" ? "#ffffff" : "#065f46",
                  padding: "1px 6px",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {returnedCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Bảng danh sách đồ bỏ quên */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#cbd5e1", marginBottom: "0.5rem", display: "block" }}>
            luggage
          </span>
          <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
            {query ? "Không tìm thấy đồ bỏ quên nào phù hợp từ khóa" : "Chưa có đồ đạc nào được báo bỏ quên trong danh mục này"}
          </p>
        </div>
      ) : (
        <div style={{ width: "100%", overflowX: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <thead>
              <tr style={{ background: "#f8fafc", textAlign: "left", fontSize: "0.8rem", color: "#475569", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={{ padding: "12px 14px", width: readOnly ? "28%" : "25%" }}>Đồ vật &amp; Đặc điểm</th>
                <th style={{ padding: "12px 14px", width: readOnly ? "18%" : "16%" }}>Sân &amp; Vị trí</th>
                <th style={{ padding: "12px 14px", width: readOnly ? "23%" : "20%" }}>Ca đá &amp; Khách hàng</th>
                <th style={{ padding: "12px 14px", width: readOnly ? "16%" : "14%" }}>Thời gian nhặt</th>
                <th style={{ padding: "12px 6px", width: readOnly ? "15%" : "13%", textAlign: "center" }}>Trạng thái</th>
                {!readOnly && (
                  <th style={{ padding: "12px 12px 12px 0", width: "12%", textAlign: "right" }}>Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const isReturned = item.status === "returned";
                const isContacted = item.status === "contacted";

                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }} className="lost-item-row">
                    {/* Cột 1: Đồ vật & Đặc điểm + Ngày đặt */}
                    <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem", lineHeight: "1.3" }} title={item.itemType}>
                        {item.itemType}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "3px", lineHeight: "1.3" }} title={item.description}>
                        {item.description || "Không có mô tả chi tiết"}
                      </div>
                      {/* Thêm Ngày đặt bên dưới thông tin đồ vật/ đặc điểm */}
                      <div
                        style={{
                          fontSize: "0.74rem",
                          color: "#0369a1",
                          background: "#f0f9ff",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          border: "1px solid #e0f2fe",
                          marginTop: "5px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: 600,
                          width: "fit-content",
                        }}
                        title="Ngày đặt sân / Ngày đá"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "0.85rem", color: "#0284c7" }}>event</span>
                        <span>Ngày đặt: {formatLostItemDate(item.bookingDate || item.date)}</span>
                      </div>
                      {item.returnNote && (
                        <div style={{ fontSize: "0.74rem", color: "#059669", marginTop: "4px", display: "flex", alignItems: "center", gap: "3px" }} title={item.returnNote}>
                          <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>assignment_turned_in</span>
                          <span>{item.returnNote}</span>
                        </div>
                      )}
                    </td>

                    {/* Cột 2: Sân & Vị trí */}
                    <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                      <span style={{ fontWeight: 600, color: "#065f46", background: "#d1fae5", padding: "2px 8px", borderRadius: "4px", fontSize: "0.8rem", display: "inline-block" }}>
                        {item.fieldName}
                      </span>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "2px" }} title={item.location}>
                        <span className="material-symbols-outlined" style={{ fontSize: "0.85rem", color: "#ef4444" }}>pin_drop</span>
                        <span>{item.location || "Tại sân"}</span>
                      </div>
                    </td>

                    {/* Cột 3: Ca đá & Khách hàng + SĐT liên hệ */}
                    <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "4px" }} title={item.guestInfo}>
                        <span className="material-symbols-outlined" style={{ fontSize: "0.95rem", color: "#059669" }}>person</span>
                        <span>{item.guestInfo || "Chưa rõ người bỏ quên"}</span>
                      </div>

                      {/* Số điện thoại liên hệ khách */}
                      <div style={{ marginTop: "5px" }}>
                        {item.customerPhone ? (
                          <a
                            href={`tel:${String(item.customerPhone).replace(/\s+/g, "")}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: "#0284c7",
                              fontWeight: 700,
                              fontSize: "0.78rem",
                              textDecoration: "none",
                              background: "#f0f9ff",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              border: "1px solid #bae6fd",
                              width: "fit-content",
                            }}
                            title="Bấm để gọi điện cho khách"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>call</span>
                            <span>{item.customerPhone}</span>
                          </a>
                        ) : !readOnly ? (
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              color: "#94a3b8",
                              fontSize: "0.74rem",
                              cursor: "pointer",
                              background: "#f8fafc",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px dashed #cbd5e1",
                            }}
                            title="Bấm để bổ sung số điện thoại khách"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>add_call</span>
                            <span>Thêm SĐT</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.74rem", color: "#94a3b8", fontStyle: "italic" }}>
                            Chưa có SĐT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 4: Thời gian nhặt */}
                    <td style={{ padding: "12px 14px", fontSize: "0.8rem", color: "#475569", verticalAlign: "middle" }}>
                      <div style={{ fontWeight: 600 }}>{item.time || "Hôm nay"}</div>
                      <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "2px" }}>bởi {item.reportedBy || "Nhân viên dọn dẹp"}</div>
                    </td>

                    {/* Cột 5: Trạng thái */}
                    <td style={{ padding: "12px 8px", textAlign: "center", verticalAlign: "middle" }}>
                      {isReturned ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: "#dcfce7",
                            color: "#166534",
                            border: "1px solid #bbf7d0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>check_circle</span>
                          Đã trả
                        </span>
                      ) : isContacted ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: "#e0f2fe",
                            color: "#0369a1",
                            border: "1px solid #bae6fd",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>call</span>
                          Hẹn lấy
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: "#fef3c7",
                            color: "#92400e",
                            border: "1px solid #fde68a",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>schedule</span>
                          Đang giữ
                        </span>
                      )}
                    </td>

                    {/* Cột 6: Thao tác (chỉ hiển thị khi KHÔNG PHẢI readOnly, đã bỏ nút Trả khách, chỉ giữ Chỉnh sửa và Xóa) */}
                    {!readOnly && (
                      <td style={{ padding: "10px 12px 10px 0", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          {/* Nút chỉnh sửa trạng thái & thông tin đồ (Icon Bút) */}
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="lost-action-btn lost-edit-btn"
                            title="Chỉnh sửa trạng thái & thông tin đồ"
                            style={{ padding: "5px 7px", width: "32px", height: "30px", justifyContent: "center" }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "1.05rem" }}>edit</span>
                          </button>

                          {/* Nút xóa */}
                          <button
                            type="button"
                            onClick={() => onDeleteItem && onDeleteItem(item.id)}
                            className="lost-action-btn lost-delete-btn"
                            title="Xóa bản ghi này"
                            style={{ padding: "5px 7px", width: "30px", height: "30px", justifyContent: "center" }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "1.05rem" }}>delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Chỉnh sửa đồ thất lạc (chỉ có khi !readOnly) */}
      {!readOnly && editingItem && (
        <EditLostItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            onUpdateItem && onUpdateItem(updated);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
}

export default LostFoundBookingPanel;

