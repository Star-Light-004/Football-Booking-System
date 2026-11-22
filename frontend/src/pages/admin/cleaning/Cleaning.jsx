import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFields } from "../../../api/fieldsApi";
import { getBookings } from "../../../api/bookingsApi";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import { broadcastSyncEvent, onSyncEvent } from "../../../utils/realtimeSync";
import "../dashboard/dashboard.css";
import "./Cleaning.css";
import { LostFoundBookingPanel } from "../bookings/LostFoundPanel";
import { CleaningStatsPanel, generateSeedCleaningHistory } from "./CleaningStatsPanel";
import { createLostFoundItem, getLostFoundItems, updateLostFoundItem, getCleaningLogs, createCleaningLog, createMaintenanceIssue } from "../../../api/facilityApi";

function TopHeader({ searchQuery, onSearchChange, onRefresh }) {
  return (
    <header className="top-header">
      <div className="search-wrapper">
        <div className="search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Tìm kiếm sân bóng, trạng thái vệ sinh..."
            value={searchQuery || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="header-actions">
        <button className="icon-btn" type="button" title="Làm mới danh sách" onClick={() => onRefresh(false)}>
          <span className="material-symbols-outlined">refresh</span>
        </button>
        <div className="header-divider" />
        <Link to="/admin/bookings" className="btn-new-booking">
          <span className="material-symbols-outlined">calendar_month</span>
          Lịch đặt sân
        </Link>
      </div>
    </header>
  );
}

export default function Cleaning() {
  const [fields, setFields] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [cleaningStatus, setCleaningStatus] = useState({});
  const [cleaningLogs, setCleaningLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" | "urgent" | "in_progress" | "clean" | "lost_found"
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());

  // Modal Xem chi tiết cho Role Nhân viên Dọn dẹp
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailField, setDetailField] = useState(null);
  const [detailChecklist, setDetailChecklist] = useState({
    trash: true,
    balls: true,
    debris: true,
    nets: true,
  });

  const openDetailModal = (field) => {
    setDetailField(field);
    setShowDetailModal(true);
  };

  // Live Timer tự động nhảy lùi đếm ngược mỗi 30 giây thời gian thực
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Modal Báo hỏng cho Kỹ thuật
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingField, setReportingField] = useState(null);
  const [issueData, setIssueData] = useState({
    category: "Lưới khung thành & Cột",
    priority: "Khẩn cấp",
    description: "",
    estimatedCost: "",
  });

  // Modal Báo đồ thất lạc (Lost & Found)
  const [showLostModal, setShowLostModal] = useState(false);
  const [reportingLostField, setReportingLostField] = useState(null);
  const [lostFoundItems, setLostFoundItems] = useState([]);
  const [lostItemData, setLostItemData] = useState({
    itemType: "Áo khoác / Trang phục thi đấu",
    location: "Băng ghế chờ khán đài",
    description: "",
    guestInfo: "",
    customerPhone: "",
    bookingDate: new Date().toLocaleDateString("en-CA"),
  });

  const { toasts, removeToast, toast, showToast } = useToast();

  const STORAGE_KEY = "pitch_cleaning_status";
  const LOGS_KEY = "pitch_cleaning_logs";
  const ISSUES_KEY = "pitch_maintenance_issues";
  const LOST_KEY = "pitch_lost_found_items";
  const HISTORY_KEY = "pitch_cleaning_history";

  const [cleaningHistory, setCleaningHistory] = useState([]);
  const [statsRange, setStatsRange] = useState("day"); // "day" | "week" | "month"
  const [statsFieldFilter, setStatsFieldFilter] = useState("all");

  const reloadLocalStatus = (silent = false) => {
    try {
      const savedStatus = localStorage.getItem(STORAGE_KEY);
      if (savedStatus) setCleaningStatus(JSON.parse(savedStatus));
      const savedLogs = localStorage.getItem(LOGS_KEY);
      if (savedLogs) setCleaningLogs(JSON.parse(savedLogs));
      const savedLost = localStorage.getItem(LOST_KEY);
      if (savedLost) setLostFoundItems(JSON.parse(savedLost));
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory);
          const hasObsolete = parsed.some(h => h.fieldName && (h.fieldName.includes("Liên Chiểu") || h.fieldName.includes("Cẩm Lệ") || h.fieldName.includes("Hòa Xuân")));
          if (hasObsolete) {
            const seed = generateSeedCleaningHistory(fields);
            setCleaningHistory(seed);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(seed));
          } else {
            setCleaningHistory(parsed);
          }
        } catch {
          setCleaningHistory(JSON.parse(savedHistory));
        }
      }
      if (!silent) {
        showToast("Đã làm mới dữ liệu vệ sinh", "info");
      }
    } catch { }
  };

  useEffect(() => {
    const fetchData = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [resFields, resBookings, resLogs, resLost] = await Promise.all([
          getFields({ params: { show_all: "true" } }),
          getBookings(),
          getCleaningLogs().catch(() => ({ data: [] })),
          getLostFoundItems().catch(() => ({ data: [] })),
        ]);
        const fieldList = resFields.data?.fields || resFields.data || [];
        const bookingList = resBookings.data?.bookings || resBookings.data || [];
        const backendLogs = Array.isArray(resLogs.data) ? resLogs.data : (resLogs.data?.results || []);
        setFields(fieldList);
        setBookings(bookingList);

        const todayStr = new Date().toLocaleDateString("en-CA");
        const todayFormatted = formatDateVN(todayStr);

        // ── ĐỒNG BỘ 100% TỪ CƠ SỞ DỮ LIỆU BACKEND (PitchCleaning) ──
        // Lấy toàn bộ log dọn dẹp hôm nay từ CSDL backend làm Nguồn Sự Thật Duy Nhất (Single Source of Truth)
        const todayBackendLogs = backendLogs.filter((log) => {
          if (!log) return false;
          const logDate = String(log.created_at || "").slice(0, 10);
          return logDate === todayStr;
        });

        let statusObj = {};

        fieldList.forEach((f) => {
          const fId = f.id;
          const fName = f.field_name;

          // Lọc tất cả log hôm nay của sân này trong CSDL
          const fieldLogs = todayBackendLogs.filter((log) =>
            String(log.field || "") === String(fId) ||
            String(log.field_name || log.fieldName || "").toLowerCase().trim() === String(fName).toLowerCase().trim()
          );

          // Sắp xếp theo created_at tăng dần để log mới nhất ghi đè
          fieldLogs.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

          // Danh sách các ca ĐÃ DỌN XONG THỰC TẾ TRONG CSDL HÔM NAY
          const cleanLogs = fieldLogs.filter((l) => l.status === "clean");
          const cleanedSessions = [];
          const cleanedTimes = [];

          cleanLogs.forEach((log) => {
            let slotTime = log.cleaned_match_time || "";
            if (!slotTime && log.status_text) {
              const m = log.status_text.match(/(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
              if (m) slotTime = m[1];
            }
            if (!slotTime && log.start_time) slotTime = log.start_time;

            if (slotTime && !cleanedTimes.includes(slotTime)) {
              cleanedTimes.push(slotTime);
              const completedTimeStr = log.end_time || log.start_time || (log.created_at ? new Date(log.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Hôm nay");
              const isUrgent = Boolean(
                (log.status_text && (log.status_text.includes("khẩn cấp") || log.status_text.includes("gấp"))) ||
                (log.notes && (log.notes.includes("khẩn cấp") || log.notes.includes("gấp"))) ||
                log.type === "urgent"
              );
              cleanedSessions.push({
                id: log.id || `cl_${Date.now()}`,
                time: slotTime,
                name: log.cleaned_match_customer || "Khách đặt sân",
                phone: "",
                date: todayFormatted,
                rawDate: todayStr,
                completedAt: completedTimeStr,
                type: isUrgent ? "urgent" : "match",
                reportedBy: log.cleaner_name || "Nhân viên dọn dẹp",
                reason: log.notes || log.status_text || "Đã hoàn tất dọn dẹp",
              });
            }
          });

          // Trạng thái mới nhất của sân từ CSDL backend (nếu có log)
          const latestLog = fieldLogs.length > 0 ? fieldLogs[fieldLogs.length - 1] : null;

          let pitchStatus = "clean";
          let cleaningReason = null;
          let completedMatch = null;
          let reportedTime = null;
          let reportedBy = null;
          let reportedNotes = null;
          let lastCleaned = cleanedSessions.length > 0
            ? `Đã dọn xong (${cleanedSessions[cleanedSessions.length - 1].completedAt})`
            : "Sẵn sàng đón khách";

          if (latestLog) {
            pitchStatus = latestLog.status || "clean";
            if (latestLog.status === "needs_clean") {
              cleaningReason = "urgent";
              completedMatch = {
                time: latestLog.cleaned_match_time || "",
                name: latestLog.cleaned_match_customer || "Khách đặt sân",
                reason: latestLog.notes || latestLog.status_text || "Ca đá hoàn thành - Cần dọn gấp",
              };
              lastCleaned = latestLog.status_text || "Cần dọn dẹp";
              reportedTime = latestLog.start_time || (latestLog.created_at ? new Date(latestLog.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong");
              reportedBy = latestLog.cleaner_name || "Quản lý đặt sân";
              reportedNotes = latestLog.notes || latestLog.status_text || "Cần dọn dẹp khẩn cấp";
            } else if (latestLog.status === "clean") {
              cleaningReason = null;
              lastCleaned = latestLog.status_text || `Đã dọn xong lúc ${latestLog.start_time || ""}`.trim();
            }
          }

          const fieldStatusObj = {
            status: pitchStatus,
            cleaningReason,
            completedMatch,
            cleanedBookingKey: cleanedTimes.length > 0 ? cleanedTimes.join(",") : null,
            cleanedSessions,
            lastCleaned,
            reportedTime,
            reportedBy,
            notes: reportedNotes,
            cleanerName: latestLog?.cleaner_name || "Nhân viên dọn dẹp",
            isCleanedToday: cleanedSessions.length > 0,
          };

          statusObj[fId] = fieldStatusObj;
          if (fName) statusObj[fName] = fieldStatusObj;
        });

        // ── Tự động phát hiện các ca đá trong ngày đã hoàn thành hoặc hết giờ thi đấu để chuyển sang CẦN DỌN GẤP ──
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        let hasAutoUpdate = false;
        bookingList.forEach((b) => {
          const isToday = String(b.date || "").slice(0, 10) === todayStr;
          const statusLower = String(b.status || "").toLowerCase();
          if (isToday && (statusLower === "confirmed" || statusLower === "checked_in" || statusLower === "completed")) {
            const timeParts = String(b.time || "").split("-");
            if (timeParts.length >= 2) {
              const endTimeStr = timeParts[1].trim();
              const m = endTimeStr.match(/^(\d{1,2}):(\d{2})/);
              if (m) {
                const endH = parseInt(m[1], 10);
                const endM = parseInt(m[2], 10);
                const isTimeEnded = currentHour > endH || (currentHour === endH && currentMinute >= endM);
                const isEnded = isTimeEnded || statusLower === "completed";

                if (isEnded) {
                  const matchField = fieldList.find((f) => f.field_name === b.field);
                  const fKey = matchField?.id || b.field_id || b.field;
                  const fName = b.field || matchField?.field_name;
                  const bTime = b.time || `${b.start_time || ""} - ${b.end_time || ""}`;

                  // Kiểm tra xem ca hoàn thành này đã được dọn sạch chưa:
                  const curSessions = (statusObj[fKey]?.cleanedSessions || statusObj[fName]?.cleanedSessions || []);
                  const isCleaned = curSessions.some((s) => s.time === bTime && isSessionToday(s, todayStr, todayFormatted)) ||
                                    Boolean(statusObj[fKey]?.cleanedBookingKey?.includes(bTime));

                  if (!isCleaned) {
                    const updateObj = {
                      ...(statusObj[fKey] || {}),
                      status: "needs_clean",
                      cleaningReason: "urgent",
                      lastCleaned: `Ca ${bTime} hoàn thành - Cần dọn gấp`,
                      cleanerName: "Chờ dọn dẹp",
                      notes: `Ca đá ${bTime} của ${b.name || "khách"} vừa hoàn thành. Cần dọn dẹp gấp!`,
                      completedMatch: {
                        time: bTime,
                        name: b.name || "Khách đặt sân",
                        phone: b.phone || "",
                        date: todayFormatted,
                        issueType: "Ca đá vừa hoàn thành - Cần dọn gấp",
                        notes: `Khách vừa hoàn tất trận đấu ca ${bTime}, cần thu gom chai lọ & vệ sinh ngay!`,
                      },
                      cleanedSessions: curSessions,
                    };
                    if (fKey) statusObj[fKey] = updateObj;
                    if (fName) statusObj[fName] = updateObj;
                    hasAutoUpdate = true;
                  }
                }
              }
            }
          }
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(statusObj));
        setCleaningStatus(statusObj);

        // Load Nhật ký dọn dẹp từ Backend DB
        if (backendLogs.length > 0) {
          const mappedLogs = backendLogs.slice(0, 10).map((l) => ({
            id: l.id,
            fieldName: l.field_name || l.fieldName || "Sân bóng",
            time: l.start_time || (l.created_at ? new Date(l.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong"),
            statusText: l.status_text || l.statusText || (l.status === "clean" ? "Đã dọn xong" : "Cần dọn dẹp"),
            cleaner: l.cleaner_name || l.cleanerName || "Nhân viên vệ sinh",
          }));
          setCleaningLogs(mappedLogs);
          localStorage.setItem(LOGS_KEY, JSON.stringify(mappedLogs));
        } else {
          const f0 = fieldList[0]?.field_name || "Sân bóng đá Duy Tân";
          const f1 = fieldList[1]?.field_name || "Sân bóng đá Chuyên Việt";
          const f2 = fieldList[2]?.field_name || "Sân Bóng An Phúc";
          const savedLogs = localStorage.getItem(LOGS_KEY);
          if (savedLogs) {
            try {
              const parsed = JSON.parse(savedLogs);
              const hasObsolete = parsed.some(l => l.fieldName && (l.fieldName.includes("Liên Chiểu") || l.fieldName.includes("Cẩm Lệ") || l.fieldName.includes("Hòa Xuân")));
              if (hasObsolete) {
                const freshLogs = [
                  { id: 1, fieldName: f0, time: "16:45", statusText: "Đã dọn xong sau ca", cleaner: "Nguyễn Văn Hùng" },
                  { id: 2, fieldName: f1, time: "15:20", statusText: "Đã vệ sinh mặt sân & nhặt bóng", cleaner: "Trần Thị Mai" },
                  { id: 3, fieldName: f2, time: "14:00", statusText: "Dọn dẹp tổng thể", cleaner: "Lê Quốc Bảo" },
                ];
                setCleaningLogs(freshLogs);
                localStorage.setItem(LOGS_KEY, JSON.stringify(freshLogs));
              } else {
                setCleaningLogs(parsed);
              }
            } catch {
              setCleaningLogs([
                { id: 1, fieldName: f0, time: "16:45", statusText: "Đã dọn xong sau ca", cleaner: "Nguyễn Văn Hùng" },
                { id: 2, fieldName: f1, time: "15:20", statusText: "Đã vệ sinh mặt sân & nhặt bóng", cleaner: "Trần Thị Mai" },
                { id: 3, fieldName: f2, time: "14:00", statusText: "Dọn dẹp tổng thể", cleaner: "Lê Quốc Bảo" },
              ]);
            }
          } else {
            const freshLogs = [
              { id: 1, fieldName: f0, time: "16:45", statusText: "Đã dọn xong sau ca", cleaner: "Nguyễn Văn Hùng" },
              { id: 2, fieldName: f1, time: "15:20", statusText: "Đã vệ sinh mặt sân & nhặt bóng", cleaner: "Trần Thị Mai" },
              { id: 3, fieldName: f2, time: "14:00", statusText: "Dọn dẹp tổng thể", cleaner: "Lê Quốc Bảo" },
            ];
            setCleaningLogs(freshLogs);
            localStorage.setItem(LOGS_KEY, JSON.stringify(freshLogs));
          }
        }

        // Load Đồ thất lạc từ backend CSDL hoặc localStorage
        const backendLost = Array.isArray(resLost.data) ? resLost.data : (resLost.data?.results || []);
        if (backendLost.length > 0) {
          const enriched = backendLost.map((item) => ({
            ...item,
            id: item.id,
            fieldName: item.field_name || item.fieldName || "Sân bóng",
            itemType: item.item_type || item.itemType || "Đồ đạc",
            location: item.location || "Băng ghế chờ khán đài",
            description: item.description || "",
            guestInfo: item.guest_info || item.guestInfo || "Chưa rõ",
            customerPhone: item.customer_phone || item.customerPhone || "",
            bookingDate: item.booking_date || item.bookingDate || "2026-11-16",
            status: item.status || "pending",
            time: item.time || "Hôm nay",
            reportedBy: item.reported_by || item.reportedBy || "Nhân viên dọn dẹp",
          }));
          setLostFoundItems(enriched);
          localStorage.setItem(LOST_KEY, JSON.stringify(enriched));
        } else {
          const savedLost = localStorage.getItem(LOST_KEY);
          if (savedLost) {
            try {
              const parsed = JSON.parse(savedLost);
              setLostFoundItems(Array.isArray(parsed) ? parsed : []);
            } catch {
              setLostFoundItems([]);
            }
          } else {
            setLostFoundItems([]);
          }
        }

        // Load Lịch sử thống kê ca dọn (pitch_cleaning_history)
        const savedHistory = localStorage.getItem(HISTORY_KEY);
        if (savedHistory) {
          try {
            const parsed = JSON.parse(savedHistory);
            const hasObsolete = parsed.some(h => h.fieldName && (h.fieldName.includes("Liên Chiểu") || h.fieldName.includes("Cẩm Lệ") || h.fieldName.includes("Hòa Xuân")));
            if (hasObsolete || !parsed.length) {
              const seed = generateSeedCleaningHistory(fieldList);
              setCleaningHistory(seed);
              localStorage.setItem(HISTORY_KEY, JSON.stringify(seed));
            } else {
              setCleaningHistory(parsed);
            }
          } catch {
            const seed = generateSeedCleaningHistory(fieldList);
            setCleaningHistory(seed);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(seed));
          }
        } else {
          const seed = generateSeedCleaningHistory(fieldList);
          setCleaningHistory(seed);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(seed));
        }
      } catch (error) {
        if (!silent) showToast("Không thể tải dữ liệu", "error");
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchData();

    // Đồng bộ Realtime tức thì (0ms) khi chuyển tab sang Web & Polling 3s ngầm
    const intervalTimer = setInterval(() => {
      fetchData(true);
    }, 3000);

    const handleWindowFocus = () => {
      fetchData(true);
    };
    window.addEventListener("focus", handleWindowFocus);

    // Lắng nghe sự kiện realtime từ các module khác
    const cleanupSync = onSyncEvent((event) => {
      if (
        event?.type === "pitch_cleaning_needed" ||
        event?.type === "pitch_cleaned" ||
        event?.type === "cleaning_status_changed" ||
        event?.type === "booking_completed" ||
        event?.type === "booking_updated" ||
        event?.type === "booking_deleted"
      ) {
        fetchData(true);
        reloadLocalStatus(true);
        if (event?.type === "pitch_cleaning_needed") {
          showToast(`🔔 ${event.fieldName || "Có sân"} vừa có yêu cầu báo dọn khẩn cấp!`, "info");
        }
      }
      if (event?.type === "lost_item_reported" || event?.type === "lost_item_status_changed" || event?.type === "lost_item_deleted") {
        fetchData(true);
      }
    });

    return () => {
      clearInterval(intervalTimer);
      window.removeEventListener("focus", handleWindowFocus);
      cleanupSync();
    };
  }, []);

  // Helper định dạng ngày Việt Nam DD/MM/YYYY
  const formatDateVN = (dateStr) => {
    if (!dateStr) return "";
    try {
      const parts = String(dateStr).slice(0, 10).split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Kiểm tra ca dọn có diễn ra trong ngày hôm nay hay không
  const isSessionToday = (s, todayStr, todayFormatted) => {
    if (!s) return false;
    if (s.rawDate && s.rawDate === todayStr) return true;
    if (s.date) {
      const dStr = String(s.date).trim();
      if (dStr === todayFormatted || dStr === todayStr) return true;
      const parts = dStr.split("/");
      if (parts.length === 3) {
        const standardDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        if (standardDate === todayStr) return true;
      }
      return false;
    }
    if (typeof s.id === "number" && s.id > 1000000000000) {
      const itemDateStr = new Date(s.id).toLocaleDateString("en-CA");
      return itemDateStr === todayStr;
    }
    return false;
  };

  // Tính toán ca đá tiếp theo & Mức độ khẩn cấp dọn dẹp
  const getFieldScheduleInfo = (field) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const todayFormatted = formatDateVN(todayStr);
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const fieldCleaningStatus = cleaningStatus[field?.id] || cleaningStatus[field?.field_name] || {};
    const isFieldClean = !fieldCleaningStatus.status || fieldCleaningStatus.status === "clean";

    const fieldBookings = bookings.filter((b) => {
      const bDate = String(b.date || b.booking_date || "").slice(0, 10);
      const isToday = bDate === todayStr;
      const matchName = String(b.field || b.field_name || "").toLowerCase().trim() === String(field.field_name || "").toLowerCase().trim();
      const matchId = String(b.field_id || b.field || "") === String(field.id || "");
      const statusLower = String(b.status || "").toLowerCase();
      const isActive = statusLower === "confirmed" || statusLower === "checked_in" || statusLower === "completed";
      return isToday && (matchName || matchId) && isActive;
    });

    // Sắp xếp các ca đá hôm nay theo giờ bắt đầu tăng dần
    fieldBookings.sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));

    const parsedBookings = fieldBookings.map((b) => {
      const statusLower = String(b.status || "").toLowerCase();
      const bTime = b.time || (b.start_time && b.end_time ? `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}` : "");
      const parts = String(bTime).split("-");
      const guestName = b.name || b.customer_name || b.user_name || "Khách đặt sân";
      const guestPhone = b.phone || b.customer_phone || b.user_phone || "";
      const bookingDateRaw = String(b.date || b.booking_date || todayStr).slice(0, 10);

      let startMins = 0;
      let endMins = 1440;
      if (parts.length >= 2) {
        const startMatch = parts[0].trim().match(/^(\d{1,2}):(\d{2})/);
        const endMatch = parts[1].trim().match(/^(\d{1,2}):(\d{2})/);
        if (startMatch) startMins = parseInt(startMatch[1], 10) * 60 + parseInt(startMatch[2], 10);
        if (endMatch) endMins = parseInt(endMatch[1], 10) * 60 + parseInt(endMatch[2], 10);
      }

      // Kiểm tra ca này đã được dọn sạch sẽ chưa trong ngày hôm nay
      const isCleanedSession = isFieldClean && (
        Boolean(fieldCleaningStatus.cleanedBookingKey?.includes(bTime)) ||
        Boolean(fieldCleaningStatus.cleanedSessions?.some((s) => s.time === bTime && isSessionToday(s, todayStr, todayFormatted)))
      );

      const isEnded = currentMins >= endMins || statusLower === "completed";
      const isOngoing = currentMins >= startMins && currentMins < endMins && statusLower !== "completed";
      const diffToStart = startMins - currentMins;

      return {
        ...b,
        time: bTime,
        name: guestName,
        phone: guestPhone,
        rawDate: bookingDateRaw,
        formattedDate: formatDateVN(bookingDateRaw),
        startMins,
        endMins,
        isEnded,
        isOngoing,
        diffToStart,
        minutesLeft: Math.max(0, diffToStart),
        remainingOngoingMins: Math.max(0, endMins - currentMins),
        isCleaned: isCleanedSession,
      };
    });

    // 1. Ca đang diễn ra ngay lúc này
    const ongoingBooking = parsedBookings.find((b) => b.isOngoing) || null;

    // 2. Các ca đã kết thúc hôm nay
    const endedBookings = parsedBookings.filter((b) => b.isEnded);
    const recentEndedBooking = endedBookings.length > 0 ? endedBookings[endedBookings.length - 1] : null;
    const hasEndedBookingToday = endedBookings.length > 0;

    // 3. Ca tiếp theo trong tương lai hôm nay (chưa bắt đầu)
    const futureBookings = parsedBookings.filter(
      (b) => !b.isEnded && !b.isOngoing && currentMins < b.startMins && String(b.status || "").toLowerCase() !== "cancelled"
    );
    const nextBooking = futureBookings.length > 0 ? futureBookings[0] : null;
    const isNextBookingCleaned = isFieldClean;
    const hasActiveUncleanedBooking = !isFieldClean && Boolean(nextBooking);

    // Kiểm tra xem ca đá vừa xong này đã được dọn chưa
    const cleanedSessionsList = fieldCleaningStatus.cleanedSessions || [];
    const isEndedBookingCleaned = recentEndedBooking ? (
      cleanedSessionsList.some((s) => s.time === recentEndedBooking.time && isSessionToday(s, todayStr, todayFormatted)) ||
      Boolean(fieldCleaningStatus.cleanedBookingKey?.includes(recentEndedBooking.time))
    ) : true;
    const needsCleanAfterMatch = fieldCleaningStatus.status === "needs_clean" || (recentEndedBooking && !isEndedBookingCleaned);

    let urgencyLevel = "free"; // "urgent" | "ongoing" | "ready" | "free"
    let statusText = "Đã dọn sạch sẽ — Sẵn sàng đón khách";

    if (needsCleanAfterMatch) {
      urgencyLevel = "urgent";
      statusText = fieldCleaningStatus.cleaningReason === "urgent"
        ? "Cần dọn gấp (Quản lý đặt sân báo hoàn thành)"
        : `Ca ${recentEndedBooking?.time || ""} vừa kết thúc — Cần dọn dẹp!`;
    } else if (ongoingBooking) {
      urgencyLevel = "ongoing";
      statusText = `Đang diễn ra ca: ${ongoingBooking.time} • Khách: ${ongoingBooking.name}`;
    } else if (nextBooking) {
      urgencyLevel = "ready";
      statusText = `Sẵn sàng đón ca: ${nextBooking.time} • Khách: ${nextBooking.name}`;
    } else {
      urgencyLevel = "ready";
      statusText = "Đã dọn sạch sẽ — Sẵn sàng đón khách";
    }

    // Nút Đã dọn xong: CHỈ hiện khi ca đá hoàn thành cần dọn (needsCleanAfterMatch) hoặc đang dọn (in_progress).
    const showDoneButton = needsCleanAfterMatch || fieldCleaningStatus.status === "in_progress";

    return {
      ongoingBooking,
      isOngoing: Boolean(ongoingBooking),
      nextBooking,
      futureBookings,
      isNextBookingCleaned,
      hasActiveUncleanedBooking,
      recentEndedBooking,
      activeEndedBooking: needsCleanAfterMatch ? recentEndedBooking : null,
      hasEndedBookingToday,
      urgencyLevel,
      statusText,
      todayBookings: parsedBookings,
      todayFormatted,
      currentMins,
      needsCleanAfterMatch,
      isEndedBookingCleaned,
      showDoneButton,
    };
  };

  // Helper chuẩn hóa hiển thị tiêu đề ca không bị lặp chữ "Ca"
  const formatSessionTitle = (timeStr) => {
    const clean = String(timeStr || "").trim();
    if (!clean) return "Ca thi đấu";
    if (clean.toLowerCase().startsWith("ca ")) return clean;
    if (clean.toLowerCase().startsWith("ca")) return `Ca ${clean.slice(2).trim()}`;
    return `Ca ${clean}`;
  };

  // Helper lấy số phút bắt đầu của ca để sắp xếp từ sớm đến muộn
  const getSlotStartMinutes = (timeStr) => {
    if (!timeStr) return 9999;
    const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return 9999;
  };

  // Trích xuất danh sách các ca/nhiệm vụ đã dọn thành công trong ngày của sân
  const getFieldCleanedSessions = (field, currentEntry, schedule) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const todayFormatted = formatDateVN(todayStr);

    let list = [...(currentEntry?.cleanedSessions || [])];

    // Lọc bỏ triệt để các session ảo hoặc dữ liệu test cũ (như 'Ca gần nhất', 'done')
    // VÀ CHỈ LẤY CÁC CA ĐÃ DỌN TRONG NGÀY HIỆN TẠI HÔM ĐÓ
    list = list.filter((s) => s && s.time && s.time !== "Ca gần nhất" && s.time !== "done" && isSessionToday(s, todayStr, todayFormatted));

    // Lọc bỏ các ca thi đấu mà đơn đặt sân đã bị xóa khỏi Quản lý đặt sân
    const existingBookingTimes = new Set((schedule?.todayBookings || []).map((b) => b.time || `${b.start_time || ""} - ${b.end_time || ""}`));
    list = list.filter((s) => {
      if (s.type === "urgent") return true;
      return existingBookingTimes.has(s.time);
    });

    // Sắp xếp các khung giờ từ sớm hơn trước rồi đến muộn hơn
    list.sort((a, b) => {
      const minsA = getSlotStartMinutes(a.time);
      const minsB = getSlotStartMinutes(b.time);
      if (minsA !== minsB) {
        return minsA - minsB;
      }
      return (a.id || 0) - (b.id || 0);
    });

    return list;
  };

  const handleUpdateStatus = (fieldId, fieldName, newStatus) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    const todayFormatted = formatDateVN(todayStr);
    const currentEntry = cleaningStatus[fieldId] || cleaningStatus[fieldName] || {};
    const nowTimeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    const schedule = getFieldScheduleInfo({ id: fieldId, field_name: fieldName });

    let cleanedBookingKey = currentEntry.cleanedBookingKey || null;
    let statusText = "";
    let cleanedSessions = currentEntry.cleanedSessions || [];
    let sessionItem = null;

    if (newStatus === "clean") {
      // Xác định ca đá vừa hoàn tất dọn dẹp
      const targetMatch = schedule.recentEndedBooking || currentEntry.completedMatch || schedule.nextBooking;
      const slotTime = targetMatch?.time || currentEntry.completedMatch?.time || (schedule.nextBooking ? schedule.nextBooking.time : "Sau ca thi đấu");
      const targetName = targetMatch?.name || currentEntry.completedMatch?.name || (schedule.nextBooking ? schedule.nextBooking.name : "Khách đặt sân");
      const targetPhone = targetMatch?.phone || currentEntry.completedMatch?.phone || (schedule.nextBooking ? schedule.nextBooking.phone : "");
      const isUrgent = currentEntry.cleaningReason === "urgent" || currentEntry.status === "needs_clean";

      sessionItem = {
        id: Date.now(),
        time: slotTime,
        name: targetName,
        phone: targetPhone,
        date: targetMatch?.formattedDate || schedule.todayFormatted || todayFormatted,
        rawDate: todayStr,
        completedAt: nowTimeStr,
        type: isUrgent ? "urgent" : "match",
        reportedBy: currentEntry.reportedBy || currentEntry.cleanerName || "Quản lý đặt sân",
        reason: currentEntry.notes || currentEntry.status_text || currentEntry.completedMatch?.reason || (isUrgent ? "Báo dọn khẩn cấp" : "Dọn dẹp hoàn tất ca đá"),
      };
      cleanedBookingKey = slotTime;

      cleanedSessions = [
        sessionItem,
        ...cleanedSessions.filter((s) => s.time !== slotTime && isSessionToday(s, todayStr, todayFormatted)),
      ];
      statusText = `Đã dọn xong lúc ${nowTimeStr}`;

      // Ghi nhận vào Lịch sử thống kê ca dọn (pitch_cleaning_history)
      const newHistoryItem = {
        id: `cl_${Date.now()}`,
        fieldName: fieldName,
        fieldType: schedule.nextBooking?.field_type || "Sân cỏ nhân tạo",
        date: todayStr,
        slotTime: sessionItem?.time || schedule.nextBooking?.time || "Ca vừa xong",
        completedAt: nowTimeStr,
        cleanerName: "Nhân viên dọn dẹp",
        type: isUrgent ? "urgent" : "match",
        reportedBy: currentEntry.reportedBy || "Quản lý đặt sân",
        reason: currentEntry.notes || (isUrgent ? "Quản lý đặt sân báo khẩn cấp" : "Ca đá hoàn thành"),
        notes: "Đã hoàn tất checklist tiêu chuẩn vệ sinh, sân sẵn sàng đón khách.",
        lostItemReported: false,
      };
      const updatedHistory = [newHistoryItem, ...cleaningHistory];
      setCleaningHistory(updatedHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } else if (newStatus === "needs_clean") {
      cleanedBookingKey = null;
      statusText = "Báo sân cần dọn dẹp";
    }

    const updated = {
      ...cleaningStatus,
      [fieldId]: {
        ...currentEntry,
        status: newStatus,
        cleaningReason: newStatus === "clean" ? null : currentEntry.cleaningReason,
        cleanedBookingKey,
        cleanedSessions,
        isCleanedToday: newStatus === "clean" ? true : currentEntry.isCleanedToday,
        completedAt: newStatus === "clean" ? nowTimeStr : currentEntry.completedAt,
        lastCleaned: newStatus === "clean" ? `Đã dọn xong lúc ${nowTimeStr}` : `Cần dọn dẹp`,
      },
    };
    if (fieldName && fieldName !== fieldId && updated[fieldName]) {
      delete updated[fieldName];
    }
    setCleaningStatus(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (newStatus === "clean") {
      broadcastSyncEvent("pitch_cleaned", {
        fieldId,
        fieldName,
        time: sessionItem?.time || schedule.nextBooking?.time,
      });
    }

    const newLog = {
      id: Date.now(),
      fieldName: fieldName,
      time: nowTimeStr,
      statusText: statusText,
      cleaner: "Nhân viên vệ sinh",
    };
    const updatedLogs = [newLog, ...cleaningLogs.slice(0, 9)];
    setCleaningLogs(updatedLogs);
    localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));

    // Đồng bộ vào cơ sở dữ liệu backend facility
    try {
      createCleaningLog({
        field: typeof fieldId === "string" && fieldId.includes("-") ? fieldId : null,
        field_name: fieldName,
        booking: schedule.nextBooking?.id || schedule.recentEndedBooking?.id || null,
        status: newStatus,
        status_text: statusText,
        cleaner_name: "Nhân viên vệ sinh",
        cleaned_match_time: sessionItem?.time || schedule.nextBooking?.time || "",
        cleaned_match_customer: sessionItem?.name || schedule.nextBooking?.name || "",
        start_time: currentEntry.reportedTime || currentEntry.start_time || nowTimeStr,
        end_time: nowTimeStr,
        notes: sessionItem?.reason || "Đã dọn sạch sẽ",
      }).catch(() => { });
    } catch { }

    showToast(`Đã cập nhật ${fieldName}: ${statusText}`, "success");
    broadcastSyncEvent("cleaning_status_changed", { fieldId, fieldName, status: newStatus });
  };

  // Mở modal Báo hỏng cho kỹ thuật
  const openReportModal = (field) => {
    setReportingField(field);
    setIssueData({
      category: "Lưới khung thành & Cột",
      priority: "Khẩn cấp",
      description: "",
      estimatedCost: "",
    });
    setShowReportModal(true);
  };

  // Gửi báo hỏng sang module Bảo trì
  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!issueData.description.trim()) {
      showToast("Vui lòng mô tả chi tiết hư hỏng", "warning");
      return;
    }

    try {
      const savedIssues = localStorage.getItem(ISSUES_KEY);
      const issueList = savedIssues ? JSON.parse(savedIssues) : [];

      const estCost = parseFloat(issueData.estimatedCost) || 0;
      const newIssueItem = {
        id: Date.now(),
        field: reportingField?.id || null,
        fieldName: reportingField?.field_name || "Sân bóng",
        category: issueData.category,
        description: issueData.description,
        priority: issueData.priority,
        status: "pending",
        reportedBy: "Nhân viên dọn dẹp vệ sinh (sau ca)",
        estimatedCost: estCost,
        cost: 0,
        createdAt: `Hôm nay, ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
      };

      const updated = [newIssueItem, ...issueList];
      localStorage.setItem(ISSUES_KEY, JSON.stringify(updated));
      broadcastSyncEvent("maintenance_issue_reported", newIssueItem);

      // Lưu vào database backend facility
      try {
        createMaintenanceIssue({
          field: reportingField?.id || null,
          field_name: newIssueItem.fieldName,
          category: newIssueItem.category,
          description: newIssueItem.description,
          priority: newIssueItem.priority,
          status: "pending",
          reported_by_name: newIssueItem.reportedBy,
          estimated_cost: estCost,
          cost: 0,
        }).then((res) => {
          if (res.data?.id) {
            newIssueItem.id = res.data.id;
            const synced = [newIssueItem, ...issueList];
            localStorage.setItem(ISSUES_KEY, JSON.stringify(synced));
          }
        }).catch(() => { });
      } catch { }

      setShowReportModal(false);
      showToast(`Đã gửi báo cáo sự cố của ${reportingField?.field_name} sang cho bộ phận Kỹ thuật!`, "success");
    } catch {
      showToast("Lỗi khi gửi báo cáo sự cố", "error");
    }
  };

  // Mở modal Báo đồ thất lạc
  const openLostModal = (field) => {
    setReportingLostField(field);
    const schedule = getFieldScheduleInfo(field);
    const lastGuest = schedule.recentEndedBooking?.name
      ? `Khách: ${schedule.recentEndedBooking.name} (${schedule.recentEndedBooking.time || "Ca gần nhất"})`
      : "Khách ca gần nhất";
    const guestPhone = schedule.recentEndedBooking?.phone || "";
    const bDate = schedule.recentEndedBooking?.date
      ? String(schedule.recentEndedBooking.date).slice(0, 10)
      : new Date().toLocaleDateString("en-CA");
    setLostItemData({
      itemType: "Áo khoác / Trang phục thi đấu",
      location: "Băng ghế chờ khán đài",
      description: "",
      guestInfo: lastGuest,
      customerPhone: guestPhone,
      bookingDate: bDate,
    });
    setShowLostModal(true);
  };

  // Gửi lưu đồ thất lạc
  const handleSubmitLostItem = (e) => {
    e.preventDefault();
    if (!lostItemData.description.trim()) {
      showToast("Vui lòng nhập mô tả món đồ nhặt được", "warning");
      return;
    }

    try {
      const savedLost = localStorage.getItem(LOST_KEY);
      const list = savedLost ? JSON.parse(savedLost) : [];

      const newItem = {
        id: Date.now(),
        fieldName: reportingLostField?.field_name || "Sân bóng",
        itemType: lostItemData.itemType,
        location: lostItemData.location,
        description: lostItemData.description,
        guestInfo: lostItemData.guestInfo || "Chưa rõ",
        customerPhone: lostItemData.customerPhone || "",
        bookingDate: lostItemData.bookingDate || new Date().toLocaleDateString("en-CA"),
        status: "pending",
        time: `${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} Hôm nay`,
        reportedBy: "Nhân viên dọn dẹp",
      };

      const updated = [newItem, ...list];
      setLostFoundItems(updated);
      localStorage.setItem(LOST_KEY, JSON.stringify(updated));

      // Lưu vào database backend facility
      try {
        createLostFoundItem({
          field_name: newItem.fieldName,
          item_type: newItem.itemType,
          location: newItem.location,
          description: newItem.description,
          guest_info: newItem.guestInfo,
          customer_phone: newItem.customerPhone,
          booking_date: newItem.bookingDate,
          status: "pending",
          reported_by: newItem.reportedBy,
          time: newItem.time,
        }).catch(() => { });
      } catch { }

      broadcastSyncEvent("lost_item_reported", newItem);
      setShowLostModal(false);
      showToast(`Đã lưu đồ bỏ quên tại ${reportingLostField?.field_name}! Lễ tân và Quản lý đã nhận thông báo.`, "success");
    } catch {
      showToast("Lỗi khi lưu đồ thất lạc", "error");
    }
  };

  // Cập nhật trạng thái đồ thất lạc (Chưa nhận / Đã trả)
  const handleToggleReturnLostItem = (id) => {
    let nextStatus = "returned";
    let nextReturnedAt = null;
    const updated = lostFoundItems.map((item) => {
      if (item.id === id) {
        nextStatus = item.status === "returned" ? "pending" : "returned";
        nextReturnedAt = nextStatus === "returned" ? new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) + " hôm nay" : null;
        return {
          ...item,
          status: nextStatus,
          returnedAt: nextReturnedAt,
        };
      }
      return item;
    });
    setLostFoundItems(updated);
    localStorage.setItem(LOST_KEY, JSON.stringify(updated));

    // Cập nhật database backend facility
    try {
      updateLostFoundItem(id, {
        status: nextStatus,
        returned_at: nextReturnedAt,
      }).catch(() => {});
    } catch {}

    showToast("Đã cập nhật trạng thái đồ thất lạc", "success");
  };

  const isFieldCleanedToday = (field) => {
    const s = cleaningStatus[field.id] || cleaningStatus[field.field_name];
    return !s || s.status === "clean";
  };

  const cleanCount = fields.filter((f) => {
    const s = cleaningStatus[f.id] || cleaningStatus[f.field_name];
    return !s || s.status === "clean";
  }).length;

  const inProgressCount = fields.filter((f) => {
    const s = cleaningStatus[f.id] || cleaningStatus[f.field_name];
    return s?.status === "in_progress";
  }).length;

  const needsCleanCount = fields.filter((f) => {
    const s = cleaningStatus[f.id] || cleaningStatus[f.field_name];
    return s?.status === "needs_clean";
  }).length;

  // Đếm số ca/sân đã hoàn tất dọn dẹp hôm nay
  const cleanedMatchesTodayCount = fields.reduce((acc, f) => {
    const s = cleaningStatus[f.id] || cleaningStatus[f.field_name];
    const sched = getFieldScheduleInfo(f);
    const isFldClean = !s?.status || s.status === "clean";
    if (isFldClean && (s?.completedAt || s?.cleanedBookingKey || sched.hasEndedBookingToday)) {
      return acc + 1;
    }
    return acc;
  }, 0);

  const urgentCount = needsCleanCount;
  const pendingLostCount = lostFoundItems.filter((i) => i.status === "pending").length;

  // Lọc sân theo search query và activeTab
  const filteredFields = fields.filter((f) => {
    const matchesSearch = (f.field_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const s = cleaningStatus[f.id] || cleaningStatus[f.field_name];
    const status = s?.status || "clean";

    if (activeTab === "all") return true;
    if (activeTab === "urgent") return status === "needs_clean";
    return true;
  });

  return (
    <>
      <AdminSidebar />
      <TopHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} onRefresh={reloadLocalStatus} />

      <main className="main-content admin-dashboard-main">
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        <div className="content-area">
          {/* Header Trang */}
          <div className="page-heading">
            <div className="page-heading-copy">
              <span className="dashboard-eyebrow">
                VẬN HÀNH CƠ SỞ <span>›</span> VỆ SINH &amp; DỌN DẸP SÂN
              </span>
              <h2>Quản lý Vệ sinh Sân bãi</h2>
              <p>Theo dõi tình trạng sạch sẽ của các sân sau ca đá, dọn rác, thu gom bóng và báo hỏng thiết bị.</p>
            </div>
            <div className="dashboard-heading-actions">
              <span className="dashboard-date">
                <span className="material-symbols-outlined">calendar_today</span>
                Ngày: {new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* 3 Ô chỉ số tổng quan vệ sinh sân (Đồng bộ kiểu dáng với trang Bảo trì sân) */}
          <div className="maintenance-kpi-grid">
            <div className="kpi-stat-box box-green">
              <div className="kpi-stat-info">
                <span className="kpi-stat-label">Sân sạch sẽ</span>
                <span className="kpi-stat-number">{cleanCount} / {fields.length} sân</span>
                <span className="kpi-stat-sub">Sẵn sàng đón khách thi đấu</span>
              </div>
              <div className="kpi-stat-icon-wrap bg-green">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
            </div>

            <div className="kpi-stat-box box-blue">
              <div className="kpi-stat-info">
                <span className="kpi-stat-label">Ca đã dọn trong ngày</span>
                <span className="kpi-stat-number">{cleanedMatchesTodayCount} ca</span>
                <span className="kpi-stat-sub">Đã hoàn thành vệ sinh</span>
              </div>
              <div className="kpi-stat-icon-wrap bg-blue">
                <span className="material-symbols-outlined">task_alt</span>
              </div>
            </div>

            <div className="kpi-stat-box box-red">
              <div className="kpi-stat-info">
                <span className="kpi-stat-label">Chờ dọn sau ca</span>
                <span className="kpi-stat-number">{needsCleanCount} sân</span>
                <span className="kpi-stat-sub">Cần nhân viên dọn dẹp ngay</span>
              </div>
              <div className="kpi-stat-icon-wrap bg-red">
                <span className="material-symbols-outlined">priority_high</span>
              </div>
            </div>
          </div>

          {/* ── BỘ TABS LỌC NHANH TRẠNG THÁI (ĐÃ BỎ TAB ĐANG DỌN & SÂN ĐÃ DỌN) ── */}
          <div className="cleaning-tabs-bar">
            <button
              type="button"
              className={`cleaning-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              Tất cả sân
              <span className="tab-pill">{fields.length}</span>
            </button>

            <button
              type="button"
              className={`cleaning-tab-btn tab-urgent ${activeTab === "urgent" ? "active" : ""}`}
              onClick={() => setActiveTab("urgent")}
            >
              <span className="material-symbols-outlined">priority_high</span>
              Cần dọn gấp
              {urgentCount > 0 && <span className="tab-pill pill-red">{urgentCount}</span>}
            </button>

            <button
              type="button"
              className={`cleaning-tab-btn tab-lost ${activeTab === "lost_found" ? "active" : ""}`}
              onClick={() => setActiveTab("lost_found")}
            >
              <span className="material-symbols-outlined">luggage</span>
              Đồ khách bỏ quên
              {pendingLostCount > 0 && <span className="tab-pill pill-amber">{pendingLostCount}</span>}
            </button>

            <button
              type="button"
              className={`cleaning-tab-btn tab-stats ${activeTab === "stats" ? "active" : ""}`}
              onClick={() => setActiveTab("stats")}
            >
              <span className="material-symbols-outlined">insights</span>
              Thống kê ca dọn
            </button>
          </div>

          {/* ── NẾU CHỌN TAB THỐNG KÊ CA DỌN ── */}
          {activeTab === "stats" ? (
            <CleaningStatsPanel
              fields={fields}
              bookings={bookings}
              cleaningStatus={cleaningStatus}
              cleaningHistory={cleaningHistory}
              lostFoundItems={lostFoundItems}
              statsRange={statsRange}
              setStatsRange={setStatsRange}
              statsFieldFilter={statsFieldFilter}
              setStatsFieldFilter={setStatsFieldFilter}
            />
          ) : activeTab === "lost_found" ? (
            <LostFoundBookingPanel
              lostItems={lostFoundItems}
              readOnly={true}
              onAddNewItem={() => openLostModal(fields[0] || null)}
              subtitle="Ghi nhận từ nhân viên dọn dẹp sau ca đá và chuyển tiếp cho quầy Lễ tân bàn giao khách"
            />
          ) : (
            /* ── DANH SÁCH SÂN VỆ SINH ── */
            <div className="cleaning-board-card">
              <div className="cleaning-board-header">
                <div>
                  <h3 className="chart-title">
                    {activeTab === "urgent"
                      ? "Danh sách sân cần dọn dẹp gấp"
                      : "Danh sách sân & Trạng thái vệ sinh"}
                  </h3>
                  <p className="chart-subtitle">
                    Tự động nhận thông báo khi có ca đá kết thúc để kịp thời dọn dẹp
                  </p>
                </div>
                <span className="cleaning-count-pill">{filteredFields.length} sân</span>
              </div>

              <div className="cleaning-cards-grid">
                {filteredFields.length === 0 ? (
                  <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", color: "#cbd5e1", marginBottom: "0.5rem", display: "block" }}>
                      sports_soccer
                    </span>
                    <p style={{ fontWeight: 600, fontSize: "0.95rem", margin: 0 }}>
                      Không có sân bóng nào phù hợp với bộ lọc
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setActiveTab("all");
                      }}
                      style={{ marginTop: "0.75rem", background: "none", border: "none", color: "#059669", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                    >
                      Đặt lại bộ lọc
                    </button>
                  </div>
                ) : (
                  filteredFields.map((field) => {
                    const current = cleaningStatus[field.id] || cleaningStatus[field.field_name] || { status: "clean" };
                    const isInProgress = current.status === "in_progress";
                    const schedule = getFieldScheduleInfo(field);

                    const durationCurrent = current.startTimeMs
                      ? Math.max(1, Math.round((nowTick - current.startTimeMs) / 60000))
                      : 1;
                    const fieldCleanedSessions = getFieldCleanedSessions(field, current, schedule);
                    const showDoneButton = schedule.showDoneButton;
                    const isFieldNeedClean = current.status === "needs_clean" || schedule.needsCleanAfterMatch;
                    const isClean = !isFieldNeedClean && current.status !== "in_progress";
                    const hasCleanedSession = fieldCleanedSessions.length > 0 || Boolean(current.cleanedBookingKey) || Boolean(current.isCleanedToday);
                    const showLostButtonOnPitch = !showDoneButton && hasCleanedSession;

                    return (
                      <div key={field.id} className={`cleaning-item-card status-${isFieldNeedClean ? "needs_clean" : schedule.isOngoing ? "ongoing" : current.status}`}>
                        {/* Ô 1: Header của thẻ sân - Đồng bộ kiểu dáng với trang Bảo trì sân */}
                        <div className="pitch-card-top">
                          <div className="pitch-card-title-group">
                            <span
                              className="material-symbols-outlined pitch-card-icon"
                              style={{
                                color: isFieldNeedClean ? "#ef4444" : isInProgress ? "#d97706" : schedule.isOngoing ? "#2563eb" : "#059669",
                                background: isFieldNeedClean ? "#fef2f2" : isInProgress ? "#fffbeb" : schedule.isOngoing ? "#eff6ff" : "#ecfdf5",
                              }}
                            >
                              {isFieldNeedClean ? "warning" : isInProgress ? "cleaning_services" : schedule.isOngoing ? "sports_soccer" : "sports_soccer"}
                            </span>
                            <div className="pitch-card-title-wrap">
                              <h4 className="pitch-card-name">{field.field_name}</h4>
                              <span className="pitch-card-sub">{field.field_type || "Sân cỏ nhân tạo"}</span>
                            </div>
                          </div>
                          <span
                            className={`cleaning-status-badge ${
                              isFieldNeedClean
                                ? "badge-needs_clean"
                                : isInProgress
                                ? "badge-in_progress"
                                : schedule.isOngoing
                                ? "badge-ongoing"
                                : "badge-clean"
                            }`}
                          >
                            {isFieldNeedClean
                              ? "Cần dọn dẹp"
                              : isInProgress
                              ? "Đang dọn"
                              : schedule.isOngoing
                              ? "Đang thi đấu"
                              : "Sạch sẽ"}
                          </span>
                        </div>

                        {/* Ô 2: Khối Tình trạng ca đá & Vệ sinh riêng biệt (Đúng giờ thực tế hiện tại) */}
                        <div className={`cleaning-facility-box ${isFieldNeedClean ? "box-needs-clean" : schedule.isOngoing ? "box-ongoing" : isInProgress ? "box-in-progress" : "box-clean"}`}>
                          {isFieldNeedClean ? (
                            <>
                              <div className="facility-box-label label-urgent">
                                <span className="material-symbols-outlined">warning</span>
                                <span>Cần vệ sinh sau ca đá:</span>
                              </div>
                              <div className="facility-box-value value-urgent">
                                <span>{schedule.recentEndedBooking?.time ? `Ca ${schedule.recentEndedBooking.time}` : "Ca vừa kết thúc"} • Cần dọn rác &amp; kiểm tra mặt sân</span>
                              </div>
                            </>
                          ) : isInProgress ? (
                            <>
                              <div className="facility-box-label label-warning">
                                <span className="material-symbols-outlined">cleaning_services</span>
                                <span>Nhân viên đang dọn dẹp:</span>
                              </div>
                              <div className="facility-box-value value-warning">
                                <span>Đang tiến hành dọn dẹp ({durationCurrent} phút)</span>
                              </div>
                            </>
                          ) : schedule.isOngoing ? (
                            <>
                              <div className="facility-box-label label-ongoing">
                                <span className="material-symbols-outlined">sports_soccer</span>
                                <span>Trận đấu đang diễn ra:</span>
                                <span className="tag-ongoing-countdown">Còn {schedule.ongoingBooking.remainingOngoingMins}p</span>
                              </div>
                              <div className="facility-box-value value-ongoing">
                                <span>Ca {schedule.ongoingBooking.time} • Khách: <strong>{schedule.ongoingBooking.name}</strong></span>
                              </div>
                            </>
                          ) : schedule.nextBooking ? (
                            <>
                              <div className="facility-box-label label-upcoming">
                                <span className="material-symbols-outlined">schedule</span>
                                <span>Ca thi đấu tiếp theo:</span>
                                <span className="tag-upcoming-countdown">Sau {schedule.nextBooking.minutesLeft}p</span>
                              </div>
                              <div className="facility-box-value value-upcoming">
                                <span>Ca {schedule.nextBooking.time} • Khách: <strong>{schedule.nextBooking.name}</strong></span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="facility-box-label label-good">
                                <span className="material-symbols-outlined">verified</span>
                                <span>Tình trạng sân:</span>
                              </div>
                              <div className="facility-box-value value-good">
                                <span>Đạt chuẩn sạch sẽ — Sẵn sàng đón khách</span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Ô 3: Thanh công cụ các nút bấm thao tác riêng biệt */}
                        <div className="pitch-actions-toolbar">
                          {/* Nút 1: Xem chi tiết */}
                          <button
                            type="button"
                            className="btn-pitch-action btn-pitch-detail"
                            title="Xem chi tiết lịch thi đấu, checklist và thông tin sân"
                            onClick={() => openDetailModal(field)}
                          >
                            <span className="material-symbols-outlined">visibility</span>
                            <span>Xem chi tiết</span>
                          </button>

                          {/* Nút 2: Đã dọn xong (khi cần dọn dẹp) */}
                          {showDoneButton && (
                            <button
                              type="button"
                              className="btn-pitch-action btn-pitch-done"
                              onClick={() => handleUpdateStatus(field.id, field.field_name, "clean")}
                              title="Xác nhận đã dọn dẹp xong sân bóng"
                            >
                              <span className="material-symbols-outlined">check_circle</span>
                              <span>Đã dọn xong</span>
                            </button>
                          )}

                          {/* Nút 3: Đồ quên */}
                          {showLostButtonOnPitch && (
                            <button
                              type="button"
                              className="btn-pitch-action btn-pitch-lost"
                              title="Ghi nhận đồ đạc khách để quên sau ca đá"
                              onClick={() => openLostModal(field)}
                            >
                              <span className="material-symbols-outlined">luggage</span>
                              <span>Đồ quên</span>
                            </button>
                          )}

                          {/* Nút 4: Báo hỏng sân sang kỹ thuật */}
                          <button
                            type="button"
                            className="btn-pitch-action btn-pitch-issue"
                            title="Báo cáo hỏng hóc cơ sở vật chất sân cho Kỹ thuật"
                            onClick={() => openReportModal(field)}
                          >
                            <span className="material-symbols-outlined">handyman</span>
                            <span>Báo hỏng</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Nhật ký dọn dẹp gần nhất */}
          <div className="bookings-card">
            <div className="bookings-header">
              <h3>Nhật ký vệ sinh sân hôm nay</h3>
              <span className="dashboard-date">Ghi nhận tự động</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Sân bóng</th>
                    <th>Công việc / Trạng thái</th>
                    <th className="text-right">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {cleaningLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "#94a3b8", padding: "1.5rem" }}>
                        Chưa có lượt dọn dẹp nào được ghi nhận hôm nay
                      </td>
                    </tr>
                  ) : (
                    cleaningLogs.map((log) => (
                      <tr key={log.id}>
                        <td><span className="booking-time">{log.time}</span></td>
                        <td><strong className="field-name">{log.fieldName}</strong></td>
                        <td>
                          <span className="badge confirmed">
                            <span className="badge-dot" />
                            {log.statusText}
                          </span>
                        </td>
                        <td className="text-right"><span className="customer-name">{log.cleaner}</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* Modal Báo hỏng cho Kỹ thuật từ Cleaner */}
      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="material-symbols-outlined" style={{ color: "#d97706" }}>handyman</span>
                <h3 style={{ margin: 0 }}>Báo hỏng thiết bị cho Kỹ thuật</h3>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setShowReportModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitReport}>
              <div className="modal-body-form">
                <div className="form-group">
                  <label>Sân bóng phát hiện sự cố</label>
                  <input
                    type="text"
                    className="form-input"
                    value={reportingField?.field_name || ""}
                    disabled
                    style={{ background: "#f1f5f9", fontWeight: 700 }}
                  />
                </div>

                <div className="form-group">
                  <label>Hạng mục hư hỏng phát hiện khi dọn dẹp</label>
                  <select
                    className="form-input"
                    value={issueData.category}
                    onChange={(e) => setIssueData({ ...issueData, category: e.target.value })}
                  >
                    <option value="Lưới khung thành & Cột">Lưới khung thành (rách lưới, đứt dây neo)</option>
                    <option value="Đèn chiếu sáng cao áp">Đèn chiếu sáng (cháy bóng, chập chờn)</option>
                    <option value="Mặt cỏ nhân tạo">Mặt cỏ nhân tạo (bong keo, lún cát/cao su)</option>
                    <option value="Hệ thống thoát nước">Hệ thống thoát nước / Rãnh biên</option>
                    <option value="Khác (Ghế chờ, cửa ra vào)">Khác (Ghế chờ hỏng, cửa rào)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mức độ khẩn cấp</label>
                  <select
                    className="form-input"
                    value={issueData.priority}
                    onChange={(e) => setIssueData({ ...issueData, priority: e.target.value })}
                  >
                    <option value="Khẩn cấp">Khẩn cấp (Cần sửa ngay trước ca sau)</option>
                    <option value="Bình thường">Bình thường (Có thể sửa trong ngày)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Mô tả chi tiết vị trí hỏng</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Ví dụ: Khung thành bên phải bị rách góc dưới, bóng dễ lọt ra ngoài..."
                    value={issueData.description}
                    onChange={(e) => setIssueData({ ...issueData, description: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowReportModal(false)}>Hủy</button>
                <button type="submit" className="btn-save" style={{ background: "#d97706" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", verticalAlign: "middle", marginRight: "4px" }}>send</span>
                  Gửi cho Kỹ thuật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Báo đồ khách bỏ quên (Lost & Found) */}
      {showLostModal && (
        <div className="modal-overlay" onClick={() => setShowLostModal(false)}>
          <div className="modal-content-box modal-lost-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div style={{ width: "2.4rem", height: "2.4rem", borderRadius: "8px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ color: "#0284c7", fontSize: "1.35rem" }}>luggage</span>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Ghi nhận đồ khách bỏ quên</h3>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Nhân viên dọn dẹp ghi nhận để chuyển Lễ tân liên hệ khách</span>
                </div>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setShowLostModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitLostItem}>
              <div className="modal-body-form modal-body-lost-form">
                <div className="lost-form-grid">
                  <div className="form-group">
                    <label>Sân bóng phát hiện</label>
                    <input
                      type="text"
                      className="form-input"
                      value={reportingLostField?.field_name || (fields[0]?.field_name || "Sân bóng")}
                      disabled
                      style={{ background: "#f1f5f9", fontWeight: 700 }}
                    />
                  </div>

                  <div className="form-group">
                    <label>Loại đồ đạc nhặt được</label>
                    <select
                      className="form-input"
                      value={lostItemData.itemType}
                      onChange={(e) => setLostItemData({ ...lostItemData, itemType: e.target.value })}
                    >
                      <option value="Áo khoác / Trang phục thi đấu">Áo khoác / Trang phục thi đấu</option>
                      <option value="Ví tiền / Giấy tờ tùy thân">Ví tiền / Giấy tờ tùy thân</option>
                      <option value="Chìa khóa (xe, nhà)">Chìa khóa (xe, nhà)</option>
                      <option value="Bình giữ nhiệt / Chai nước cá nhân">Bình giữ nhiệt / Chai nước cá nhân</option>
                      <option value="Giày / Tất / Bọc ống đồng">Giày / Tất / Bọc ống đồng</option>
                      <option value="Điện thoại / Thiết bị điện tử">Điện thoại / Thiết bị điện tử</option>
                      <option value="Khác">Đồ dùng khác</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Vị trí phát hiện</label>
                    <select
                      className="form-input"
                      value={lostItemData.location}
                      onChange={(e) => setLostItemData({ ...lostItemData, location: e.target.value })}
                    >
                      <option value="Băng ghế chờ khán đài">Băng ghế chờ khán đài</option>
                      <option value="Khu vực khung thành">Khu vực khung thành</option>
                      <option value="Giữa sân / Góc sân">Giữa sân / Góc sân</option>
                      <option value="Khu vực thay đồ / Nhà vệ sinh">Khu vực thay đồ / Nhà vệ sinh</option>
                      <option value="Bãi đỗ xe">Bãi đỗ xe</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Ngày phát hiện</label>
                    <input
                      type="date"
                      className="form-input"
                      value={lostItemData.bookingDate || ""}
                      onChange={(e) => setLostItemData({ ...lostItemData, bookingDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Mô tả chi tiết nhận dạng <span style={{ color: "#ef4444" }}>*</span></label>
                  <textarea
                    className="form-input"
                    rows="2"
                    placeholder="Ví dụ: Áo khoác nỉ Nike màu xám đen, có chìa khóa xe trong túi áo..."
                    value={lostItemData.description}
                    onChange={(e) => setLostItemData({ ...lostItemData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="lost-form-grid">
                  <div className="form-group">
                    <label>Thông tin ca đá / Khách nghi vấn</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ví dụ: Khách vừa đá ca 19:00 - 20:00..."
                      value={lostItemData.guestInfo}
                      onChange={(e) => setLostItemData({ ...lostItemData, guestInfo: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Số điện thoại khách (nếu biết)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ví dụ: 0912 345 678..."
                      value={lostItemData.customerPhone || ""}
                      onChange={(e) => setLostItemData({ ...lostItemData, customerPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: "0.85rem 1.5rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                <button type="button" className="btn-cancel" onClick={() => setShowLostModal(false)}>Hủy</button>
                <button type="submit" className="btn-save" style={{ background: "#0284c7", color: "#fff" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem", verticalAlign: "middle", marginRight: "4px" }}>save</span>
                  Lưu &amp; Báo cho Lễ tân
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết cho Role Nhân viên Dọn dẹp */}
      {showDetailModal && detailField && (() => {
        const current = cleaningStatus[detailField.id] || cleaningStatus[detailField.field_name] || { status: "clean" };
        const schedule = getFieldScheduleInfo(detailField);
        const isFieldNeedClean = current.status === "needs_clean" || schedule.needsCleanAfterMatch;
        const isClean = !isFieldNeedClean && current.status !== "in_progress";
        const isInProgress = current.status === "in_progress";
        const durationCurrent = current.startTimeMs
          ? Math.max(1, Math.round((nowTick - current.startTimeMs) / 60000))
          : 1;

        // Trích xuất các ca đã hoàn tất dọn dẹp hôm nay của sân này
        const detailCleanedSessions = getFieldCleanedSessions(detailField, current, schedule);
        const showDetailDoneButton = schedule.showDoneButton;

        return (
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
            <div className="modal-content-box modal-detail-box" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div className="detail-header-icon-box">
                    <span className="material-symbols-outlined" style={{ color: "#059669", fontSize: "1.5rem" }}>
                      cleaning_services
                    </span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.55rem" }}>
                      {detailField.field_name}
                      <span
                        className={`cleaning-status-badge ${isFieldNeedClean ? "badge-needs_clean" : isClean ? "badge-clean" : "badge-in_progress"}`}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.2rem 0.65rem",
                          ...(isFieldNeedClean ? { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontWeight: 700 } : {}),
                        }}
                      >
                        {isFieldNeedClean ? "Cần dọn gấp" : isInProgress ? "Đang dọn" : "Sạch sẽ"}
                      </span>
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {detailField.field_type || "Sân cỏ nhân tạo"} • {isFieldNeedClean ? "Ca vừa kết thúc, cần dọn gấp" : isClean ? "Sân sạch sẽ, sẵn sàng đón khách" : `Đang dọn dẹp (từ ${current.startTime || ""})`}
                    </span>
                  </div>
                </div>
                <button type="button" className="btn-modal-close" onClick={() => setShowDetailModal(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="modal-body-detail">
                {/* 1. Form tổng quan ở trên: Chỉ hiển thị Ngày đặt */}
                <div className="detail-top-overview-bar">
                  <div className="detail-overview-item">
                    <span className="overview-label">
                      <span className="material-symbols-outlined">calendar_today</span>
                      Ngày đặt:
                    </span>
                    <strong className="overview-val">{schedule.todayFormatted || new Date().toLocaleDateString("vi-VN")}</strong>
                  </div>
                </div>

                {/* 2. Hai ô song song: Ô trái là Ca thi đấu tiếp theo / Ca vừa kết thúc, Ô phải là Thông tin các ca đã dọn xong */}
                <div className="detail-cards-grid">
                  {/* Ô BÊN TRÁI: Ca thi đấu tiếp theo hoặc Ca vừa hoàn thành cần dọn */}
                  <div className={`detail-match-card next-match ${isFieldNeedClean ? "urgency-urgent" : schedule.nextBooking ? "urgency-ready" : "is-empty"}`}>
                    <div className="detail-card-head">
                      <span className="material-symbols-outlined">{isFieldNeedClean ? "warning" : "alarm"}</span>
                      <span>{isFieldNeedClean ? "Ca thi đấu vừa kết thúc (Cần dọn)" : "Ca thi đấu tiếp theo"}</span>
                    </div>
                    {isFieldNeedClean ? (
                      <div className="detail-card-main">
                        <div className="detail-match-slot">
                          {schedule.recentEndedBooking?.time || current.completedMatch?.time || "Hoàn thành"}
                        </div>

                        <div className="detail-countdown-pill" style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}>
                          <span className="material-symbols-outlined" style={{ color: "#dc2626" }}>cleaning_services</span>
                          <span><strong>Cần dọn dẹp mặt sân &amp; thu gom rác</strong></span>
                        </div>

                        <div className="detail-customer-box">
                          <span className="material-symbols-outlined">person</span>
                          <span className="guest-name">{schedule.recentEndedBooking?.name || current.completedMatch?.name || "Khách đặt sân"}</span>
                          {(schedule.recentEndedBooking?.phone || current.completedMatch?.phone) && (
                            <a href={`tel:${schedule.recentEndedBooking?.phone || current.completedMatch?.phone}`} className="guest-phone-link" title="Gọi khách">
                              <span className="material-symbols-outlined">call</span>
                              {schedule.recentEndedBooking?.phone || current.completedMatch?.phone}
                            </a>
                          )}
                        </div>

                        {schedule.nextBooking && (
                          <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#475569" }}>
                            Ca kế tiếp hôm nay: <strong>{schedule.nextBooking.time}</strong> ({schedule.nextBooking.name || "Khách"})
                          </div>
                        )}
                      </div>
                    ) : schedule.nextBooking ? (
                      <div className="detail-card-main">
                        <div className="detail-match-slot">
                          {schedule.nextBooking.time}
                        </div>

                        <div className="detail-countdown-pill" style={{ background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" }}>
                          <span className="material-symbols-outlined" style={{ color: "#16a34a" }}>check_circle</span>
                          <span><strong>Đã dọn sạch sẽ</strong> {schedule.nextBooking.minutesLeft > 0 ? `(Còn ${schedule.nextBooking.minutesLeft} phút nữa vào sân)` : "(Sẵn sàng đón ca này)"}</span>
                        </div>

                        <div className="detail-customer-box">
                          <span className="material-symbols-outlined">person</span>
                          <span className="guest-name">{schedule.nextBooking.name || "Khách đặt sân"}</span>
                          {schedule.nextBooking.phone && (
                            <a href={`tel:${schedule.nextBooking.phone}`} className="guest-phone-link" title="Gọi khách">
                              <span className="material-symbols-outlined">call</span>
                              {schedule.nextBooking.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="detail-clean-ready-box">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#059669", marginBottom: "0.35rem" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "1.6rem" }}>check_circle</span>
                          <strong style={{ fontSize: "1.05rem" }}>Hôm nay không còn ca nào</strong>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#475569", lineHeight: 1.4 }}>
                          Sân đã dọn dẹp sạch sẽ, sẵn sàng đón khách hoặc nhận ca mới.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Ô BÊN PHẢI: Thông tin các ca đã dọn xong */}
                  <div className="detail-match-card cleaned-history-card">
                    <div className="detail-card-head">
                      <span className="material-symbols-outlined" style={{ color: "#059669" }}>task_alt</span>
                      <span>Thông tin các ca đã dọn xong</span>
                    </div>

                    {detailCleanedSessions.length > 0 ? (
                      <div className="cleaned-sessions-list">
                        {detailCleanedSessions.map((item, idx) => (
                          <div key={item.id || idx} className={`cleaned-session-item ${item.type === "urgent" ? "is-urgent" : "is-match"}`}>
                            <div className="session-item-top">
                              <div className="session-title-wrap">
                                <span
                                  className="material-symbols-outlined session-icon"
                                  style={{ color: item.type === "urgent" ? "#dc2626" : "#16a34a" }}
                                >
                                  {item.type === "urgent" ? "warning" : "check_circle"}
                                </span>
                                <strong>{formatSessionTitle(item.time)}</strong>
                                {item.type === "urgent" && (
                                  <span style={{ fontSize: "0.72rem", background: "#fee2e2", color: "#b91c1c", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, marginLeft: "6px" }}>
                                    Ca khẩn cấp
                                  </span>
                                )}
                              </div>
                              <span className="session-time-chip">
                                Xong lúc {item.completedAt || current.completedAt || "hôm nay"}
                              </span>
                            </div>

                            <div className="session-details-row">
                              <span className="session-customer">
                                Khách: <strong>{item.name || "Khách đặt sân"}</strong> {item.phone ? `(${item.phone})` : ""}
                              </span>
                              {item.reportedBy && (
                                <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "8px" }}>
                                  • Người xử lý: <strong>{item.reportedBy}</strong>
                                </span>
                              )}
                            </div>
                            {item.reason && item.reason !== "Đã hoàn tất dọn dẹp" && (
                              <div style={{ fontSize: "0.76rem", color: item.type === "urgent" ? "#b91c1c" : "#64748b", marginTop: "3px" }}>
                                Tình trạng: <strong>{item.reason}</strong>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="detail-empty-message">
                        <span className="material-symbols-outlined">history</span>
                        <span>Chưa có ca nào dọn trong ngày</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Checklist quy chuẩn vệ sinh sân cỏ (Quy chuẩn mặc định - Không cần tick) */}
                <div className="detail-section-block">
                  <h4 className="detail-block-title">
                    <span className="material-symbols-outlined">checklist</span>
                    Checklist tiêu chuẩn vệ sinh sân cỏ (Quy chuẩn mặc định)
                  </h4>
                  <div className="detail-checklist-grid">
                    <div className="detail-checklist-item static-checklist-item">
                      <div className="static-check-icon">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <div>
                        <strong>1. Quét &amp; gom rác, chai nước</strong>
                        <p>Dọn sạch vỏ chai, ly nhựa tại ghế chờ và đường biên</p>
                      </div>
                    </div>

                    <div className="detail-checklist-item static-checklist-item">
                      <div className="static-check-icon">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <div>
                        <strong>2. Thu gom bóng &amp; áo bib</strong>
                        <p>Kiểm tra thu hồi đủ bóng thuê và treo gọn áo tập</p>
                      </div>
                    </div>

                    <div className="detail-checklist-item static-checklist-item">
                      <div className="static-check-icon">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <div>
                        <strong>3. Rà soát dị vật an toàn</strong>
                        <p>Rà soát đinh sắt, đá sỏi trên mặt cỏ nhân tạo</p>
                      </div>
                    </div>

                    <div className="detail-checklist-item static-checklist-item">
                      <div className="static-check-icon">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                      <div>
                        <strong>4. Kiểm tra lưới &amp; thùng rác</strong>
                        <p>Cố định lưới khung thành, dọn sạch thùng rác cạnh sân</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Lịch toàn bộ các ca hôm nay của sân này (nếu có ca) */}
                {schedule.todayBookings && schedule.todayBookings.length > 0 && (
                  <div className="detail-section-block">
                    <h4 className="detail-block-title">
                      <span className="material-symbols-outlined">calendar_view_day</span>
                      Lịch thi đấu hôm nay ({schedule.todayBookings.length} ca)
                    </h4>
                    <div className="detail-timeline-table">
                      {schedule.todayBookings.map((b, idx) => {
                        const bTime = b.time || `${b.start_time || ""} - ${b.end_time || ""}`;
                        const isPast = b.isEnded;
                        const isNext = schedule.nextBooking?.time === bTime;

                        return (
                          <div key={b.id || idx} className={`timeline-row ${isNext ? "highlight-next" : isPast ? "is-finished" : ""}`}>
                            <div className="time-col">
                              <span className="material-symbols-outlined">schedule</span>
                              <strong>{bTime}</strong>
                            </div>
                            <div className="guest-col">
                              <span>{b.name || b.customer_name || "Khách đặt sân"}</span>
                              {b.phone && <span className="phone-muted">({b.phone})</span>}
                            </div>
                            <div className="status-col">
                              {isNext ? (
                                <span className="badge-next" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>alarm</span>
                                  Ca tiếp theo {b.isCleaned ? "(Đã dọn)" : "(Chờ dọn)"}
                                </span>
                              ) : isPast ? (
                                <span className="badge-finished">Đã kết thúc</span>
                              ) : b.isCleaned ? (
                                <span className="badge-ready" style={{ background: "#dcfce7", color: "#15803d", fontWeight: 600, padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem" }}>
                                  Đã dọn sạch
                                </span>
                              ) : (
                                <span className="badge-wait">Chờ đá</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer tinh gọn: Loại bỏ nút thừa, sắp xếp 1 hàng cân đối */}
              <div className="modal-footer detail-modal-footer">
                <div className="detail-footer-left">
                  {/* Nút Báo đồ quên: CHỈ hiển thị khi không đang chờ dọn và có ít nhất 1 ca dọn thành công */}
                  {!showDetailDoneButton && detailCleanedSessions.length > 0 && (
                    <button
                      type="button"
                      className="detail-footer-btn btn-modal-report-lost"
                      title="Ghi nhận đồ đạc khách để quên trên sân này"
                      onClick={() => {
                        setShowDetailModal(false);
                        openLostModal(detailField);
                      }}
                    >
                      <span className="material-symbols-outlined">luggage</span>
                      Báo đồ quên
                    </button>
                  )}

                  {/* Nút Báo hỏng: màu vàng nhạt thanh lịch */}
                  <button
                    type="button"
                    className="detail-footer-btn btn-modal-report-issue"
                    title="Báo hư hỏng cho kỹ thuật"
                    onClick={() => {
                      setShowDetailModal(false);
                      openReportModal(detailField);
                    }}
                  >
                    <span className="material-symbols-outlined">handyman</span>
                    Báo hỏng
                  </button>
                </div>

                <div className="detail-footer-right">
                  <button
                    type="button"
                    className="detail-footer-btn btn-modal-close-action"
                    onClick={() => setShowDetailModal(false)}
                  >
                    Đóng
                  </button>

                  {/* NẾU CHUẨN BỊ CÓ CA ĐÁ TIẾP THEO HOẶC ĐƯỢC BÁO DỌN KHẨN CẤP: HIỂN THỊ NÚT [ĐÃ XONG] */}
                  {showDetailDoneButton && (
                    <button
                      type="button"
                      className="detail-footer-btn btn-modal-finish-cleaning"
                      onClick={() => {
                        handleUpdateStatus(detailField.id, detailField.field_name, "clean");
                        setShowDetailModal(false);
                      }}
                    >
                      <span className="material-symbols-outlined">done</span> Đã xong
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
