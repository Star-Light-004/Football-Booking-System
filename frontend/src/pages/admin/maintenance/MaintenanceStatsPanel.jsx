import React from "react";

// Format ngày kiểu Việt Nam DD/MM/YYYY
const formatVN = (d) => {
  if (!d) return "";
  const p = String(d).slice(0, 10).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
};

const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString("vi-VN");
};

// Trích xuất ngày YYYY-MM-DD chuẩn xác từ mọi định dạng (ISO, DD/MM/YYYY, DD/MM/YYYY HH:mm, "Hôm nay", v.v.)
const parseDateToYMD = (item, fallbackTodayStr) => {
  if (!item) return fallbackTodayStr;
  const raw = item.date || item.created_at || item.createdAt || item.resolved_at || item.resolvedAt || "";
  if (!raw) return fallbackTodayStr;

  const str = String(raw).trim();

  // 1. Từ ngữ tương đối
  if (str.toLowerCase().includes("hôm nay") || str.toLowerCase().includes("vừa xong")) {
    return fallbackTodayStr;
  }
  if (str.toLowerCase().includes("hôm qua")) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return yesterday.toLocaleDateString("en-CA");
  }

  // 2. Định dạng ngày chuẩn ISO: "2026-11-09T18:02:49..." hoặc "2026-11-09"
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // 3. Định dạng Việt Nam: "09/11/2026, 17:48" hoặc "09/11/2026 17:48" hoặc "09/11/2026"
  const slashMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. Định dạng gạch ngang DD-MM-YYYY
  const dashMatch = str.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dashMatch) {
    const day = dashMatch[1].padStart(2, "0");
    const month = dashMatch[2].padStart(2, "0");
    const year = dashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 5. Thử new Date(str)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-CA");
  }

  return fallbackTodayStr;
};

