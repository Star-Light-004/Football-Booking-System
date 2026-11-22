import React from "react";

// Dữ liệu mẫu khởi tạo lịch sử dọn dẹp đa ngày (Hôm nay, Tuần này, Tháng này)
export const generateSeedCleaningHistory = (fieldList = []) => {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const now = new Date();

  const getOffsetDateStr = (daysAgo) => {
    const target = new Date(now);
    target.setDate(target.getDate() - daysAgo);
    return target.toLocaleDateString("en-CA");
  };

  const getFieldInfo = (idx) => {
    if (fieldList && fieldList.length > 0) {
      const f = fieldList[idx % fieldList.length];
      return {
        name: f.field_name,
        type: f.field_type || "Sân cỏ nhân tạo",
      };
    }
    const defaults = [
      { name: "Sân bóng đá Duy Tân", type: "5 vs 5" },
      { name: "Sân bóng đá Chuyên Việt", type: "5 vs 5" },
      { name: "Sân Bóng An Phúc", type: "7 vs 7" },
      { name: "Sân Bóng Paracel - Quang Nguyễn", type: "7 vs 7" },
      { name: "Sân Bóng Trang Hoàng", type: "11 vs 11" },
      { name: "Sân bóng đá Trưng Vương - BK8", type: "11 vs 11" },
    ];
    return defaults[idx % defaults.length];
  };

  const f0 = getFieldInfo(0);
  const f1 = getFieldInfo(1);
  const f2 = getFieldInfo(2);
  const f3 = getFieldInfo(3);
  const f4 = getFieldInfo(4);
  const f5 = getFieldInfo(5);

  return [
    // ── HÔM NAY ──
    {
      id: "cl_seed_1",
      fieldName: f0.name,
      fieldType: f0.type,
      date: todayStr,
      slotTime: "17:00 - 18:00",
      completedAt: "18:05",
      cleanerName: "Nguyễn Văn Hùng",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Ca đá hoàn thành",
      notes: "Quét sạch vỏ chai nhựa ở ghế chờ, thu gom 2 bóng cho thuê, mặt cỏ sạch sẽ.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_2",
      fieldName: f1.name,
      fieldType: f1.type,
      date: todayStr,
      slotTime: "16:00 - 17:00",
      completedAt: "17:12",
      cleanerName: "Trần Thị Mai",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Ca đá hoàn thành",
      notes: "Dọn rác hàng ghế chờ, kiểm tra lưới khung thành và móc neo an toàn.",
      lostItemReported: true,
    },
    {
      id: "cl_seed_3",
      fieldName: f2.name,
      fieldType: f2.type,
      date: todayStr,
      slotTime: "15:30 - 16:30",
      completedAt: "16:40",
      cleanerName: "Lê Quốc Bảo",
      type: "urgent",
      reportedBy: "Nguyễn Quản Trị",
      reason: "Quản lý đặt sân báo khẩn cấp",
      notes: "Khách làm đổ nước giải khát ở đường biên, đã lau khô và xịt khử khuẩn mặt sân.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_4",
      fieldName: f3.name,
      fieldType: f3.type,
      date: todayStr,
      slotTime: "14:00 - 15:00",
      completedAt: "15:08",
      cleanerName: "Nguyễn Văn Hùng",
      type: "match",
      reportedBy: "Hệ thống tự động",
      reason: "Ca đá hoàn thành",
      notes: "Thu gom áo bib thuê, quét dọn rác khu vực kỹ thuật hai đội.",
      lostItemReported: false,
    },

    // ── TUẦN NÀY (Các ngày trước) ──
    {
      id: "cl_seed_5",
      fieldName: f4.name,
      fieldType: f4.type,
      date: getOffsetDateStr(1),
      slotTime: "19:00 - 20:30",
      completedAt: "20:45",
      cleanerName: "Trần Thị Mai",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Trận giao hữu kết thúc",
      notes: "Kiểm tra lưới khung thành 11m, dọn sạch 4 thùng rác quanh sân cỏ.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_6",
      fieldName: f5.name,
      fieldType: f5.type,
      date: getOffsetDateStr(2),
      slotTime: "17:30 - 19:00",
      completedAt: "19:15",
      cleanerName: "Lê Quốc Bảo",
      type: "match",
      reportedBy: "Hệ thống tự động",
      reason: "Ca đá hoàn thành",
      notes: "Rà soát dị vật an toàn, nhặt đinh ghim bảng số trên mặt cỏ nhân tạo.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_7",
      fieldName: f0.name,
      fieldType: f0.type,
      date: getOffsetDateStr(2),
      slotTime: "20:00 - 21:00",
      completedAt: "21:10",
      cleanerName: "Nguyễn Văn Hùng",
      type: "urgent",
      reportedBy: "Trần Quản Lý",
      reason: "Quản lý đặt sân báo khẩn cấp",
      notes: "Khách để lại nhiều rác sau giải mini, tập kết 3 túi rác ra khu xử lý.",
      lostItemReported: true,
    },
    {
      id: "cl_seed_8",
      fieldName: f1.name,
      fieldType: f1.type,
      date: getOffsetDateStr(3),
      slotTime: "18:00 - 19:00",
      completedAt: "19:10",
      cleanerName: "Trần Thị Mai",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Ca đá hoàn thành",
      notes: "Dọn dẹp nhanh trong 10 phút, bàn giao mặt sân chuẩn bị đón ca tới.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_9",
      fieldName: f2.name,
      fieldType: f2.type,
      date: getOffsetDateStr(4),
      slotTime: "16:00 - 17:30",
      completedAt: "17:42",
      cleanerName: "Lê Quốc Bảo",
      type: "match",
      reportedBy: "Hệ thống tự động",
      reason: "Ca đá hoàn thành",
      notes: "Vệ sinh mặt sân cỏ nhân tạo, thu gom bóng dự phòng.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_10",
      fieldName: f3.name,
      fieldType: f3.type,
      date: getOffsetDateStr(5),
      slotTime: "19:30 - 21:00",
      completedAt: "21:15",
      cleanerName: "Nguyễn Văn Hùng",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Ca đá hoàn thành",
      notes: "Tắt đèn chiếu sáng sau ca, dọn sạch lối đi dẫn vào sân.",
      lostItemReported: false,
    },

    // ── THÁNG NÀY (Các ngày trước đó) ──
    {
      id: "cl_seed_11",
      fieldName: f4.name,
      fieldType: f4.type,
      date: getOffsetDateStr(8),
      slotTime: "18:00 - 19:30",
      completedAt: "19:40",
      cleanerName: "Lê Quốc Bảo",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Ca đá hoàn thành",
      notes: "Dọn rác khán đài A & B, thu gom rác sau trận tập huấn cơ quan.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_12",
      fieldName: f0.name,
      fieldType: f0.type,
      date: getOffsetDateStr(10),
      slotTime: "17:00 - 18:00",
      completedAt: "18:10",
      cleanerName: "Nguyễn Văn Hùng",
      type: "urgent",
      reportedBy: "Admin",
      reason: "Quản lý đặt sân báo khẩn cấp",
      notes: "Dọn chai thủy tinh vỡ cạnh rào chắn an toàn phía sau gôn.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_13",
      fieldName: f2.name,
      fieldType: f2.type,
      date: getOffsetDateStr(12),
      slotTime: "19:00 - 20:30",
      completedAt: "20:45",
      cleanerName: "Trần Thị Mai",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Ca đá hoàn thành",
      notes: "Thu gom áo bib thuê, quét dọn ghế chờ của khán giả.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_14",
      fieldName: f1.name,
      fieldType: f1.type,
      date: getOffsetDateStr(15),
      slotTime: "16:00 - 17:00",
      completedAt: "17:15",
      cleanerName: "Nguyễn Văn Hùng",
      type: "match",
      reportedBy: "Hệ thống tự động",
      reason: "Ca đá hoàn thành",
      notes: "Vệ sinh đường biên, thay túi đựng rác mới tại các cột góc.",
      lostItemReported: false,
    },
    {
      id: "cl_seed_15",
      fieldName: f5.name,
      fieldType: f5.type,
      date: getOffsetDateStr(18),
      slotTime: "16:30 - 18:00",
      completedAt: "18:15",
      cleanerName: "Lê Quốc Bảo",
      type: "match",
      reportedBy: "Quản lý đặt sân",
      reason: "Ca đá hoàn thành",
      notes: "Kiểm tra mặt cỏ, bảo dưỡng rãnh thoát nước sau mưa nhẹ.",
      lostItemReported: false,
    },
  ];
};