// Định dạng ngày giờ thân thiện tiếng Việt cho card badge
const formatDisplayDate = (d) => {
  if (!d) return "Hôm nay";
  const str = String(d).trim();
  if (str.toLowerCase().includes("hôm nay") || str.toLowerCase().includes("vừa xong") || str.toLowerCase().includes("hôm qua")) {
    return str;
  }
  if (str.includes("T")) {
    try {
      const dt = new Date(str);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch {}
  }
  return str;
};

export function MaintenanceStatsPanel({
  fields = [],
  issues = [],
  statsRange = "day",
  setStatsRange,
  statsFieldFilter = "all",
  setStatsFieldFilter,
  selectedDate,
  setSelectedDate,
  pastDatesList = [],
  onExportCSV,
}) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Danh sách 7 ngày gần nhất (fallback nếu chưa truyền)
  const availablePastDates = useMemo(() => {
    if (pastDatesList && pastDatesList.length > 0) return pastDatesList;
    const list = [];
    const n = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(n);
      d.setDate(n.getDate() - i);
      const iso = d.toLocaleDateString("en-CA");
      const [year, month, day] = iso.split("-");
      let label = "";
      if (i === 0) label = `Hôm nay (${day}/${month}/${year})`;
      else if (i === 1) label = `Hôm qua (${day}/${month}/${year})`;
      else label = `${i} ngày trước (${day}/${month}/${year})`;
      list.push({ iso, label, displayDate: `${day}/${month}/${year}` });
    }
    return list;
  }, [pastDatesList]);

  // Lọc sự cố theo khoảng thời gian: Hôm nay / Tuần này / Tháng này / Tất cả / Ngày cụ thể
  const dateFilteredIssues = issues.filter((item) => {
    if (statsRange === "all") return true;

    const itemDateStr = parseDateToYMD(item, todayStr);

    if (statsRange === "custom") {
      return itemDateStr === (selectedDate || todayStr);
    }
    if (statsRange === "day") {
      return itemDateStr === todayStr;
    }
    if (statsRange === "week") {
      const itemDate = new Date(itemDateStr + "T00:00:00");
      const todayDate = new Date(todayStr + "T00:00:00");
      const diffDays = Math.round((todayDate.getTime() - itemDate.getTime()) / dayMs);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (statsRange === "month") {
      return itemDateStr.slice(0, 7) === todayStr.slice(0, 7);
    }
    return true;
  });

  // Lọc tiếp theo sân bóng nếu có chọn
  const filteredHistory = dateFilteredIssues.filter((item) => {
    if (statsFieldFilter === "all") return true;
    const pName = String(statsFieldFilter).toLowerCase().trim();
    const matchedField = fields.find(
      (f) => String(f.field_name || "").toLowerCase().trim() === pName || String(f.id) === String(statsFieldFilter)
    );
    const matchName = String(item.fieldName || item.field_name || "").toLowerCase().trim() === pName;
    const matchId = matchedField && item.field && String(item.field) === String(matchedField.id);
    return matchName || matchId;
  });

  // Tính toán KPI Tổng quan
  const totalIssues = filteredHistory.length;
  const doneIssues = filteredHistory.filter(
    (h) => h.status === "done" || h.status === "resolved"
  ).length;
  const pendingIssues = filteredHistory.filter(
    (h) => h.status !== "done" && h.status !== "resolved"
  ).length;
  const urgentIssues = filteredHistory.filter(
    (h) => (h.priority || "").toLowerCase().includes("khẩn cấp") && h.status !== "done" && h.status !== "resolved"
  ).length;

  const totalActualCost = filteredHistory.reduce(
    (sum, i) => sum + (parseFloat(i.cost) || 0),
    0
  );

  const completionRate = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 100;

  // Tiêu đề khoảng thời gian hiển thị
  const rangeTitle =
    statsRange === "day"
      ? `Hôm nay (${formatVN(todayStr)})`
      : statsRange === "custom"
      ? `Ngày ${formatVN(selectedDate || todayStr)}`
      : statsRange === "week"
      ? "7 ngày gần nhất (Tuần này)"
      : statsRange === "month"
      ? `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`
      : "Toàn bộ thời gian";

  // Thống kê theo từng sân bóng
  const pitchStats = fields.map((field) => {
    const pName = String(field.field_name || "").toLowerCase().trim();
    const pId = String(field.id || "");
    const fIssues = dateFilteredIssues.filter((h) => {
      const matchName = String(h.fieldName || h.field_name || "").toLowerCase().trim() === pName;
      const matchId = h.field && String(h.field) === pId;
      return matchName || matchId;
    });

    const fTotal = fIssues.length;
    const fDone = fIssues.filter((h) => h.status === "done" || h.status === "resolved").length;
    const fPending = fIssues.filter((h) => h.status !== "done" && h.status !== "resolved").length;
    const fCost = fIssues.reduce((sum, h) => sum + (parseFloat(h.cost) || 0), 0);
    const latest = fIssues[0] || null;
    const hasActiveIssue = fPending > 0;

    return {
      field,
      total: fTotal,
      done: fDone,
      pending: fPending,
      cost: fCost,
      latest,
      hasActiveIssue,
      percentage: totalIssues > 0 ? Math.round((fTotal / totalIssues) * 100) : 0,
    };
  });

  return (
    <div className="maintenance-stats-container">
      {/* ── THANH ĐIỀU KHIỂN & BỘ LỌC THỐNG KÊ (ĐỒNG BỘ VỚI TRANG VỆ SINH) ── */}
      <div className="stats-control-card">
        <div className="stats-control-left">
          <div className="stats-badge-tag" style={{ color: "#d97706", background: "#fffbeb", borderColor: "#fef3c7" }}>
            <span className="material-symbols-outlined">insights</span>
            <span>BÁO CÁO NĂNG SUẤT BẢO TRÌ &amp; THIẾT BỊ</span>
          </div>
          <h3 className="stats-control-title">Thống kê sự cố &amp; ca bảo trì</h3>
          <p className="stats-control-desc">
            Theo dõi khối lượng sự cố, tiến độ khắc phục và chi phí sửa chữa sân cỏ theo <strong>{rangeTitle}</strong>.
          </p>
        </div>

        <div className="stats-control-actions">
          {/* Bộ nút chọn khoảng thời gian */}
          <div className="stats-range-tabs">
            <button
              type="button"
              className={`stats-range-btn ${statsRange === "day" ? "active" : ""}`}
              onClick={() => {
                setStatsRange("day");
                if (setSelectedDate) setSelectedDate(todayStr);
              }}
            >
              <span className="material-symbols-outlined">today</span>
              Hôm nay
            </button>
            <button
              type="button"
              className={`stats-range-btn ${statsRange === "week" ? "active" : ""}`}
              onClick={() => setStatsRange("week")}
            >
              <span className="material-symbols-outlined">date_range</span>
              Tuần này
            </button>
            <button
              type="button"
              className={`stats-range-btn ${statsRange === "month" ? "active" : ""}`}
              onClick={() => setStatsRange("month")}
            >
              <span className="material-symbols-outlined">calendar_month</span>
              Tháng này
            </button>
            <button
              type="button"
              className={`stats-range-btn ${statsRange === "all" ? "active" : ""}`}
              onClick={() => setStatsRange("all")}
            >
              <span className="material-symbols-outlined">history</span>
              Tất cả
            </button>
          </div>

          {/* Dropdown chọn ngày trong 7 ngày gần nhất */}
          <div className="stats-field-select-wrapper stats-date-select-wrapper">
            <span className="material-symbols-outlined select-icon">calendar_today</span>
            <select
              className="stats-field-select"
              value={statsRange === "custom" || statsRange === "day" ? (selectedDate || todayStr) : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  if (setSelectedDate) setSelectedDate(val);
                  if (val === todayStr) {
                    setStatsRange("day");
                  } else {
                    setStatsRange("custom");
                  }
                }
              }}
              title="Chọn ngày trong 7 ngày gần nhất"
            >
              <option value="" disabled>-- Chọn ngày --</option>
              {availablePastDates.map((item) => (
                <option key={item.iso} value={item.iso}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown lọc theo từng sân */}
          <div className="stats-field-select-wrapper">
            <span className="material-symbols-outlined select-icon">filter_alt</span>
            <select
              className="stats-field-select"
              value={statsFieldFilter}
              onChange={(e) => setStatsFieldFilter(e.target.value)}
            >
              <option value="all">Tất cả {fields.length} sân bóng</option>
              {fields.map((f) => (
                <option key={f.id} value={f.field_name}>
                  {f.field_name} ({f.field_type || "Sân cỏ"})
                </option>
              ))}
            </select>
          </div>

          {/* Nút Xuất báo cáo CSV */}
          {onExportCSV && (
            <button
              type="button"
              className="btn-export-stats-csv"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.5rem 0.95rem",
                borderRadius: "0.6rem",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => onExportCSV(filteredHistory, statsRange)}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.05rem" }}>
                download
              </span>
              Xuất CSV
            </button>
          )}
        </div>
      </div>

      {/* ── 4 THẺ KPI CHỈ SỐ BẢO TRÌ (ĐỒNG BỘ 4 THẺ CỦA TRANG VỆ SINH) ── */}
      <div className="stats-kpi-grid">
        {/* KPI 1: Tổng số sự cố */}
        <div className="kpi-card kpi-purple">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">construction</span>
            </div>
            <span className="kpi-tag-chip">Năng suất tổng</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{totalIssues}</span>
            <span className="kpi-unit">sự cố</span>
          </div>
          <p className="kpi-label">Tổng ca sự cố tiếp nhận</p>
          <div className="kpi-subtext">
            <span>Áp dụng cho: <strong>{rangeTitle}</strong></span>
          </div>
        </div>

        {/* KPI 2: Đã sửa xong */}
        <div className="kpi-card kpi-green">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <span className="kpi-tag-chip">Đã khắc phục</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{doneIssues}</span>
            <span className="kpi-unit">ca</span>
          </div>
          <p className="kpi-label">Đã sửa xong hoàn tất</p>
          <div className="kpi-subtext">
            <span>Chiếm <strong>{completionRate}%</strong> tổng số sự cố</span>
          </div>
        </div>

        {/* KPI 3: Sự cố khẩn cấp đang xử lý */}
        <div className="kpi-card kpi-red">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">notification_important</span>
            </div>
            <span className="kpi-tag-chip">Đang chờ xử lý</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{pendingIssues}</span>
            <span className="kpi-unit">ca</span>
          </div>
          <p className="kpi-label">Sự cố đang chờ kỹ thuật viên</p>
          <div className="kpi-subtext">
            <span>Bao gồm <strong>{urgentIssues}</strong> ca khẩn cấp</span>
          </div>
        </div>

        {/* KPI 4: Chi phí bảo trì thực tế */}
        <div className="kpi-card kpi-amber">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <span className="kpi-tag-chip">Thực chi</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{formatCurrency(totalActualCost)}</span>
            <span className="kpi-unit">đ</span>
          </div>
          <p className="kpi-label">Tổng chi phí sửa chữa thực tế</p>
          <div className="kpi-subtext">
            <span>Áp dụng cho: <strong>{rangeTitle}</strong></span>
          </div>
        </div>
      </div>

      {/* ── BẢNG CHI TIẾT THỐNG KÊ THEO TỪNG SÂN BÓNG ── */}
      <div className="stats-table-card">
        <div className="stats-table-header">
          <div>
            <h4 className="stats-section-title">
              <span className="material-symbols-outlined">view_list</span>
              Bảng thống kê sự cố &amp; chi phí theo từng sân bóng
            </h4>
            <p className="stats-section-sub">
              So sánh khối lượng ca bảo trì và chi phí phát sinh giữa các sân trong <strong>{rangeTitle}</strong>
            </p>
          </div>
          <span className="stats-badge-count">{pitchStats.length} sân bóng</span>
        </div>

        <div className="stats-table-wrapper">
          <table className="stats-data-table">
            <thead>
              <tr>
                <th>Sân bóng &amp; Quy chuẩn</th>
                <th>Tổng sự cố</th>
                <th>Tỉ trọng đóng góp</th>
                <th>Phân loại xử lý</th>
                <th>Chi phí thực tế</th>
                <th className="text-right">Tình trạng kỹ thuật</th>
              </tr>
            </thead>
            <tbody>
              {pitchStats.map((item) => {
                const isSelected =
                  statsFieldFilter !== "all" &&
                  String(item.field.field_name).toLowerCase().trim() ===
                    String(statsFieldFilter).toLowerCase().trim();

                return (
                  <tr key={item.field.id} className={isSelected ? "row-highlight" : ""}>
                    {/* Cột 1: Sân bóng */}
                    <td>
                      <div className="pitch-name-cell">
                        <div className="pitch-icon-box" style={{ background: "#fff7ed", color: "#ea580c" }}>
                          <span className="material-symbols-outlined">sports_soccer</span>
                        </div>
                        <div>
                          <strong className="pitch-name-title">{item.field.field_name}</strong>
                          <span className="pitch-name-type">
                            {item.field.field_type || "Sân cỏ nhân tạo"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: Tổng ca sự cố */}
                    <td>
                      <div className="pitch-count-badge">
                        <span className="material-symbols-outlined">build</span>
                        <strong>{item.total}</strong>
                        <span>ca</span>
                      </div>
                    </td>

                    {/* Cột 3: Tỉ trọng % */}
                    <td>
                      <div className="pitch-progress-wrapper">
                        <div className="pitch-progress-bar">
                          <div
                            className="pitch-progress-fill"
                            style={{
                              width: `${Math.max(item.percentage, 4)}%`,
                              background: item.hasActiveIssue ? "#ef4444" : "#10b981",
                            }}
                          />
                        </div>
                        <span className="pitch-progress-text">{item.percentage}%</span>
                      </div>
                    </td>

                    {/* Cột 4: Phân loại */}
                    <td>
                      <div className="pitch-type-tags">
                        <span className="type-tag tag-routine" title="Đã sửa xong">
                          <span className="material-symbols-outlined">check_circle</span>
                          Đã sửa: <strong>{item.done}</strong>
                        </span>
                        {item.pending > 0 && (
                          <span className="type-tag tag-urgent" title="Đang chờ sửa">
                            <span className="material-symbols-outlined">warning</span>
                            Chờ sửa: <strong>{item.pending}</strong>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 5: Chi phí thực tế */}
                    <td>
                      <strong style={{ color: item.cost > 0 ? "#059669" : "#64748b", fontSize: "0.88rem" }}>
                        {formatCurrency(item.cost)} đ
                      </strong>
                    </td>

                    {/* Cột 6: Trạng thái sân hiện tại */}
                    <td className="text-right">
                      {item.field?.is_available === false ? (
                        <span className="pitch-status-pill status-locked" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "14px", marginRight: "4px" }}>lock</span>
                          Đang tạm khóa
                        </span>
                      ) : item.hasActiveIssue ? (
                        <span className="pitch-status-pill status-uncleaned" style={{ background: "#fff7ed", color: "#ea580c", border: "1px solid #fed7aa" }}>
                          <span className="dot pulse red" />
                          Có sự cố ({item.pending})
                        </span>
                      ) : (
                        <span className="pitch-status-pill status-ready" style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                          <span className="dot green" />
                          Đạt chuẩn ca đá
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── NHẬT KÝ CHI TIẾT TỪNG PHIẾU BẢO TRÌ ── */}
      <div className="stats-table-card">
        <div className="stats-table-header">
          <div>
            <h4 className="stats-section-title">
              <span className="material-symbols-outlined">history_edu</span>
              Nhật ký tác nghiệp chi tiết các ca bảo trì thiết bị
            </h4>
            <p className="stats-section-sub">
              Danh sách chi tiết từng phiếu sự cố tiếp nhận ({filteredHistory.length} phiếu)
            </p>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="stats-empty-state">
            <span className="material-symbols-outlined empty-icon">assignment_late</span>
            <p className="empty-title">Không tìm thấy ca bảo trì nào trong khoảng thời gian này</p>
            <span className="empty-sub">
              Hãy chọn khoảng thời gian rộng hơn (Tuần này, Tháng này hoặc Tất cả) hoặc chọn "Tất cả sân bóng".
            </span>
          </div>
        ) : (
          <div className="stats-table-wrapper">
            <table className="stats-data-table">
              <thead>
                <tr>
                  <th style={{ width: "19%" }}>Phiếu &amp; Sân bóng</th>
                  <th style={{ width: "31%" }}>Hạng mục &amp; Mô tả sự cố</th>
                  <th style={{ width: "17%" }}>Nguồn báo &amp; Thời gian</th>
                  <th style={{ width: "11%" }}>Chi phí thực tế</th>
                  <th style={{ width: "10%" }}>Hoàn tất</th>
                  <th style={{ width: "12%", textAlign: "center" }}>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((h, idx) => {
                  const isDone = h.status === "done" || h.status === "resolved";
                  const isFixing = h.status === "fixing";
                  const isUrgent = (h.priority || "").toLowerCase().includes("khẩn cấp");
                  const isCleaning = (h.reportedBy || h.reported_by_name || "").toLowerCase().includes("vệ sinh");
                  const costNum = parseFloat(h.cost) || 0;

                  return (
                    <tr key={h.id || idx}>
                      {/* Cột 1: Phiếu & Sân bóng */}
                      <td>
                        <div className="m-ticket-cell">
                          <span className="inv-id">#{String(h.id || idx + 1).slice(0, 8)}</span>
                          <strong className="m-field-name">{h.fieldName || h.field_name || "Sân bóng"}</strong>
                        </div>
                      </td>

                      {/* Cột 2: Hạng mục & Mô tả sự cố */}
                      <td>
                        <div className="m-issue-cell">
                          <div className="m-issue-tags">
                            <span className="field-badge">{h.category || "Cơ sở vật chất"}</span>
                            <span
                              className={`priority-badge priority-${isUrgent ? "high" : "normal"}`}
                            >
                              {h.priority || "Bình thường"}
                            </span>
                          </div>
                          <span className="issue-desc" title={h.description}>
                            {h.description || "Không có mô tả chi tiết sự cố"}
                          </span>
                        </div>
                      </td>

                      {/* Cột 3: Nguồn báo & Thời gian */}
                      <td>
                        <div className="tx-time-cell">
                          <span className="tx-date-main">{formatDisplayDate(h.createdAt || h.created_at)}</span>
                          <small className="tx-time-sub" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "0.8rem", color: isCleaning ? "#059669" : "#3b82f6" }}>
                              {isCleaning ? "cleaning_services" : "build"}
                            </span>
                            {h.reportedBy || h.reported_by_name || "Nhân viên"}
                          </small>
                        </div>
                      </td>

                      {/* Cột 4: Chi phí thực tế */}
                      <td>
                        <strong style={{ color: costNum > 0 ? "#b91c1c" : "#64748b", fontSize: "0.88rem" }}>
                          {costNum > 0 ? `${formatCurrency(costNum)} đ` : "0 đ"}
                        </strong>
                      </td>

                      {/* Cột 5: Hoàn tất */}
                      <td>
                        <span style={{ color: isDone ? "#059669" : "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
                          {h.resolvedAt || (isDone ? "Đã sửa xong" : "Đang xử lý")}
                        </span>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`tx-badge ${isDone ? "success" : isFixing ? "pending" : "cancelled"}`}
                        >
                          <span className="tx-badge-dot" />
                          {isDone ? "Đã xong" : isFixing ? "Đang sửa" : "Chờ xử lý"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