export function CleaningStatsPanel({
  fields = [],
  bookings = [],
  cleaningStatus = {},
  cleaningHistory = [],
  lostFoundItems = [],
  statsRange = "day",
  setStatsRange,
  statsFieldFilter = "all",
  setStatsFieldFilter,
}) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // Lọc lịch sử theo khoảng thời gian: Hôm nay / Tuần này / Tháng này
  const dateFilteredHistory = cleaningHistory.filter((item) => {
    if (!item.date) return false;
    const itemDateStr = String(item.date).slice(0, 10);

    if (statsRange === "day") {
      return itemDateStr === todayStr;
    }
    if (statsRange === "week") {
      const itemDate = new Date(itemDateStr);
      const diffDays = Math.floor((now - itemDate) / dayMs);
      return diffDays >= 0 && diffDays <= 7;
    }
    if (statsRange === "month") {
      return itemDateStr.slice(0, 7) === todayStr.slice(0, 7);
    }
    return true;
  });

  // Lọc tiếp theo sân bóng nếu có chọn
  const filteredHistory = dateFilteredHistory.filter((item) => {
    if (statsFieldFilter === "all") return true;
    return (
      String(item.fieldName || "").toLowerCase().trim() ===
      String(statsFieldFilter).toLowerCase().trim()
    );
  });

  // Tính toán KPI Tổng quan
  const totalCleaned = filteredHistory.length;
  const routineCleaned = filteredHistory.filter((h) => h.type === "match").length;
  const urgentCleaned = filteredHistory.filter((h) => h.type === "urgent").length;

  // Đếm đồ khách bỏ quên ghi nhận trong kỳ
  const periodLostItems = lostFoundItems.filter((item) => {
    if (!item.bookingDate) return true;
    const dStr = String(item.bookingDate).slice(0, 10);
    if (statsRange === "day") return dStr === todayStr;
    if (statsRange === "week") {
      const diff = Math.floor((now - new Date(dStr)) / dayMs);
      return diff >= 0 && diff <= 7;
    }
    if (statsRange === "month") return dStr.slice(0, 7) === todayStr.slice(0, 7);
    return true;
  }).filter((item) => {
    if (statsFieldFilter === "all") return true;
    return (
      String(item.fieldName || "").toLowerCase().trim() ===
      String(statsFieldFilter).toLowerCase().trim()
    );
  });

  // Format ngày kiểu Việt Nam DD/MM/YYYY
  const formatVN = (d) => {
    if (!d) return "";
    const p = String(d).slice(0, 10).split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
  };

  // Tiêu đề khoảng thời gian hiển thị
  const rangeTitle =
    statsRange === "day"
      ? `Hôm nay (${formatVN(todayStr)})`
      : statsRange === "week"
        ? "7 ngày gần nhất (Tuần này)"
        : `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

  // Thống kê theo từng sân bóng
  const pitchStats = fields.map((field) => {
    const fHistory = dateFilteredHistory.filter(
      (h) =>
        String(h.fieldName || "").toLowerCase().trim() ===
        String(field.field_name || "").toLowerCase().trim()
    );

    const fTotal = fHistory.length;
    const fRoutine = fHistory.filter((h) => h.type === "match").length;
    const fUrgent = fHistory.filter((h) => h.type === "urgent").length;
    const latest = fHistory[0] || null;
    const curStatus = cleaningStatus[field.id] || cleaningStatus[field.field_name] || {};
    const isClean = !curStatus.status || curStatus.status === "clean";

    // Kiểm tra xem sân có ca đang thi đấu ngay lúc này không
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const isOngoingNow = bookings.some((b) => {
      const matchName =
        String(b.field || "").toLowerCase().trim() === String(field.field_name || "").toLowerCase().trim() ||
        String(b.field_id || "") === String(field.id);
      const isToday = String(b.date || b.booking_date || "").slice(0, 10) === todayStr;
      const statusLower = String(b.status || "").toLowerCase();
      if (!matchName || !isToday || statusLower === "cancelled" || statusLower === "completed") return false;

      const timeParts = String(b.time || "").split("-");
      if (timeParts.length < 2) return false;
      const startMatch = timeParts[0].trim().match(/^(\d{1,2}):(\d{2})/);
      const endMatch = timeParts[1].trim().match(/^(\d{1,2}):(\d{2})/);
      if (!startMatch || !endMatch) return false;
      const startMins = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
      const endMins = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);
      return currentMins >= startMins && currentMins < endMins;
    });

    return {
      field,
      total: fTotal,
      routine: fRoutine,
      urgent: fUrgent,
      latest,
      isClean,
      isOngoingNow,
      curStatus,
      percentage: totalCleaned > 0 ? Math.round((fTotal / totalCleaned) * 100) : 0,
    };
  });

  return (
    <div className="cleaning-stats-container">
      {/* ── THANH ĐIỀU KHIỂN & BỘ LỌC THỐNG KÊ ── */}
      <div className="stats-control-card">
        <div className="stats-control-left">
          <div className="stats-badge-tag">
            <span className="material-symbols-outlined">insights</span>
            <span>BÁO CÁO NĂNG SUẤT VỆ SINH</span>
          </div>
          <h3 className="stats-control-title">Thống kê số ca đã dọn dẹp</h3>
          <p className="stats-control-desc">
            Theo dõi khối lượng công việc và hiệu suất hoàn thành của đội ngũ nhân viên vệ sinh bãi sân cỏ theo <strong>{rangeTitle}</strong>.
          </p>
        </div>

        <div className="stats-control-actions">
          {/* Bộ nút chọn khoảng thời gian */}
          <div className="stats-range-tabs">
            <button
              type="button"
              className={`stats-range-btn ${statsRange === "day" ? "active" : ""}`}
              onClick={() => setStatsRange("day")}
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
        </div>
      </div>

      {/* ── 4 THẺ KPI CHỈ SỐ VỆ SINH ── */}
      <div className="stats-kpi-grid">
        {/* KPI 1: Tổng số ca đã dọn */}
        <div className="kpi-card kpi-purple">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">cleaning_services</span>
            </div>
            <span className="kpi-tag-chip">Năng suất tổng</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{totalCleaned}</span>
            <span className="kpi-unit">ca dọn</span>
          </div>
          <p className="kpi-label">Tổng số ca đã dọn thành công</p>
          <div className="kpi-subtext">
            <span>Áp dụng cho: <strong>{rangeTitle}</strong></span>
          </div>
        </div>

        {/* KPI 2: Ca đón khách định kỳ */}
        <div className="kpi-card kpi-green">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <span className="kpi-tag-chip">Theo lịch đặt</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{routineCleaned}</span>
            <span className="kpi-unit">ca</span>
          </div>
          <p className="kpi-label">Dọn đón khách định kỳ sau ca</p>
          <div className="kpi-subtext">
            <span>Chiếm <strong>{totalCleaned > 0 ? Math.round((routineCleaned / totalCleaned) * 100) : 0}%</strong> tổng lượt tác nghiệp</span>
          </div>
        </div>

        {/* KPI 3: Ca dọn khẩn cấp */}
        <div className="kpi-card kpi-red">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">notification_important</span>
            </div>
            <span className="kpi-tag-chip">Khẩn cấp</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{urgentCleaned}</span>
            <span className="kpi-unit">ca</span>
          </div>
          <p className="kpi-label">Yêu cầu dọn khẩn cấp từ Quản lý</p>
          <div className="kpi-subtext">
            <span>Xử lý sự cố đổ nước, rác giải đấu</span>
          </div>
        </div>

        {/* KPI 4: Đồ khách bỏ quên */}
        <div className="kpi-card kpi-blue">
          <div className="kpi-card-header">
            <div className="kpi-icon-box">
              <span className="material-symbols-outlined">luggage</span>
            </div>
            <span className="kpi-tag-chip">Bàn giao Lễ tân</span>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{periodLostItems.length}</span>
            <span className="kpi-unit">món đồ</span>
          </div>
          <p className="kpi-label">Đồ đạc để quên được phát hiện</p>
          <div className="kpi-subtext">
            <span>Đã ghi nhận vào kho Lost &amp; Found</span>
          </div>
        </div>
      </div>

      {/* ── BẢNG CHI TIẾT THỐNG KÊ THEO TỪNG SÂN BÓNG ── */}
      <div className="stats-table-card">
        <div className="stats-table-header">
          <div>
            <h4 className="stats-section-title">
              <span className="material-symbols-outlined">view_list</span>
              Bảng thống kê số ca đã dọn theo từng sân bóng
            </h4>
            <p className="stats-section-sub">
              So sánh khối lượng ca dọn giữa các sân trong <strong>{rangeTitle}</strong>
            </p>
          </div>
          <span className="stats-badge-count">{pitchStats.length} sân bóng</span>
        </div>

        <div className="stats-table-wrapper">
          <table className="stats-data-table">
            <thead>
              <tr>
                <th>Sân bóng &amp; Quy chuẩn</th>
                <th>Tổng số ca đã dọn</th>
                <th>Tỉ trọng đóng góp</th>
                <th>Phân loại tác nghiệp</th>
                <th>Ca dọn gần nhất</th>
                <th className="text-right">Trạng thái sân hiện tại</th>
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
                        <div className="pitch-icon-box">
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

                    {/* Cột 2: Tổng ca dọn */}
                    <td>
                      <div className="pitch-count-badge">
                        <span className="material-symbols-outlined">done_all</span>
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
                            style={{ width: `${Math.max(item.percentage, 4)}%` }}
                          />
                        </div>
                        <span className="pitch-progress-text">{item.percentage}%</span>
                      </div>
                    </td>

                    {/* Cột 4: Phân loại */}
                    <td>
                      <div className="pitch-type-tags">
                        <span className="type-tag tag-routine" title="Ca dọn định kỳ">
                          <span className="material-symbols-outlined">schedule</span>
                          Định kỳ: <strong>{item.routine}</strong>
                        </span>
                        {item.urgent > 0 && (
                          <span className="type-tag tag-urgent" title="Ca dọn khẩn cấp">
                            <span className="material-symbols-outlined">warning</span>
                            Khẩn cấp: <strong>{item.urgent}</strong>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cột 5: Ca dọn gần nhất */}
                    <td>
                      {item.latest ? (
                        <div className="pitch-latest-cell">
                          <div className="latest-slot-row">
                            <span className="material-symbols-outlined">history</span>
                            <strong>Ca {item.latest.slotTime}</strong>
                          </div>
                          <span className="latest-sub">
                            {formatVN(item.latest.date)} ({item.latest.completedAt}) • {item.latest.cleanerName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-empty">Chưa có ca dọn trong kỳ</span>
                      )}
                    </td>

                    {/* Cột 6: Trạng thái hiện tại */}
                    <td className="text-right">
                      {item.isOngoingNow ? (
                        <span className="current-status-pill pill-ongoing" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                          <span className="material-symbols-outlined">sports_soccer</span>
                          Đang thi đấu
                        </span>
                      ) : !item.isClean && item.curStatus.status === "in_progress" ? (
                        <span className="current-status-pill pill-progress">
                          <span className="material-symbols-outlined">hourglass_top</span>
                          Đang dọn
                        </span>
                      ) : !item.isClean || item.curStatus.status === "needs_clean" ? (
                        <span className="current-status-pill pill-urgent">
                          <span className="material-symbols-outlined">priority_high</span>
                          Cần dọn
                        </span>
                      ) : (
                        <span className="current-status-pill pill-clean">
                          <span className="material-symbols-outlined">check_circle</span>
                          Sạch sẽ
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

      {/* ── NHẬT KÝ CHI TIẾT TỪNG CA DỌN ĐÃ HOÀN TẤT ── */}
      <div className="stats-table-card">
        <div className="stats-table-header">
          <div>
            <h4 className="stats-section-title">
              <span className="material-symbols-outlined">history_edu</span>
              Nhật ký tác nghiệp chi tiết các ca dọn hoàn tất
            </h4>
            <p className="stats-section-sub">
              Danh sách chi tiết từng ca vệ sinh được nhân viên dọn dẹp ghi nhận thành công ({filteredHistory.length} ca)
            </p>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="stats-empty-state">
            <span className="material-symbols-outlined empty-icon">assignment_late</span>
            <p className="empty-title">Không tìm thấy ca dọn dẹp nào trong khoảng thời gian này</p>
            <span className="empty-sub">
              Hãy chọn khoảng thời gian rộng hơn (Tuần này hoặc Tháng này) hoặc chọn &quot;Tất cả sân bóng&quot;.
            </span>
          </div>
        ) : (
          <div className="stats-history-grid">
            {filteredHistory.map((h, idx) => (
              <div
                key={h.id || idx}
                className={`stats-history-card ${h.type === "urgent" ? "is-urgent" : "is-routine"}`}
              >
                <div className="history-card-top">
                  <div className="history-title-wrap">
                    <span className="material-symbols-outlined history-badge-icon">
                      {h.type === "urgent" ? "warning" : "check_circle"}
                    </span>
                    <div>
                      <h5 className="history-field-name">{h.fieldName}</h5>
                      <span className="history-slot-time">Ca: <strong>{h.slotTime}</strong></span>
                    </div>
                  </div>

                  <div className="history-meta-right">
                    <span className="history-time-badge">
                      <span className="material-symbols-outlined">schedule</span>
                      Xong lúc {h.completedAt}
                    </span>
                    <span className="history-date-badge">{formatVN(h.date)}</span>
                  </div>
                </div>

                <div className="history-body">
                  <p className="history-notes">
                    <span className="material-symbols-outlined note-icon">notes</span>
                    <span>{h.notes || "Đã kiểm tra và dọn dẹp sạch sẽ đúng tiêu chuẩn."}</span>
                  </p>
                </div>

                <div className="history-footer">
                  <div className="history-cleaner-info">
                    <span className="material-symbols-outlined">person</span>
                    <span>Thực hiện: <strong>{h.cleanerName || "Nhân viên vệ sinh"}</strong></span>
                  </div>

                  <div className="history-source-info">
                    {h.type === "urgent" ? (
                      <span className="badge-urgent-tag">
                        Báo khẩn cấp ({h.reportedBy || "Quản lý"})
                      </span>
                    ) : (
                      <span className="badge-routine-tag">
                        {h.reportedBy || "Theo lịch đặt sân"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CleaningStatsPanel;

