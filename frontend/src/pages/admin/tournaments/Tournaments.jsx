// Các khung giờ chuẩn cho giải đấu
const MORNING_SLOTS = [
  "06:00 - 07:00",
  "07:00 - 08:00",
  "08:00 - 09:00",
  "09:00 - 10:00",
  "10:00 - 11:00",
  "11:00 - 12:00",
];

const AFTERNOON_EVENING_SLOTS = [
  "14:00 - 15:00",
  "15:00 - 16:00",
  "16:00 - 17:00",
  "17:00 - 18:00",
  "18:00 - 19:00",
  "19:00 - 20:00",
  "20:00 - 21:00",
  "21:00 - 22:00",
];

import React, { useState, useEffect, useMemo, useRef } from "react";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import {
  getTournamentRequests,
  createTournamentRequest,
  updateTournamentRequest,
  deleteTournamentRequest,
} from "../../../api/tournamentsApi";
import { getFields } from "../../../api/fieldsApi";
import { getServices } from "../../../api/servicesApi";
import { getUsers } from "../../../api/usersApi";
import { getFullImageUrl } from "../../../config";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import { broadcastSyncEvent, onSyncEvent } from "../../../utils/realtimeSync";
import "../bookings/BookingModals.css";
import "./Tournaments.css";

const STATUS_MAP = {
  Pending: { label: "Chờ xử lý", color: "#d97706", bg: "#fef3c7", border: "#fde68a" },
  Contacted: { label: "Đã liên hệ", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  Approved: { label: "Đã chốt duyệt", color: "#059669", bg: "#ecfdf5", border: "#a7f3d0" },
  Rejected: { label: "Đã từ chối", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  Cancelled: { label: "Khách đã hủy", color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
};

const AVAILABLE_SERVICES = [
  "Trọng tài điều hành",
  "Áo bib thi đấu",
  "Nước uống thể thao",
  "Y tế & Sơ cứu",
  "Quay phim / Chụp ảnh",
  "Livestream giải đấu",
  "Cúp & Huy chương lưu niệm",
];

function TournamentsTopHeader({ searchQuery, onSearchChange, onAdd }) {
  return (
    <header className="top-header">
      <div className="search-box">
        <span className="material-symbols-outlined search-icon">search</span>
        <input
          type="text"
          placeholder="Tìm kiếm giải đấu, tổ chức, số điện thoại..."
          value={searchQuery || ""}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <button className="icon-btn" type="button" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}

const Tournaments = () => {
  const { toasts, removeToast, toast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [datePeriod, setDatePeriod] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fieldsList, setFieldsList] = useState([]);
  const [systemServices, setSystemServices] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [editSuppliesQuantities, setEditSuppliesQuantities] = useState({});
  const [editShoeSizes, setEditShoeSizes] = useState({});
  const [createSuppliesQuantities, setCreateSuppliesQuantities] = useState({});
  const [createShoeSizes, setCreateShoeSizes] = useState({});

  const isShoeService = (service) =>
    /giày|giay|shoe/i.test(`${service?.name || ""} ${service?.category || ""}`);

  const updateEditSupplyQuantity = (serviceId, delta) => {
    const srv = systemServices.find((s) => String(s.id) === String(serviceId));
    const maxStock = srv && srv.stock !== undefined && srv.stock !== null ? Number(srv.stock) : 999;
    setEditSuppliesQuantities((prev) => {
      const current = prev[serviceId] || 0;
      const next = Math.max(0, current + delta);
      if (next > maxStock) {
        toast.warning(`Kho hiện chỉ còn tối đa ${maxStock} ${srv?.name || "sản phẩm"}!`);
        return prev;
      }
      const updated = { ...prev, [serviceId]: next };
      if (next === 0) delete updated[serviceId];
      return updated;
    });
  };

  const updateEditShoeSize = (serviceId, size) => {
    setEditShoeSizes((prev) => ({ ...prev, [serviceId]: size }));
  };

  const updateCreateSupplyQuantity = (serviceId, delta) => {
    const srv = systemServices.find((s) => String(s.id) === String(serviceId));
    const maxStock = srv && srv.stock !== undefined && srv.stock !== null ? Number(srv.stock) : 999;
    setCreateSuppliesQuantities((prev) => {
      const current = prev[serviceId] || 0;
      const next = Math.max(0, current + delta);
      if (next > maxStock) {
        toast.warning(`Kho hiện chỉ còn tối đa ${maxStock} ${srv?.name || "sản phẩm"}!`);
        return prev;
      }
      const updated = { ...prev, [serviceId]: next };
      if (next === 0) delete updated[serviceId];
      return updated;
    });
  };

  const updateCreateShoeSize = (serviceId, size) => {
    setCreateShoeSizes((prev) => ({ ...prev, [serviceId]: size }));
  };

  // Định dạng hiển thị tiền tệ có dấu chấm phân cách hàng nghìn và đuôi VNĐ
  const formatVNDDisplay = (val) => {
    if (val === "" || val === null || val === undefined) return "";
    const num = Math.round(Number(val));
    if (isNaN(num)) return "";
    return `${num.toLocaleString("vi-VN")} VNĐ`;
  };

  // Trích xuất số nguyên từ chuỗi người dùng nhập (loại bỏ ký tự không phải số)
  const parseVNDValue = (str) => {
    if (str === "" || str === null || str === undefined) return "";
    const cleaned = String(str).replace(/\D/g, "");
    return cleaned === "" ? "" : parseInt(cleaned, 10);
  };

  // Xử lý phím Backspace khi con trỏ ở cuối hoặc chạm vào phần " VNĐ"
  const handleCurrencyKeyDown = (e, currentValue, onUpdate) => {
    if (e.key === "Backspace") {
      const input = e.target;
      const val = input.value;
      if (input.selectionStart === input.selectionEnd && input.selectionStart >= val.length - 4) {
        e.preventDefault();
        const digits = String(currentValue !== undefined && currentValue !== null ? currentValue : "").replace(/\D/g, "");
        if (digits.length > 0) {
          const nextDigits = digits.slice(0, -1);
          onUpdate(nextDigits === "" ? "" : parseInt(nextDigits, 10));
        } else {
          onUpdate("");
        }
      }
    }
  };

  // State và hàm xử lý Form Chọn Khung Giờ Thi Đấu (Modal)
  const [slotPickerModal, setSlotPickerModal] = useState({
    isOpen: false,
    target: "create", // "create" | "edit"
    mode: "all_days", // "all_days" | "weekends" | "custom_days"
    selectedCommonSlots: ["17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00"],
    selectedDaySlots: {},
    activeDayIndex: 0,
    slotNote: "",
  });

  const getTournamentDaysList = (sDate, eDate) => {
    if (!sDate || !eDate) return [];
    const s = new Date(sDate);
    const e = new Date(eDate);
    if (s > e) return [];
    const days = [];
    const cur = new Date(s);
    while (cur <= e && days.length <= 45) {
      const dateStr = cur.toISOString().split("T")[0];
      const weekdayName = cur.toLocaleDateString("vi-VN", { weekday: "short" });
      const isWeekend = cur.getDay() === 0 || cur.getDay() === 6;
      days.push({
        dateStr,
        displayDate: `${cur.getDate().toString().padStart(2, "0")}/${(cur.getMonth() + 1).toString().padStart(2, "0")}`,
        weekdayName,
        isWeekend,
      });
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  };

  const handleOpenSlotPicker = (target) => {
    const isCreate = target === "create";
    const currentData = isCreate ? createFormData : editFormData;
    const sDate = currentData.start_date;
    const eDate = currentData.end_date;

    const daysList = getTournamentDaysList(sDate, eDate);
    const currentInfo = String(currentData.time_slots_info || "");

    let initMode = "all_days";
    let initCommon = ["17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00"];
    let initDaySlots = {};
    let initNote = "";

    if (currentInfo.toLowerCase().includes("thứ 7") || currentInfo.toLowerCase().includes("cuối tuần")) {
      initMode = "weekends";
    }

    const allKnownSlots = [...MORNING_SLOTS, ...AFTERNOON_EVENING_SLOTS];
    const matchedSlots = allKnownSlots.filter((slot) => currentInfo.includes(slot));
    if (matchedSlots.length > 0) {
      initCommon = matchedSlots;
    }

    if (currentInfo.includes("Ghi chú:")) {
      initNote = currentInfo.split("Ghi chú:")[1]?.trim() || "";
    }

    setSlotPickerModal({
      isOpen: true,
      target,
      mode: initMode,
      selectedCommonSlots: initCommon,
      selectedDaySlots: initDaySlots,
      activeDayIndex: 0,
      slotNote: initNote,
    });
  };

  const handleTogglePickerSlot = (slot) => {
    const { mode, selectedCommonSlots, selectedDaySlots, target, activeDayIndex } = slotPickerModal;
    const isCreate = target === "create";
    const currentData = isCreate ? createFormData : editFormData;
    const daysList = getTournamentDaysList(currentData.start_date, currentData.end_date);

    if (mode === "custom_days") {
      const activeDateStr = daysList[activeDayIndex]?.dateStr;
      if (!activeDateStr) return;
      const cur = selectedDaySlots[activeDateStr] || [];
      const next = cur.includes(slot) ? cur.filter((s) => s !== slot) : [...cur, slot];
      setSlotPickerModal((prev) => ({
        ...prev,
        selectedDaySlots: { ...prev.selectedDaySlots, [activeDateStr]: next },
      }));
    } else {
      const next = selectedCommonSlots.includes(slot)
        ? selectedCommonSlots.filter((s) => s !== slot)
        : [...selectedCommonSlots, slot];
      setSlotPickerModal((prev) => ({ ...prev, selectedCommonSlots: next }));
    }
  };

  const handleConfirmSlotPicker = () => {
    const { target, mode, selectedCommonSlots, selectedDaySlots, slotNote } = slotPickerModal;
    const isCreate = target === "create";
    const currentData = isCreate ? createFormData : editFormData;
    const daysList = getTournamentDaysList(currentData.start_date, currentData.end_date);

    let summary = "";
    if (mode === "all_days") {
      if (selectedCommonSlots.length > 0) {
        summary = `Các ngày trong giải: ${selectedCommonSlots.join(", ")}`;
      }
    } else if (mode === "weekends") {
      if (selectedCommonSlots.length > 0) {
        summary = `Chỉ Thứ 7 & Chủ Nhật: ${selectedCommonSlots.join(", ")}`;
      }
    } else if (mode === "custom_days") {
      const parts = Object.entries(selectedDaySlots)
        .filter(([_, slots]) => slots.length > 0)
        .map(([date, slots]) => {
          const d = new Date(date);
          const formatted = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
          return `${formatted}: ${slots.join(", ")}`;
        });
      if (parts.length > 0) {
        summary = parts.join("; ");
      } else if (selectedCommonSlots.length > 0) {
        summary = `Các ngày trong giải: ${selectedCommonSlots.join(", ")}`;
      }
    }

    if (slotNote && slotNote.trim()) {
      summary = summary ? `${summary} | Ghi chú: ${slotNote.trim()}` : slotNote.trim();
    }

    const finalSummary = summary || "17:00 - 20:00 (Mặc định)";

    if (isCreate) {
      setCreateFormData((prev) => ({
        ...prev,
        time_slots_info: finalSummary,
      }));
    } else {
      setEditFormData((prev) => ({
        ...prev,
        time_slots_info: finalSummary,
      }));
    }

    setSlotPickerModal((prev) => ({ ...prev, isOpen: false }));
    toast.success("Đã cập nhật khung giờ thi đấu!");
  };

  // Modals state: Xem - Sửa - Xóa - Thêm mới
  const [selectedView, setSelectedView] = useState(null);
  const [selectedEdit, setSelectedEdit] = useState(null);
  const [selectedDelete, setSelectedDelete] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form Thêm Mới
  const [createFormData, setCreateFormData] = useState({
    customer_id: null,
    tournament_name: "",
    organization: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    start_date: "",
    end_date: "",
    expected_teams: 8,
    time_slots_info: "",
    selected_fields: [],
    services_requested: [],
    status: "Pending",
    estimated_budget: "",
    notes: "",
    admin_notes: "",
    payment_status: "Unpaid",
    paid_amount: 0,
    remaining_amount: 0,
  });
  const [savingCreate, setSavingCreate] = useState(false);

  // Form Chỉnh Sửa
  const [editFormData, setEditFormData] = useState({
    tournament_name: "",
    organization: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    start_date: "",
    end_date: "",
    expected_teams: 8,
    time_slots_info: "",
    selected_fields: [],
    services_requested: [],
    status: "Pending",
    estimated_budget: "",
    notes: "",
    admin_notes: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const requestsRef = useRef([]);
  useEffect(() => {
    requestsRef.current = requests;
  }, [requests]);

  const fetchRequests = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await getTournamentRequests();
      const newList = Array.isArray(res.data) ? res.data : [];
      if (isSilent && requestsRef.current.length > 0) {
        if (newList.length > requestsRef.current.length) {
          toast.info("🏆 Có yêu cầu tổ chức giải đấu mới vừa được khách gửi!");
        } else {
          const oldMap = new Map(requestsRef.current.map((r) => [r.id, r.status]));
          const changed = newList.find((r) => oldMap.has(r.id) && oldMap.get(r.id) !== r.status);
          if (changed) {
            toast.info(`Phiếu giải "${changed.tournament_name}" vừa đổi trạng thái: ${STATUS_MAP[changed.status]?.label || changed.status}`);
          }
        }
      }
      setRequests(newList);
    } catch (err) {
      console.error("Lỗi lấy danh sách giải đấu:", err);
      if (!isSilent) toast.error("Lỗi khi tải danh sách yêu cầu giải đấu");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests(false);
    getFields()
      .then((res) => {
        const list = res.data?.fields || (Array.isArray(res.data) ? res.data : []);
        setFieldsList(list);
      })
      .catch(() => {});
    getServices()
      .then((res) => {
        setSystemServices(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});
    getUsers()
      .then((res) => {
        setSystemUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {});

    // 1. Đồng bộ tức thì khi có sự kiện từ tab khác (Cross-tab sync 0ms)
    const cleanupSync = onSyncEvent((event) => {
      if (event.type?.startsWith("tournament_")) {
        fetchRequests(true);
      }
    });

    // 2. Smart Polling kiểm tra ngầm mỗi 3.5 giây khi tab đang hiển thị và không mở modal
    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible" && !showCreateModal && !selectedEdit && !selectedDelete) {
        fetchRequests(true);
      }
    }, 3500);

    // 3. Tự động cập nhật ngay khi admin chuyển lại vào tab này
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchRequests(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cleanupSync();
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [showCreateModal, selectedEdit, selectedDelete]);

  // Filtered & counts: Quản trị viên theo dõi toàn bộ danh sách phiếu yêu cầu giải đấu
  // Lọc chỉ giữ lại các yêu cầu giải đấu hợp lệ (đã thanh toán hoặc cọc thành công, hoặc do Admin tạo)
  // Tuyệt đối không hiển thị các đơn khách trực tuyến chưa thanh toán/đang chờ cọc dở dang hoặc đã hủy
  const validRequests = useMemo(() => {
    return requests.filter((r) => {
      const isUnpaidClientDraft =
        r.payment_status === "Unpaid" &&
        r.status === "Pending" &&
        (!r.admin_notes || !r.admin_notes.trim());
      return !isUnpaidClientDraft;
    });
  }, [requests]);

  const counts = useMemo(() => {
    const res = { all: validRequests.length, Pending: 0, Contacted: 0, Approved: 0, Rejected: 0, Cancelled: 0 };
    validRequests.forEach((r) => {
      const st = r.status || "Pending";
      if (res[st] !== undefined) res[st]++;
    });
    return res;
  }, [validRequests]);

  const filteredRequests = useMemo(() => {
    return validRequests.filter((r) => {
      const matchTab = activeTab === "all" || r.status === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.tournament_name?.toLowerCase().includes(q) ||
        r.contact_name?.toLowerCase().includes(q) ||
        r.contact_phone?.includes(q) ||
        r.organization?.toLowerCase().includes(q) ||
        r.request_id_short?.toLowerCase().includes(q);
      // Period filter
      let matchPeriod = true;
      if (datePeriod !== "all") {
        const dStr = r.start_date || r.created_at;
        if (dStr) {
          const now = new Date();
          const tDate = new Date(dStr);
          if (!isNaN(tDate.getTime())) {
            if (datePeriod === "today") {
              matchPeriod = String(dStr).slice(0, 10) === now.toISOString().slice(0, 10);
            } else if (datePeriod === "week") {
              const dayOfWeek = now.getDay() || 7;
              const monday = new Date(now);
              monday.setDate(now.getDate() - dayOfWeek + 1);
              monday.setHours(0, 0, 0, 0);
              const sunday = new Date(monday);
              sunday.setDate(monday.getDate() + 6);
              sunday.setHours(23, 59, 59, 999);
              matchPeriod = tDate >= monday && tDate <= sunday;
            } else if (datePeriod === "month") {
              matchPeriod = tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth();
            } else if (datePeriod === "year") {
              matchPeriod = tDate.getFullYear() === now.getFullYear();
            }
          }
        }
      }

      return matchTab && matchSearch && matchPeriod;
    });
  }, [validRequests, activeTab, searchQuery, datePeriod]);

  const handleExportCSV = () => {
    if (!filteredRequests || filteredRequests.length === 0) {
      toast.warning("Không có dữ liệu giải đấu nào để xuất");
      return;
    }

    const headers = [
      "Mã yêu cầu",
      "Tên giải đấu",
      "Đơn vị tổ chức",
      "Người đại diện",
      "Số điện thoại",
      "Email",
      "Số đội tham gia",
      "Ngày bắt đầu",
      "Ngày kết thúc",
      "Khung giờ",
      "Sân thi đấu",
      "Gói dịch vụ",
      "Trạng thái",
      "Tổng chi phí ước tính (VNĐ)",
      "Tiền cọc (VNĐ)",
      "Tình trạng cọc",
      "Ghi chú",
      "Ngày tạo",
    ];

    const rows = filteredRequests.map((r) => [
      `"${r.request_id_short || r.id || ""}"`,
      `"${(r.tournament_name || "").replace(/"/g, '""')}"`,
      `"${(r.organization || "").replace(/"/g, '""')}"`,
      `"${(r.contact_name || "").replace(/"/g, '""')}"`,
      `"${r.contact_phone || ""}"`,
      `"${r.contact_email || ""}"`,
      r.teams_count || r.expected_teams || "",
      r.start_date || "",
      r.end_date || "",
      `"${(r.time_slots || []).join("; ")}"`,
      `"${(r.fields_details || []).map((f) => f.name || f).join("; ")}"`,
      `"${(r.services_detail || []).map((s) => s.name || s).join("; ")}"`,
      `"${STATUS_MAP[r.status]?.label || r.status || ""}"`,
      r.estimated_total_cost || 0,
      r.deposit_amount || 0,
      r.is_deposit_paid ? "Đã đặt cọc" : "Chưa cọc",
      `"${(r.notes || "").replace(/"/g, '""')}"`,
      `"${r.created_at ? new Date(r.created_at).toLocaleDateString("vi-VN") : ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Danh_Sach_Giai_Dau_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Xuất danh sách giải đấu thành công!");
  };

  // Mở modal Thêm Mới
  const handleOpenCreate = () => {
    setCreateFormData({
      tournament_name: "",
      organization: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
      start_date: "",
      end_date: "",
      expected_teams: 8,
      time_slots_info: "",
      selected_fields: [],
      services_requested: [],
      status: "Pending",
      estimated_budget: "",
      notes: "",
      admin_notes: "",
    });
    setShowCreateModal(true);
  };

  // Lưu Thêm Mới
  const handleSaveCreate = async () => {
    if (!createFormData.tournament_name.trim()) {
      toast.error("Vui lòng nhập tên giải đấu!");
      return;
    }
    if (!createFormData.contact_name.trim() || !createFormData.contact_phone.trim()) {
      toast.error("Vui lòng nhập họ tên và SĐT người liên hệ!");
      return;
    }
    if (!createFormData.start_date || !createFormData.end_date) {
      toast.error("Vui lòng chọn ngày bắt đầu và kết thúc!");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (createFormData.start_date < todayStr) {
      toast.error("Ngày bắt đầu không được là ngày đã qua trong quá khứ!");
      return;
    }
    if (createFormData.end_date < createFormData.start_date) {
      toast.error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu!");
      return;
    }

    const chosenSupplies = Object.entries(createSuppliesQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([sId, qty]) => {
        const s = systemServices.find((item) => String(item.id) === String(sId));
        if (!s) return null;
        const sizeStr = createShoeSizes[sId] ? ` - Size ${createShoeSizes[sId]}` : "";
        return `${s.name}${sizeStr} x${qty} (${(Number(s.price || 0) * qty).toLocaleString("vi-VN")}đ)`;
      })
      .filter(Boolean);

    const standardEventPackages = [
      "Tổ trọng tài chuẩn VFF (Trọn gói sẵn có)",
      "Bình luận viên & Livestream HD (Trọn gói sẵn có)",
      "Cúp vô địch, Huy chương & Cờ lưu niệm (Trọn gói sẵn có)",
      "Túi y tế sơ cứu & Xịt giảm đau (Trọn gói sẵn có)",
      "Hệ thống âm thanh & Đèn LED đêm (Trọn gói sẵn có)",
      "Điều phối viên & Lễ tân đón tiếp (Trọn gói sẵn có)"
    ];

    const finalServices = [...standardEventPackages, ...chosenSupplies];
    const budgetVal = createFormData.estimated_budget !== "" ? Math.round(Number(createFormData.estimated_budget)) : null;
    const paidVal = createFormData.paid_amount !== "" ? Math.round(Number(createFormData.paid_amount)) : 0;
    const remVal = createFormData.remaining_amount !== "" ? Math.round(Number(createFormData.remaining_amount)) : (budgetVal ? Math.max(0, budgetVal - paidVal) : 0);
    const payStatus = createFormData.payment_status || (paidVal >= budgetVal && budgetVal > 0 ? "Paid" : paidVal > 0 ? "Deposit_Paid" : "Unpaid");

    try {
      setSavingCreate(true);
      await createTournamentRequest({
        ...createFormData,
        admin_notes: createFormData.admin_notes || "[Khởi tạo bởi Quản trị viên]",
        customer_id: createFormData.customer_id,
        expected_teams: Number(createFormData.expected_teams) || 8,
        estimated_budget: budgetVal,
        selected_fields_info: createFormData.selected_fields,
        services_requested: finalServices,
        payment_status: payStatus,
        paid_amount: paidVal,
        remaining_amount: remVal,
      });
      toast.success("Thêm giải đấu mới thành công!");
      broadcastSyncEvent("tournament_updated", { action: "create" });
      setShowCreateModal(false);
      setCreateSuppliesQuantities({});
      setCreateShoeSizes({});
      fetchRequests();
    } catch (err) {
      console.error("Lỗi tạo giải đấu:", err);
      toast.error(err.response?.data?.error || "Lỗi khi tạo giải đấu mới");
    } finally {
      setSavingCreate(false);
    }
  };

  // Mở modal Sửa
  const handleOpenEdit = (req) => {
    const rawBudget = req.estimated_budget !== undefined && req.estimated_budget !== null && req.estimated_budget !== "" ? Math.round(Number(req.estimated_budget)) : "";
    const rawPaid = req.paid_amount !== undefined && req.paid_amount !== null ? Math.round(Number(req.paid_amount)) : 0;
    const rawRemaining = req.remaining_amount !== undefined && req.remaining_amount !== null ? Math.round(Number(req.remaining_amount)) : (rawBudget ? Math.max(0, rawBudget - rawPaid) : 0);

    setSelectedEdit(req);
    setEditFormData({
      tournament_name: req.tournament_name || "",
      organization: req.organization || "",
      contact_name: req.contact_name || "",
      contact_phone: req.contact_phone || "",
      contact_email: req.contact_email || "",
      start_date: req.start_date || "",
      end_date: req.end_date || "",
      expected_teams: req.expected_teams || 8,
      time_slots_info: req.time_slots_info || "",
      selected_fields: Array.isArray(req.selected_fields_info) ? req.selected_fields_info : [],
      services_requested: Array.isArray(req.services_requested) ? req.services_requested : [],
      status: req.status || "Pending",
      estimated_budget: rawBudget,
      notes: req.notes || "",
      admin_notes: req.admin_notes || "",
      payment_status: req.payment_status || "Unpaid",
      payment_method: req.payment_method || "full",
      paid_amount: rawPaid,
      remaining_amount: rawRemaining,
      transaction_id: req.transaction_id || "",
    });

    // Phân tích các dịch vụ vật tư khách hàng đã chọn để khôi phục số lượng & size giày
    const reqServices = Array.isArray(req.services_requested)
      ? req.services_requested
      : parseJsonSafe(req.services_requested);

    const parsedQuantities = {};
    const parsedShoeSizes = {};

    systemServices.forEach((s) => {
      const matched = reqServices.find((item) =>
        item && typeof item === "string" && (
          item.toLowerCase().includes(s.name.toLowerCase()) ||
          item.toLowerCase().startsWith(s.name.toLowerCase())
        )
      );

      if (matched) {
        const qMatch = matched.match(/x(\d+)/i);
        parsedQuantities[s.id] = qMatch ? parseInt(qMatch[1], 10) : 1;

        const szMatch = matched.match(/Size\s*(\d+)/i);
        parsedShoeSizes[s.id] = szMatch ? szMatch[1] : "41";
      }
    });

    setEditSuppliesQuantities(parsedQuantities);
    setEditShoeSizes(parsedShoeSizes);
  };

  // Lưu Chỉnh Sửa
  const handleSaveEdit = async () => {
    if (!selectedEdit) return;
    if (!editFormData.tournament_name.trim()) {
      toast.error("Vui lòng nhập tên giải đấu!");
      return;
    }
    if (!editFormData.contact_name.trim() || !editFormData.contact_phone.trim()) {
      toast.error("Vui lòng nhập họ tên và SĐT người liên hệ!");
      return;
    }
    if (!editFormData.start_date || !editFormData.end_date) {
      toast.error("Vui lòng chọn ngày bắt đầu và kết thúc!");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (editFormData.start_date < todayStr) {
      toast.error("Ngày bắt đầu không được là ngày đã qua trong quá khứ!");
      return;
    }
    if (editFormData.end_date < editFormData.start_date) {
      toast.error("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu!");
      return;
    }

    const chosenSupplies = Object.entries(editSuppliesQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([sId, qty]) => {
        const s = systemServices.find((item) => String(item.id) === String(sId));
        if (!s) return null;
        const sizeStr = editShoeSizes[sId] ? ` - Size ${editShoeSizes[sId]}` : "";
        return `${s.name}${sizeStr} x${qty} (${(Number(s.price || 0) * qty).toLocaleString("vi-VN")}đ)`;
      })
      .filter(Boolean);

    // Giữ lại các gói dịch vụ sự kiện chuẩn trọn gói
    const currentServices = Array.isArray(editFormData.services_requested) ? editFormData.services_requested : [];
    const standardPackages = currentServices.filter(
      (item) => typeof item === "string" && !systemServices.some((s) => item.toLowerCase().includes(s.name.toLowerCase()))
    );

    const defaultStandardEventPackages = [
      "Tổ trọng tài chuẩn VFF (Trọn gói sẵn có)",
      "Bình luận viên & Livestream HD (Trọn gói sẵn có)",
      "Cúp vô địch, Huy chương & Cờ lưu niệm (Trọn gói sẵn có)",
      "Túi y tế sơ cứu & Xịt giảm đau (Trọn gói sẵn có)",
      "Hệ thống âm thanh & Đèn LED đêm (Trọn gói sẵn có)",
      "Điều phối viên & Lễ tân đón tiếp (Trọn gói sẵn có)"
    ];

    const finalServices = [
      ...(standardPackages.length > 0 ? standardPackages : defaultStandardEventPackages),
      ...chosenSupplies
    ];

    const budgetVal = editFormData.estimated_budget !== "" ? Math.round(Number(editFormData.estimated_budget)) : null;
    const paidVal = editFormData.paid_amount !== "" ? Math.round(Number(editFormData.paid_amount)) : 0;
    const remainingVal = editFormData.remaining_amount !== "" ? Math.round(Number(editFormData.remaining_amount)) : 0;

    try {
      setSavingEdit(true);
      await updateTournamentRequest(selectedEdit.id, {
        ...editFormData,
        estimated_budget: budgetVal,
        expected_teams: Number(editFormData.expected_teams) || 8,
        selected_fields_info: editFormData.selected_fields,
        services_requested: finalServices,
        payment_status: editFormData.payment_status,
        payment_method: editFormData.payment_method,
        paid_amount: paidVal,
        remaining_amount: remainingVal,
        transaction_id: editFormData.transaction_id,
      });
      toast.success("Cập nhật thông tin yêu cầu giải đấu thành công!");
      broadcastSyncEvent("tournament_updated", { action: "update", id: selectedEdit.id, status: editFormData.status });
      setSelectedEdit(null);
      if (selectedView?.id === selectedEdit.id) {
        setSelectedView(null);
      }
      fetchRequests();
    } catch (err) {
      console.error("Lỗi cập nhật giải đấu:", err);
      toast.error(err.response?.data?.error || "Lỗi khi cập nhật");
    } finally {
      setSavingEdit(false);
    }
  };

  // Xác nhận Xóa
  const handleConfirmDelete = async () => {
    if (!selectedDelete) return;
    try {
      setDeleting(true);
      await deleteTournamentRequest(selectedDelete.id);
      toast.success("Đã xóa yêu cầu giải đấu thành công!");
      broadcastSyncEvent("tournament_updated", { action: "delete", id: selectedDelete.id });
      if (selectedView?.id === selectedDelete.id) {
        setSelectedView(null);
      }
      setSelectedDelete(null);
      fetchRequests();
    } catch (err) {
      console.error("Lỗi xóa giải đấu:", err);
      toast.error(err.response?.data?.error || "Lỗi khi xóa yêu cầu giải đấu");
    } finally {
      setDeleting(false);
    }
  };

  // Sao chép nhanh
  const handleCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  // Helper render json or list safely
  const parseJsonSafe = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "string") return [String(raw)];
    let s = raw.trim();
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        try {
          const parsed = JSON.parse(s.replace(/'/g, '"'));
          if (Array.isArray(parsed)) return parsed;
        } catch {}
      }
      const matches = s.slice(1, -1).match(/'([^']+)'|"([^"]+)"/g);
      if (matches) {
        return matches.map((m) => m.replace(/['"]/g, "").trim()).filter(Boolean);
      }
    }
    if (s.includes(",")) {
      return s.split(",").map((x) => x.trim()).filter(Boolean);
    }
    return [s];
  };

  return (
    <div className="tournaments-admin-page">
      <AdminSidebar />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <TournamentsTopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={handleOpenCreate}
      />

      <main className="main-content tournaments-admin-main">
        <div className="content-inner">
          {/* Header */}
          <div className="page-header">
            <div>
              <span className="booking-admin-eyebrow">
                VẬN HÀNH CƠ SỞ <span>›</span> YÊU CẦU GIẢI ĐẤU
              </span>
              <h2>Quản lý giải đấu</h2>
              <p>
                Tiếp nhận, xử lý và điều phối các giải đấu dài ngày của doanh nghiệp &amp; ban tổ chức
              </p>
            </div>
            <div className="header-actions-group">
              <button className="btn-export" onClick={fetchRequests} disabled={loading} title="Làm mới dữ liệu">
                <span className="material-symbols-outlined">refresh</span>
                Làm mới
              </button>
              <button className="btn-export" onClick={handleExportCSV} title="Xuất file CSV / Excel">
                <span className="material-symbols-outlined">download</span>
                Xuất CSV
              </button>
              <button className="btn-add-tour" onClick={handleOpenCreate}>
                <span className="material-symbols-outlined">add</span>
                Thêm giải đấu
              </button>
            </div>
          </div>

          {/* 4 Thẻ KPI Thống Kê */}
          <div className="adm-tour-kpis">
            <div className="adm-tour-kpi-card">
              <div className="kpi-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
                <span className="material-symbols-outlined">emoji_events</span>
              </div>
              <div>
                <div className="kpi-val">{counts.all}</div>
                <div className="kpi-label">Tổng yêu cầu giải đấu</div>
              </div>
            </div>

            <div className="adm-tour-kpi-card">
              <div className="kpi-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
                <span className="material-symbols-outlined">pending</span>
              </div>
              <div>
                <div className="kpi-val" style={{ color: "#d97706" }}>{counts.Pending}</div>
                <div className="kpi-label">Chờ tư vấn &amp; xử lý</div>
              </div>
            </div>

            <div className="adm-tour-kpi-card">
              <div className="kpi-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
                <span className="material-symbols-outlined">phone_in_talk</span>
              </div>
              <div>
                <div className="kpi-val" style={{ color: "#2563eb" }}>{counts.Contacted}</div>
                <div className="kpi-label">Đang trao đổi tư vấn</div>
              </div>
            </div>

            <div className="adm-tour-kpi-card">
              <div className="kpi-icon-wrap" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <div className="kpi-val" style={{ color: "#16a34a" }}>{counts.Approved}</div>
                <div className="kpi-label">Đã chốt giữ sân thành công</div>
              </div>
            </div>
          </div>

          {/* Thanh Tìm Kiếm & Tabs Lọc */}
          <div className="adm-tour-controls">
            <div className="adm-tour-search">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Tìm theo Tên giải, Người liên hệ, SĐT, Mã yêu cầu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-btn" onClick={() => setSearchQuery("")}>✕</button>
              )}
            </div>

            <div className="adm-tour-tabs">
              {[
                { key: "all", label: "Tất cả", count: counts.all },
                { key: "Pending", label: "Chờ xử lý", count: counts.Pending, urgent: counts.Pending > 0 },
                { key: "Contacted", label: "Đã liên hệ", count: counts.Contacted },
                { key: "Approved", label: "Đã chốt duyệt", count: counts.Approved },
                { key: "Rejected", label: "Đã từ chối", count: counts.Rejected },
                { key: "Cancelled", label: "Đã hủy", count: counts.Cancelled },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`tab-btn ${activeTab === t.key ? "active" : ""}`}
                  onClick={() => setActiveTab(t.key)}
                >
                  <span>{t.label}</span>
                  <span className={`tab-badge ${t.urgent ? "urgent" : ""}`}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Filter Period Pills */}
            <div className="filter-period-pills" style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
              <span className="filter-period-label" style={{ fontSize: "0.8rem", fontWeight: "700", color: "#475569", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#006b2c" }}>calendar_month</span>
                Thời gian:
              </span>
              {[
                { key: "all", label: "Tất cả" },
                { key: "today", label: "Hôm nay" },
                { key: "week", label: "Tuần này" },
                { key: "month", label: "Tháng này" },
                { key: "year", label: "Năm nay" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`filter-period-btn ${datePeriod === p.key ? "active" : ""}`}
                  onClick={() => setDatePeriod(p.key)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bảng Dữ Liệu Hiển Thị Vừa Vặn 1 Màn Hình (Không Kéo Ngang) */}
          <div className="adm-tour-card">
            {loading ? (
              <div className="adm-tour-loading">
                <span className="material-symbols-outlined spin">progress_activity</span>
                <p>Đang tải danh sách yêu cầu giải đấu...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="adm-tour-empty">
                <span className="material-symbols-outlined">event_busy</span>
                <h4>Không tìm thấy yêu cầu giải đấu nào</h4>
                <p>Thử điều chỉnh lại bộ lọc trạng thái hoặc từ khóa tìm kiếm.</p>
              </div>
            ) : (
              <div className="adm-tour-table-wrap">
                <table className="adm-tour-table">
                  <thead>
                    <tr>
                      <th style={{ width: "23%" }}>Mã &amp; Tên giải đấu</th>
                      <th style={{ width: "15%" }}>Người liên hệ</th>
                      <th style={{ width: "15%" }}>Thời gian thi đấu</th>
                      <th style={{ width: "16%" }}>Sân &amp; Quy mô</th>
                      <th style={{ width: "17%" }}>Ngân sách &amp; Thanh toán</th>
                      <th style={{ width: "14%" }}>Trạng thái</th>
                      <th className="center" style={{ width: "80px" }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => {
                      const st = STATUS_MAP[req.status] || STATUS_MAP.Pending;
                      const fieldsList = parseJsonSafe(req.selected_fields_info);

                      return (
                        <tr key={req.id}>
                          {/* 1. Mã & Tên giải */}
                          <td>
                            <div className="tour-name-cell">
                              <span className="tour-code">{req.request_id_short}</span>
                              <strong className="tour-title" title={req.tournament_name}>
                                {req.tournament_name}
                              </strong>
                              {req.organization ? (
                                <small className="tour-org" title={req.organization}>
                                  Đơn vị: {req.organization}
                                </small>
                              ) : (
                                <small className="tour-org text-muted">Cá nhân / Đội bóng</small>
                              )}
                            </div>
                          </td>

                          {/* 2. Người liên hệ (Tối ưu chỉ hiển thị Tên & SĐT) */}
                          <td>
                            <div className="tour-contact-cell">
                              <div className="contact-name">
                                <span className="material-symbols-outlined">person</span>
                                <strong>{req.contact_name}</strong>
                              </div>
                              <div className="contact-phone">
                                <span className="material-symbols-outlined">call</span>
                                <a href={`tel:${req.contact_phone}`} title="Nhấn để gọi">
                                  {req.contact_phone}
                                </a>
                              </div>
                            </div>
                          </td>

                          {/* 3. Thời gian thi đấu (Gọn gàng ngày bắt đầu -> kết thúc) */}
                          <td>
                            <div className="tour-schedule-cell">
                              <div className="schedule-dates">
                                <span className="material-symbols-outlined">calendar_today</span>
                                <span>
                                  {new Date(req.start_date).toLocaleDateString("vi-VN")} →{" "}
                                  {new Date(req.end_date).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. Sân & Quy mô */}
                          <td>
                            <div className="tour-fields-cell">
                              <div className="fields-tag-list">
                                {fieldsList.slice(0, 1).map((fn, idx) => (
                                  <span key={idx} className="field-tag" title={fn}>{fn}</span>
                                ))}
                                {fieldsList.length > 1 && (
                                  <span className="field-tag more" title={fieldsList.slice(1).join(", ")}>
                                    +{fieldsList.length - 1} sân
                                  </span>
                                )}
                              </div>
                              <div className="teams-badge" style={{ marginTop: "3px" }}>
                                <span className="material-symbols-outlined">groups</span>
                                <span>{req.expected_teams || 8} đội</span>
                              </div>
                            </div>
                          </td>

                          {/* 5. Ngân sách & Thanh toán (Thanh toán hiển thị ngay dưới ngân sách) */}
                          <td>
                            <div className="tour-budget-cell">
                              <strong className="tour-budget-amount">
                                {req.estimated_budget ? `${Math.round(Number(req.estimated_budget)).toLocaleString("vi-VN")}đ` : "Chưa báo giá"}
                              </strong>
                              {(() => {
                                const pStatus = String(req.payment_status || "Unpaid").toLowerCase().trim();
                                const isFullPaid = (pStatus === "paid" || pStatus === "completed" || pStatus === "success" || pStatus === "full_paid");
                                const isDepositPaid = (pStatus === "deposit_paid" || pStatus === "partial_paid");

                                if (isFullPaid) {
                                  return (
                                    <span className="tour-pay-badge tour-pay-full" title={`Đã thanh toán 100%: ${Math.round(Number(req.paid_amount || req.estimated_budget || 0)).toLocaleString("vi-VN")}đ`}>
                                      <span className="material-symbols-outlined">check_circle</span>
                                      Đã trả 100%
                                    </span>
                                  );
                                } else if (isDepositPaid) {
                                  return (
                                    <div className="tour-pay-deposit-wrap">
                                      <span className="tour-pay-badge tour-pay-deposit" title={`Đã cọc 50%: ${Math.round(Number(req.paid_amount || req.deposit_amount || 0)).toLocaleString("vi-VN")}đ`}>
                                        <span className="material-symbols-outlined">bolt</span>
                                        Đã cọc 50%
                                      </span>
                                      {Number(req.remaining_amount || 0) > 0 && (
                                        <small className="tour-pay-rem">
                                          Còn: {Math.round(Number(req.remaining_amount)).toLocaleString("vi-VN")}đ
                                        </small>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <span className="tour-pay-badge tour-pay-unpaid">
                                      Chưa thanh toán
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                          </td>

                          {/* 7. Trạng thái */}
                          <td>
                            <span
                              className="tour-status-pill"
                              style={{
                                color: st.color,
                                background: st.bg,
                                borderColor: st.border,
                              }}
                            >
                              <span className="status-dot" style={{ background: st.color }} />
                              {st.label}
                            </span>
                          </td>

                          {/* 7. Thao tác: 3 Icon button gọn gàng */}
                          <td className="center">
                            <div className="tour-actions-group">
                              <button
                                type="button"
                                className="btn-tour-icon btn-view"
                                onClick={() => setSelectedView(req)}
                                title="Xem chi tiết giải đấu"
                              >
                                <span className="material-symbols-outlined">visibility</span>
                              </button>
                              <button
                                type="button"
                                className="btn-tour-icon btn-edit"
                                onClick={() => handleOpenEdit(req)}
                                title="Chỉnh sửa thông tin"
                              >
                                <span className="material-symbols-outlined">edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn-tour-icon btn-delete"
                                onClick={() => setSelectedDelete(req)}
                                title="Xóa giải đấu"
                              >
                                <span className="material-symbols-outlined">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              MODAL: THÊM GIẢI ĐẤU MỚI (CREATE TOURNAMENT)
             ═══════════════════════════════════════════════════════════ */}
          {showCreateModal && (
            <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
              <div className="modal modal-tour-create" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title-group">
                    <span className="material-symbols-outlined modal-title-icon" style={{ color: "#059669", background: "#ecfdf5" }}>
                      add_circle
                    </span>
                    <div>
                      <h3>Thêm Giải Đấu / Đặt Giải Mới</h3>
                      <p className="modal-subtitle">Tiếp nhận và lên lịch giải đấu trực tiếp từ Ban quản trị</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setShowCreateModal(false)}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="modal-body tour-modal-body">
                  <div className="edit-form-grid">
                    {/* Hàng 1: Tên giải đấu & Đơn vị tổ chức */}
                    <div className="form-row-2">
                      <div className="form-group-adm">
                        <label>Tên giải đấu <span className="req">*</span></label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: Giải Bóng Đá Mùa Thu Doanh Nghiệp 2026"
                          value={createFormData.tournament_name}
                          onChange={(e) => setCreateFormData({ ...createFormData, tournament_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Đơn vị / Ban tổ chức:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: Công ty FPT, Hội Doanh nghiệp..."
                          value={createFormData.organization}
                          onChange={(e) => setCreateFormData({ ...createFormData, organization: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Hàng 2: Chọn tài khoản khách hàng hoặc vãng lai */}
                    <div className="form-group-adm" style={{ marginBottom: "0.85rem", background: "#f0fdf4", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                      <label style={{ fontWeight: 800, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#059669" }}>person_search</span>
                        Chọn người liên hệ (Khách có tài khoản hoặc Khách vãng lai):
                      </label>
                      <select
                        className="adm-select"
                        style={{ marginTop: "4px", borderColor: "#86efac", background: "#ffffff", fontWeight: 600 }}
                        value={createFormData.customer_id || "guest"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "guest") {
                            setCreateFormData({
                              ...createFormData,
                              customer_id: null,
                              contact_name: "",
                              contact_phone: "",
                              contact_email: "",
                            });
                          } else {
                            const u = systemUsers.find((usr) => String(usr.id) === String(val));
                            if (u) {
                              const userName = u.name || u.full_name || u.username || "";
                              setCreateFormData({
                                ...createFormData,
                                customer_id: u.id,
                                contact_name: userName,
                                contact_phone: u.phone || "",
                                contact_email: u.email || "",
                              });
                              toast.info(`Đã tự động điền thông tin của: ${userName}`);
                            }
                          }
                        }}
                      >
                        <option value="guest">👤 Khách hàng vãng lai (Tự nhập thông tin liên hệ mới)</option>
                        {systemUsers.length > 0 && (
                          <optgroup label="Tài khoản khách hàng trong hệ thống:">
                            {systemUsers.map((u) => {
                              const uName = u.name || u.full_name || u.username || "Khách hàng";
                              return (
                                <option key={u.id} value={u.id}>
                                  👤 {uName} {u.phone ? `— SĐT: ${u.phone}` : ""} {u.email ? `(${u.email})` : ""}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    {/* Thông tin liên hệ chi tiết (Tự động điền hoặc nhập tay) */}
                    <div className="form-row-3">
                      <div className="form-group-adm">
                        <label>Người liên hệ <span className="req">*</span></label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: Nguyễn Văn A"
                          value={createFormData.contact_name}
                          onChange={(e) => setCreateFormData({ ...createFormData, contact_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Số điện thoại <span className="req">*</span></label>
                        <input
                          type="tel"
                          className="adm-input"
                          placeholder="VD: 0912345678"
                          value={createFormData.contact_phone}
                          onChange={(e) => setCreateFormData({ ...createFormData, contact_phone: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Email liên hệ:</label>
                        <input
                          type="email"
                          className="adm-input"
                          placeholder="VD: contact@company.vn"
                          value={createFormData.contact_email}
                          onChange={(e) => setCreateFormData({ ...createFormData, contact_email: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Hàng 3: Thời gian & Số đội (Ngày kết thúc không được trước ngày bắt đầu) */}
                    <div className="form-row-3">
                      <div className="form-group-adm">
                        <label>Ngày bắt đầu <span className="req">*</span></label>
                        <input
                          type="date"
                          className="adm-input"
                          min={new Date().toISOString().split("T")[0]}
                          value={createFormData.start_date}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setCreateFormData((prev) => ({
                              ...prev,
                              start_date: newStart,
                              end_date: prev.end_date && prev.end_date < newStart ? newStart : prev.end_date,
                            }));
                          }}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Ngày kết thúc <span className="req">*</span></label>
                        <input
                          type="date"
                          className="adm-input"
                          min={createFormData.start_date || new Date().toISOString().split("T")[0]}
                          value={createFormData.end_date}
                          onChange={(e) => setCreateFormData({ ...createFormData, end_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Số đội tham gia:</label>
                        <input
                          type="number"
                          className="adm-input"
                          min="2"
                          max="64"
                          value={createFormData.expected_teams}
                          onChange={(e) => setCreateFormData({ ...createFormData, expected_teams: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Hàng 4: Khung giờ & Trạng thái & Ngân sách (Bấm vào cả ô để mở form chọn khung giờ) */}
                    <div className="form-row-3">
                      <div className="form-group-adm">
                        <label>Khung giờ thi đấu <span className="req">*</span></label>
                        <div
                          className="adm-clickable-input-wrap"
                          onClick={() => handleOpenSlotPicker("create")}
                          title="Nhấn để chọn khung giờ thi đấu"
                        >
                          <input
                            type="text"
                            readOnly
                            className="adm-input adm-slot-input"
                            placeholder="Nhấn vào đây để chọn khung giờ..."
                            value={createFormData.time_slots_info}
                          />
                          <span className="material-symbols-outlined adm-slot-icon">schedule</span>
                        </div>
                      </div>
                      <div className="form-group-adm">
                        <label>Trạng thái ban đầu:</label>
                        <select
                          className="adm-select"
                          value={createFormData.status}
                          onChange={(e) => setCreateFormData({ ...createFormData, status: e.target.value })}
                        >
                          <option value="Pending">⏳ Chờ xử lý</option>
                          <option value="Contacted">📞 Đã liên hệ tư vấn</option>
                          <option value="Approved">✅ Đã chốt duyệt &amp; Giữ sân</option>
                        </select>
                      </div>
                      <div className="form-group-adm">
                        <label>Dự toán ngân sách:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: 15.000.000 VNĐ"
                          value={formatVNDDisplay(createFormData.estimated_budget)}
                          onKeyDown={(e) => handleCurrencyKeyDown(e, createFormData.estimated_budget, (newVal) => {
                            const val = newVal === "" ? "" : Math.round(Number(newVal));
                            const paid = Number(createFormData.paid_amount || 0);
                            const rem = val === "" ? 0 : Math.max(0, val - paid);
                            setCreateFormData({ ...createFormData, estimated_budget: val, remaining_amount: rem });
                          })}
                          onChange={(e) => {
                            const val = parseVNDValue(e.target.value);
                            const paid = Number(createFormData.paid_amount || 0);
                            const rem = val === "" ? 0 : Math.max(0, val - paid);
                            setCreateFormData({ ...createFormData, estimated_budget: val, remaining_amount: rem });
                          }}
                        />
                        {Number(createFormData.estimated_budget) > 0 && (
                          <small className="budget-hint">
                            Bằng chữ: {Math.round(Number(createFormData.estimated_budget)).toLocaleString("vi-VN")} VNĐ
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Phần cập nhật thanh toán ban đầu khi Thêm giải đấu */}
                    <div className="form-row-3" style={{ marginTop: "1rem" }}>
                      <div className="form-group-adm">
                        <label>Trạng thái thanh toán:</label>
                        <select
                          className="adm-select"
                          value={createFormData.payment_status || "Unpaid"}
                          onChange={(e) => setCreateFormData({ ...createFormData, payment_status: e.target.value })}
                        >
                          <option value="Unpaid">⏳ Chưa thanh toán (Chờ thanh toán)</option>
                          <option value="Deposit_Paid">⚡ Đã cọc trước 50%</option>
                          <option value="Paid">✓ Đã thanh toán 100%</option>
                        </select>
                      </div>
                      <div className="form-group-adm">
                        <label>Số tiền đã thu:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="0 VNĐ"
                          value={formatVNDDisplay(createFormData.paid_amount)}
                          onKeyDown={(e) => handleCurrencyKeyDown(e, createFormData.paid_amount, (paidVal) => {
                            const paid = paidVal === "" ? 0 : paidVal;
                            const budget = Number(createFormData.estimated_budget || 0);
                            const rem = Math.max(0, budget - paid);
                            setCreateFormData({
                              ...createFormData,
                              paid_amount: paid,
                              remaining_amount: rem,
                              payment_status: paid >= budget && budget > 0 ? "Paid" : paid > 0 ? "Deposit_Paid" : "Unpaid",
                            });
                          })}
                          onChange={(e) => {
                            const paidVal = parseVNDValue(e.target.value);
                            const paid = paidVal === "" ? 0 : paidVal;
                            const budget = Number(createFormData.estimated_budget || 0);
                            const rem = Math.max(0, budget - paid);
                            setCreateFormData({
                              ...createFormData,
                              paid_amount: paid,
                              remaining_amount: rem,
                              payment_status: paid >= budget && budget > 0 ? "Paid" : paid > 0 ? "Deposit_Paid" : "Unpaid",
                            });
                          }}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Số tiền còn lại cần thu:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="0 VNĐ"
                          value={formatVNDDisplay(createFormData.remaining_amount)}
                          onKeyDown={(e) => handleCurrencyKeyDown(e, createFormData.remaining_amount, (remVal) => {
                            setCreateFormData({
                              ...createFormData,
                              remaining_amount: remVal === "" ? 0 : remVal,
                            });
                          })}
                          onChange={(e) => {
                            const remVal = parseVNDValue(e.target.value);
                            setCreateFormData({
                              ...createFormData,
                              remaining_amount: remVal === "" ? 0 : remVal,
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Chọn cụm sân thi đấu (Hỗ trợ f.field_name hoặc f.name) */}
                    {fieldsList.length > 0 && (
                      <div className="form-group-adm" style={{ marginTop: "0.5rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#065f46" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#059669" }}>stadium</span>
                          Chọn cụm sân thi đấu:
                        </label>
                        <div className="checkbox-chips-grid">
                          {fieldsList.map((f) => {
                            const fName = f.field_name || f.name;
                            const isChecked = (createFormData.selected_fields || []).includes(fName);
                            return (
                              <label
                                key={f.id}
                                className={`checkbox-chip ${isChecked ? "active" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCreateFormData({
                                        ...createFormData,
                                        selected_fields: [...(createFormData.selected_fields || []), fName],
                                      });
                                    } else {
                                      setCreateFormData({
                                        ...createFormData,
                                        selected_fields: (createFormData.selected_fields || []).filter((x) => x !== fName),
                                      });
                                    }
                                  }}
                                />
                                <span>{fName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Vật tư & Tiện ích tại sân (Có hình ảnh, chọn số lượng, size giày, kiểm tra kho) */}
                    {systemServices.length > 0 && (
                      <div className="form-group-adm">
                        <label style={{ fontWeight: 700, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#059669" }}>inventory_2</span>
                          Vật tư &amp; Tiện ích tại sân:
                        </label>
                        <div className="adm-supplies-grid">
                          {systemServices.map((s) => {
                            const qty = createSuppliesQuantities[s.id] || 0;
                            const isShoe = isShoeService(s);
                            const maxStock = s.stock !== undefined && s.stock !== null ? Number(s.stock) : 999;
                            const isOutOfStock = maxStock <= 0;

                            return (
                              <div key={s.id} className={`adm-supply-card ${qty > 0 ? "has-qty" : ""} ${isOutOfStock ? "out-of-stock" : ""}`}>
                                <div className="adm-supply-img-wrap">
                                  {s.image ? (
                                    <img src={getFullImageUrl(s.image)} alt={s.name} className="adm-supply-img" />
                                  ) : (
                                    <span className="material-symbols-outlined adm-supply-placeholder">
                                      {s.category === "Do uong" || s.name?.toLowerCase().includes("nước")
                                        ? "water_drop"
                                        : isShoe
                                        ? "steps"
                                        : s.name?.toLowerCase().includes("áo") || s.name?.toLowerCase().includes("bib")
                                        ? "checkroom"
                                        : "sports_soccer"}
                                    </span>
                                  )}
                                  {qty > 0 && <span className="adm-supply-badge">x{qty}</span>}
                                </div>

                                <div className="adm-supply-info">
                                  <div className="adm-supply-title" title={s.name}>{s.name}</div>
                                  <div className="adm-supply-price">
                                    {Number(s.price || 0) === 0 ? "Miễn phí" : `${Number(s.price).toLocaleString("vi-VN")}đ`}
                                    {s.unit ? ` / ${s.unit}` : ""}
                                  </div>

                                  {isShoe && qty > 0 && (
                                    <div className="adm-supply-size-row">
                                      <span>Size:</span>
                                      <select
                                        className="adm-supply-size-select"
                                        value={createShoeSizes[s.id] || "41"}
                                        onChange={(e) => updateCreateShoeSize(s.id, e.target.value)}
                                      >
                                        {[38, 39, 40, 41, 42, 43, 44].map((sz) => (
                                          <option key={sz} value={sz}>{sz}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>

                                <div className="adm-supply-action-col">
                                  <div className="adm-supply-stepper">
                                    <button
                                      type="button"
                                      className="adm-stepper-btn minus"
                                      onClick={() => updateCreateSupplyQuantity(s.id, -1)}
                                      disabled={qty <= 0}
                                      title="Giảm số lượng"
                                    >
                                      -
                                    </button>
                                    <span className="adm-stepper-qty">{qty}</span>
                                    <button
                                      type="button"
                                      className="adm-stepper-btn plus"
                                      onClick={() => updateCreateSupplyQuantity(s.id, 1)}
                                      disabled={qty >= maxStock || isOutOfStock}
                                      title={isOutOfStock ? "Hết kho" : qty >= maxStock ? `Kho chỉ còn ${maxStock}` : "Tăng số lượng"}
                                    >
                                      +
                                    </button>
                                  </div>
                                  <div className={`adm-supply-stock ${isOutOfStock ? "out" : ""}`}>
                                    {isOutOfStock ? "Hết kho" : `Kho: ${maxStock}`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ghi chú */}
                    <div className="form-row-2">
                      <div className="form-group-adm">
                        <label>Ghi chú của khách:</label>
                        <textarea
                          rows={2}
                          className="adm-textarea"
                          placeholder="Yêu cầu từ khách..."
                          value={createFormData.notes}
                          onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm highlight-adm-notes">
                        <label>
                          <span className="material-symbols-outlined">lock</span>
                          Ghi chú điều phối nội bộ (Admin):
                        </label>
                        <textarea
                          rows={2}
                          className="adm-textarea"
                          placeholder="Ghi chú bảo mật cho ban quản trị..."
                          value={createFormData.admin_notes}
                          onChange={(e) => setCreateFormData({ ...createFormData, admin_notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setShowCreateModal(false)}
                    disabled={savingCreate}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={handleSaveCreate}
                    disabled={savingCreate}
                  >
                    {savingCreate ? (
                      "Đang tạo..."
                    ) : (
                      <>
                        <span className="material-symbols-outlined">add_task</span>
                        Tạo Giải Đấu
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              MODAL: XEM CHI TIẾT (VIEW DETAIL)
             ═══════════════════════════════════════════════════════════ */}
          {selectedView && (
            <div className="modal-overlay" onClick={() => setSelectedView(null)}>
              <div className="modal modal-tour-view" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title-group">
                    <span className="material-symbols-outlined modal-title-icon" style={{ color: "#059669", background: "#ecfdf5" }}>
                      emoji_events
                    </span>
                    <div>
                      <h3>Chi Tiết Yêu Cầu Giải Đấu</h3>
                      <p className="modal-subtitle">
                        Mã: <span className="code-badge">{selectedView.request_id_short}</span> •{" "}
                        {selectedView.tournament_name}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setSelectedView(null)}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="modal-body tour-modal-body">
                  <div className="tour-view-grid">
                    {/* Cột 1: Ban tổ chức & Liên hệ */}
                    <div className="tour-view-card">
                      <div className="card-head">
                        <span className="material-symbols-outlined">contact_page</span>
                        <h4>Ban Tổ Chức &amp; Liên Hệ</h4>
                      </div>
                      <div className="view-field">
                        <label>Đơn vị / Ban tổ chức:</label>
                        <p className="highlight-text">{selectedView.organization || "Cá nhân / Đội bóng tự do"}</p>
                      </div>
                      <div className="view-field">
                        <label>Người đại diện liên hệ:</label>
                        <p className="fw-700">{selectedView.contact_name}</p>
                      </div>
                      <div className="view-field">
                        <label>Số điện thoại:</label>
                        <div className="field-with-action">
                          <a href={`tel:${selectedView.contact_phone}`} className="phone-link">
                            {selectedView.contact_phone}
                          </a>
                          <button
                            type="button"
                            className="btn-tiny-copy"
                            onClick={() => handleCopyText(selectedView.contact_phone, "Số điện thoại")}
                            title="Sao chép SĐT"
                          >
                            <span className="material-symbols-outlined">content_copy</span>
                          </button>
                        </div>
                      </div>
                      <div className="view-field">
                        <label>Email liên hệ:</label>
                        <div className="field-with-action">
                          <span>{selectedView.contact_email || "Chưa cung cấp"}</span>
                          {selectedView.contact_email && (
                            <button
                              type="button"
                              className="btn-tiny-copy"
                              onClick={() => handleCopyText(selectedView.contact_email, "Email")}
                              title="Sao chép Email"
                            >
                              <span className="material-symbols-outlined">content_copy</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cột 2: Thời gian & Quy mô */}
                    <div className="tour-view-card">
                      <div className="card-head">
                        <span className="material-symbols-outlined">event</span>
                        <h4>Lịch Trình &amp; Quy Mô Giải</h4>
                      </div>
                      <div className="view-field">
                        <label>Thời gian giải đấu:</label>
                        <p className="fw-700 text-emerald">
                          {new Date(selectedView.start_date).toLocaleDateString("vi-VN")} →{" "}
                          {new Date(selectedView.end_date).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                      <div className="view-field">
                        <label>Số lượng đội bóng dự kiến:</label>
                        <p className="fw-700">{selectedView.expected_teams || 8} đội tham gia</p>
                      </div>
                      <div className="view-field">
                        <label>Khung giờ thi đấu mong muốn:</label>
                        <p>{selectedView.time_slots_info || "Linh hoạt theo thỏa thuận sân cỏ"}</p>
                      </div>
                      <div className="view-field">
                        <label>Sân bóng yêu cầu:</label>
                        <div className="tags-flex-left">
                          {parseJsonSafe(selectedView.selected_fields_info).length > 0 ? (
                            parseJsonSafe(selectedView.selected_fields_info).map((fn, idx) => (
                              <span key={idx} className="field-tag">{fn}</span>
                            ))
                          ) : (
                            <span className="text-muted">Chưa chỉ định cụm sân</span>
                          )}
                        </div>
                      </div>
                      <div className="view-field">
                        <label>Dịch vụ hỗ trợ kèm theo:</label>
                        <div className="services-chips-wrap">
                          {parseJsonSafe(selectedView.services_requested).length > 0 ? (
                            parseJsonSafe(selectedView.services_requested).map((serv, idx) => (
                              <span key={idx} className="serv-chip">
                                <span className="material-symbols-outlined">check_circle</span>
                                {serv}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">Không yêu cầu dịch vụ thêm</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cột 3: Tiến độ & Ghi chú */}
                    <div className="tour-view-card full-width">
                      <div className="card-head">
                        <span className="material-symbols-outlined">tune</span>
                        <h4>Tiến Độ Xử Lý &amp; Ghi Chú Điều Phối</h4>
                      </div>

                      <div className="progress-summary-row">
                        <div className="summary-col">
                          <label>Trạng thái hiện tại:</label>
                          <div>
                            {(() => {
                              const st = STATUS_MAP[selectedView.status] || STATUS_MAP.Pending;
                              return (
                                <span
                                  className="tour-status-pill"
                                  style={{ color: st.color, background: st.bg, borderColor: st.border }}
                                >
                                  <span className="status-dot" style={{ background: st.color }} />
                                  {st.label}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="summary-col">
                          <label>Dự toán ngân sách:</label>
                          <p className="budget-val">
                            {selectedView.estimated_budget
                              ? `${Math.round(Number(selectedView.estimated_budget)).toLocaleString("vi-VN")} VNĐ`
                              : "Chưa báo giá"}
                          </p>
                        </div>

                        <div className="summary-col">
                          <label>Ngày gửi yêu cầu:</label>
                          <p>{selectedView.created_at ? new Date(selectedView.created_at).toLocaleString("vi-VN") : "—"}</p>
                        </div>
                      </div>

                      {selectedView.notes && (
                        <div className="customer-note-box">
                          <small>Ghi chú từ khách hàng:</small>
                          <p>{selectedView.notes}</p>
                        </div>
                      )}

                      <div className="admin-notes-box">
                        <small>Ghi chú điều phối nội bộ (Admin):</small>
                        <p>{selectedView.admin_notes || "Chưa có ghi chú nội bộ."}</p>
                      </div>
                    </div>

                    {/* Cột 4: Thông tin thanh toán & tài chính */}
                    <div className="tour-view-card full-width">
                      <div className="card-head">
                        <span className="material-symbols-outlined">payments</span>
                        <h4>Thông Tin Thanh Toán &amp; Tài Chính</h4>
                      </div>
                      <div className="admin-tour-pay-grid" style={{ padding: "12px 14px" }}>
                        <div className="admin-tour-pay-item">
                          <span className="lbl">Trạng thái thanh toán:</span>
                          <div>
                            {(() => {
                              const pStatus = String(selectedView.payment_status || "Unpaid").toLowerCase().trim();
                              const isFullPaid = (pStatus === "paid" || pStatus === "completed" || pStatus === "success" || pStatus === "full_paid");
                              const isDepositPaid = (pStatus === "deposit_paid" || pStatus === "partial_paid");
                              if (isFullPaid) {
                                return (
                                  <span className="tour-pay-badge tour-pay-full">
                                    <span className="material-symbols-outlined">check_circle</span>
                                    Đã thanh toán 100%
                                  </span>
                                );
                              } else if (isDepositPaid) {
                                return (
                                  <span className="tour-pay-badge tour-pay-deposit">
                                    <span className="material-symbols-outlined">bolt</span>
                                    Đã cọc trước 50%
                                  </span>
                                );
                              }
                              return (
                                <span className="tour-pay-badge tour-pay-unpaid">
                                  <span className="material-symbols-outlined">pending</span>
                                  Chưa thanh toán
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="admin-tour-pay-item">
                          <span className="lbl">Hình thức chọn ban đầu:</span>
                          <span className="val">
                            {selectedView.payment_method === "deposit"
                              ? "Đặt cọc trước 50% (SePay)"
                              : "Thanh toán toàn bộ 100% (SePay)"}
                          </span>
                        </div>

                        <div className="admin-tour-pay-item">
                          <span className="lbl">Số tiền đã thanh toán:</span>
                          <span className="val paid-amt">
                            {Math.round(Number(selectedView.paid_amount || 0)).toLocaleString("vi-VN")} VNĐ
                          </span>
                        </div>

                        <div className="admin-tour-pay-item">
                          <span className="lbl">Số tiền còn lại (tại sân):</span>
                          <span className="val rem-amt">
                            {Math.round(Number(selectedView.remaining_amount || 0)).toLocaleString("vi-VN")} VNĐ
                          </span>
                        </div>

                        <div className="admin-tour-pay-item">
                          <span className="lbl">Mã giao dịch / Nội dung CK:</span>
                          <span className="val font-mono">
                            {selectedView.transaction_id || `TR${String(selectedView.id).slice(0, 8).toUpperCase()}`}
                          </span>
                        </div>

                        <div className="admin-tour-pay-item">
                          <span className="lbl">Thời gian thanh toán:</span>
                          <span className="val">
                            {selectedView.payment_date
                              ? new Date(selectedView.payment_date).toLocaleString("vi-VN")
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-modal-action btn-delete-alt"
                    onClick={() => {
                      const toDel = selectedView;
                      setSelectedView(null);
                      setSelectedDelete(toDel);
                    }}
                  >
                    <span className="material-symbols-outlined">delete</span>
                    Xóa yêu cầu
                  </button>
                  <div style={{ display: "flex", gap: "0.6rem" }}>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setSelectedView(null)}
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      className="btn-confirm"
                      onClick={() => {
                        const toEdit = selectedView;
                        setSelectedView(null);
                        handleOpenEdit(toEdit);
                      }}
                    >
                      <span className="material-symbols-outlined">edit</span>
                      Chỉnh Sửa Yêu Cầu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              MODAL: CHỈNH SỬA (EDIT)
             ═══════════════════════════════════════════════════════════ */}
          {selectedEdit && (
            <div className="modal-overlay" onClick={() => setSelectedEdit(null)}>
              <div className="modal modal-tour-edit" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title-group">
                    <span className="material-symbols-outlined modal-title-icon" style={{ color: "#2563eb", background: "#eff6ff" }}>
                      edit_document
                    </span>
                    <div>
                      <h3>Chỉnh Sửa Yêu Cầu Giải Đấu</h3>
                      <p className="modal-subtitle">
                        Mã: <span className="code-badge">{selectedEdit.request_id_short}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setSelectedEdit(null)}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="modal-body tour-modal-body">
                  <div className="edit-form-grid">
                    {/* Hàng 1: Tên giải đấu & Đơn vị tổ chức */}
                    <div className="form-row-2">
                      <div className="form-group-adm">
                        <label>Tên giải đấu <span className="req">*</span></label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: Cúp Mùa Thu Doanh Nghiệp 2026"
                          value={editFormData.tournament_name}
                          onChange={(e) => setEditFormData({ ...editFormData, tournament_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Đơn vị / Ban tổ chức:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: FPT Software, Đội bóng ACB..."
                          value={editFormData.organization}
                          onChange={(e) => setEditFormData({ ...editFormData, organization: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Hàng 2: Người liên hệ, SĐT, Email */}
                    <div className="form-row-3">
                      <div className="form-group-adm">
                        <label>Người liên hệ <span className="req">*</span></label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: Nguyễn Văn A"
                          value={editFormData.contact_name}
                          onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Số điện thoại <span className="req">*</span></label>
                        <input
                          type="tel"
                          className="adm-input"
                          placeholder="VD: 0912345678"
                          value={editFormData.contact_phone}
                          onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Email liên hệ:</label>
                        <input
                          type="email"
                          className="adm-input"
                          placeholder="VD: contact@company.vn"
                          value={editFormData.contact_email}
                          onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Hàng 3: Thời gian & Số đội (Ngày kết thúc không được trước ngày bắt đầu) */}
                    <div className="form-row-3">
                      <div className="form-group-adm">
                        <label>Ngày bắt đầu <span className="req">*</span></label>
                        <input
                          type="date"
                          className="adm-input"
                          min={new Date().toISOString().split("T")[0]}
                          value={editFormData.start_date}
                          onChange={(e) => {
                            const newStart = e.target.value;
                            setEditFormData((prev) => ({
                              ...prev,
                              start_date: newStart,
                              end_date: prev.end_date && prev.end_date < newStart ? newStart : prev.end_date,
                            }));
                          }}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Ngày kết thúc <span className="req">*</span></label>
                        <input
                          type="date"
                          className="adm-input"
                          min={editFormData.start_date || new Date().toISOString().split("T")[0]}
                          value={editFormData.end_date}
                          onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Số đội tham gia:</label>
                        <input
                          type="number"
                          className="adm-input"
                          min="2"
                          max="64"
                          value={editFormData.expected_teams}
                          onChange={(e) => setEditFormData({ ...editFormData, expected_teams: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Hàng 4: Khung giờ & Trạng thái & Ngân sách (Bấm vào cả ô để mở form chọn khung giờ) */}
                    <div className="form-row-3">
                      <div className="form-group-adm">
                        <label>Khung giờ thi đấu <span className="req">*</span></label>
                        <div
                          className="adm-clickable-input-wrap"
                          onClick={() => handleOpenSlotPicker("edit")}
                          title="Nhấn để chọn khung giờ thi đấu"
                        >
                          <input
                            type="text"
                            readOnly
                            className="adm-input adm-slot-input"
                            placeholder="Nhấn vào đây để chọn khung giờ..."
                            value={editFormData.time_slots_info}
                          />
                          <span className="material-symbols-outlined adm-slot-icon">schedule</span>
                        </div>
                      </div>
                      <div className="form-group-adm">
                        <label>Trạng thái xử lý:</label>
                        <select
                          className="adm-select"
                          value={editFormData.status}
                          onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                        >
                          <option value="Pending">⏳ Chờ xử lý</option>
                          <option value="Contacted">📞 Đã liên hệ tư vấn</option>
                          <option value="Approved">✅ Đã chốt duyệt &amp; Giữ sân</option>
                          <option value="Rejected">❌ Từ chối</option>
                          <option value="Cancelled">🚫 Khách đã hủy</option>
                        </select>
                      </div>
                      <div className="form-group-adm">
                        <label>Dự toán ngân sách:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="VD: 15.000.000 VNĐ"
                          value={formatVNDDisplay(editFormData.estimated_budget)}
                          onKeyDown={(e) => handleCurrencyKeyDown(e, editFormData.estimated_budget, (val) => {
                            const paid = Number(editFormData.paid_amount || 0);
                            const rem = val === "" ? 0 : Math.max(0, val - paid);
                            setEditFormData({
                              ...editFormData,
                              estimated_budget: val,
                              remaining_amount: rem,
                            });
                          })}
                          onChange={(e) => {
                            const val = parseVNDValue(e.target.value);
                            const paid = Number(editFormData.paid_amount || 0);
                            const rem = val === "" ? 0 : Math.max(0, val - paid);
                            setEditFormData({
                              ...editFormData,
                              estimated_budget: val,
                              remaining_amount: rem,
                            });
                          }}
                        />
                        {Number(editFormData.estimated_budget) > 0 && (
                          <small className="budget-hint">
                            Bằng chữ: {Math.round(Number(editFormData.estimated_budget)).toLocaleString("vi-VN")} VNĐ
                          </small>
                        )}
                      </div>
                    </div>

                    {/* Phần cập nhật thanh toán dành cho Quản trị viên (Định dạng phân cách hàng nghìn . và đuôi VNĐ) */}
                    <div className="form-row-3" style={{ marginTop: "1rem" }}>
                      <div className="form-group-adm">
                        <label>Trạng thái thanh toán:</label>
                        <select
                          className="adm-select"
                          value={editFormData.payment_status}
                          onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value })}
                        >
                          <option value="Unpaid">⏳ Chưa thanh toán</option>
                          <option value="Deposit_Paid">⚡ Đã cọc trước 50%</option>
                          <option value="Paid">✓ Đã thanh toán 100%</option>
                        </select>
                      </div>
                      <div className="form-group-adm">
                        <label>Số tiền đã thu:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="0 VNĐ"
                          value={formatVNDDisplay(editFormData.paid_amount)}
                          onKeyDown={(e) => handleCurrencyKeyDown(e, editFormData.paid_amount, (paidVal) => {
                            const paid = paidVal === "" ? 0 : paidVal;
                            const budget = Number(editFormData.estimated_budget || 0);
                            const rem = Math.max(0, budget - paid);
                            setEditFormData({
                              ...editFormData,
                              paid_amount: paid,
                              remaining_amount: rem,
                              payment_status: paid >= budget && budget > 0 ? "Paid" : paid > 0 ? "Deposit_Paid" : "Unpaid",
                            });
                          })}
                          onChange={(e) => {
                            const paidVal = parseVNDValue(e.target.value);
                            const paid = paidVal === "" ? 0 : paidVal;
                            const budget = Number(editFormData.estimated_budget || 0);
                            const rem = Math.max(0, budget - paid);
                            setEditFormData({
                              ...editFormData,
                              paid_amount: paid,
                              remaining_amount: rem,
                              payment_status: paid >= budget && budget > 0 ? "Paid" : paid > 0 ? "Deposit_Paid" : "Unpaid",
                            });
                          }}
                        />
                      </div>
                      <div className="form-group-adm">
                        <label>Số tiền còn lại cần thu:</label>
                        <input
                          type="text"
                          className="adm-input"
                          placeholder="0 VNĐ"
                          value={formatVNDDisplay(editFormData.remaining_amount)}
                          onKeyDown={(e) => handleCurrencyKeyDown(e, editFormData.remaining_amount, (remVal) => {
                            setEditFormData({
                              ...editFormData,
                              remaining_amount: remVal === "" ? 0 : remVal,
                            });
                          })}
                          onChange={(e) => {
                            const remVal = parseVNDValue(e.target.value);
                            setEditFormData({
                              ...editFormData,
                              remaining_amount: remVal === "" ? 0 : remVal,
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Chọn cụm sân thi đấu (Hỗ trợ f.field_name hoặc f.name) */}
                    {fieldsList.length > 0 && (
                      <div className="form-group-adm" style={{ marginTop: "0.5rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, color: "#065f46" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#059669" }}>stadium</span>
                          Chọn cụm sân thi đấu:
                        </label>
                        <div className="checkbox-chips-grid">
                          {fieldsList.map((f) => {
                            const fName = f.field_name || f.name;
                            const isChecked = (editFormData.selected_fields || []).includes(fName);
                            return (
                              <label
                                key={f.id}
                                className={`checkbox-chip ${isChecked ? "active" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditFormData({
                                        ...editFormData,
                                        selected_fields: [...(editFormData.selected_fields || []), fName],
                                      });
                                    } else {
                                      setEditFormData({
                                        ...editFormData,
                                        selected_fields: (editFormData.selected_fields || []).filter((x) => x !== fName),
                                      });
                                    }
                                  }}
                                />
                                <span>{fName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Vật tư & Tiện ích tại sân (Chỉnh sửa số lượng, size giày, thêm mới hoặc điều chỉnh) */}
                    {systemServices.length > 0 && (
                      <div className="form-group-adm">
                        <label style={{ fontWeight: 700, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#059669" }}>inventory_2</span>
                          Vật tư &amp; Tiện ích tại sân:
                        </label>
                        <div className="adm-supplies-grid">
                          {systemServices.map((s) => {
                            const qty = editSuppliesQuantities[s.id] || 0;
                            const isShoe = isShoeService(s);
                            const maxStock = s.stock !== undefined && s.stock !== null ? Number(s.stock) : 999;
                            const isOutOfStock = maxStock <= 0;

                            return (
                              <div key={s.id} className={`adm-supply-card ${qty > 0 ? "has-qty" : ""} ${isOutOfStock ? "out-of-stock" : ""}`}>
                                <div className="adm-supply-img-wrap">
                                  {s.image ? (
                                    <img src={getFullImageUrl(s.image)} alt={s.name} className="adm-supply-img" />
                                  ) : (
                                    <span className="material-symbols-outlined adm-supply-placeholder">
                                      {s.category === "Do uong" || s.name?.toLowerCase().includes("nước")
                                        ? "water_drop"
                                        : isShoe
                                        ? "steps"
                                        : s.name?.toLowerCase().includes("áo") || s.name?.toLowerCase().includes("bib")
                                        ? "checkroom"
                                        : "sports_soccer"}
                                    </span>
                                  )}
                                  {qty > 0 && <span className="adm-supply-badge">x{qty}</span>}
                                </div>

                                <div className="adm-supply-info">
                                  <div className="adm-supply-title" title={s.name}>{s.name}</div>
                                  <div className="adm-supply-price">
                                    {Number(s.price || 0) === 0 ? "Miễn phí" : `${Number(s.price).toLocaleString("vi-VN")}đ`}
                                    {s.unit ? ` / ${s.unit}` : ""}
                                  </div>

                                  {isShoe && qty > 0 && (
                                    <div className="adm-supply-size-row">
                                      <span>Size:</span>
                                      <select
                                        className="adm-supply-size-select"
                                        value={editShoeSizes[s.id] || "41"}
                                        onChange={(e) => updateEditShoeSize(s.id, e.target.value)}
                                      >
                                        {[38, 39, 40, 41, 42, 43, 44].map((sz) => (
                                          <option key={sz} value={sz}>{sz}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>

                                <div className="adm-supply-action-col">
                                  <div className="adm-supply-stepper">
                                    <button
                                      type="button"
                                      className="adm-stepper-btn minus"
                                      onClick={() => updateEditSupplyQuantity(s.id, -1)}
                                      disabled={qty <= 0}
                                      title="Giảm số lượng"
                                    >
                                      -
                                    </button>
                                    <span className="adm-stepper-qty">{qty}</span>
                                    <button
                                      type="button"
                                      className="adm-stepper-btn plus"
                                      onClick={() => updateEditSupplyQuantity(s.id, 1)}
                                      disabled={qty >= maxStock || isOutOfStock}
                                      title={isOutOfStock ? "Hết kho" : qty >= maxStock ? `Kho chỉ còn ${maxStock}` : "Tăng số lượng"}
                                    >
                                      +
                                    </button>
                                  </div>
                                  <div className={`adm-supply-stock ${isOutOfStock ? "out" : ""}`}>
                                    {isOutOfStock ? "Hết kho" : `Kho: ${maxStock}`}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Hàng 5: Ghi chú khách & Admin */}
                    <div className="form-row-2">
                      <div className="form-group-adm">
                        <label>Ghi chú của khách hàng:</label>
                        <textarea
                          rows={2}
                          className="adm-textarea"
                          placeholder="Yêu cầu riêng từ khách..."
                          value={editFormData.notes}
                          onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        />
                      </div>
                      <div className="form-group-adm highlight-adm-notes">
                        <label>
                          <span className="material-symbols-outlined">lock</span>
                          Ghi chú điều phối nội bộ (Admin):
                        </label>
                        <textarea
                          rows={2}
                          className="adm-textarea"
                          placeholder="Ghi chú điều phối cho ban quản lý..."
                          value={editFormData.admin_notes}
                          onChange={(e) => setEditFormData({ ...editFormData, admin_notes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setSelectedEdit(null)}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      "Đang lưu..."
                    ) : (
                      <>
                        <span className="material-symbols-outlined">save</span>
                        Lưu Cập Nhật
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              MODAL: XÁC NHẬN XÓA (DELETE)
             ═══════════════════════════════════════════════════════════ */}
                {/* ── MODAL CHỌN KHUNG GIỜ THI ĐẤU DÀNH CHO ADMIN ── */}
      {slotPickerModal.isOpen && (() => {
        const isCreate = slotPickerModal.target === "create";
        const currentData = isCreate ? createFormData : editFormData;
        const daysList = getTournamentDaysList(currentData.start_date, currentData.end_date);
        const { mode, selectedCommonSlots, selectedDaySlots, activeDayIndex, slotNote } = slotPickerModal;
        const activeDateStr = daysList[activeDayIndex]?.dateStr;

        const isSlotChecked = (slot) => {
          if (mode === "custom_days") {
            if (!activeDateStr) return false;
            return (selectedDaySlots[activeDateStr] || []).includes(slot);
          }
          return selectedCommonSlots.includes(slot);
        };

        // Xem trước kết quả
        let previewSummary = "";
        if (mode === "all_days") {
          previewSummary = selectedCommonSlots.length > 0 ? `Các ngày trong giải: ${selectedCommonSlots.join(", ")}` : "Chưa chọn khung giờ nào";
        } else if (mode === "weekends") {
          previewSummary = selectedCommonSlots.length > 0 ? `Chỉ Thứ 7 & Chủ Nhật: ${selectedCommonSlots.join(", ")}` : "Chưa chọn khung giờ nào";
        } else if (mode === "custom_days") {
          const parts = Object.entries(selectedDaySlots)
            .filter(([_, slots]) => slots.length > 0)
            .map(([date, slots]) => {
              const d = new Date(date);
              const formatted = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
              return `${formatted}: ${slots.join(", ")}`;
            });
          previewSummary = parts.length > 0 ? parts.join("; ") : "Chưa thiết lập khung giờ theo ngày cụ thể";
        }
        if (slotNote && slotNote.trim()) {
          previewSummary += ` | Ghi chú: ${slotNote.trim()}`;
        }

        return (
          <div className="adm-slot-picker-overlay" onClick={() => setSlotPickerModal((prev) => ({ ...prev, isOpen: false }))}>
            <div className="adm-slot-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="adm-slot-picker-header">
                <div className="adm-slot-picker-title-group">
                  <div className="adm-slot-picker-icon">
                    <span className="material-symbols-outlined">schedule</span>
                  </div>
                  <div>
                    <h3 className="adm-slot-picker-title">Thiết Lập Khung Giờ Thi Đấu</h3>
                    <p className="adm-slot-picker-desc">
                      {isCreate ? "Áp dụng cho phiếu Thêm mới" : "Áp dụng cho phiếu Chỉnh sửa"} • Chọn khung giờ chung hoặc chi tiết từng ngày
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="adm-slot-picker-close"
                  onClick={() => setSlotPickerModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  ✕
                </button>
              </div>

              <div className="adm-slot-picker-body">
                {/* 1. Chọn chế độ áp dụng */}
                <div className="adm-slot-mode-selector">
                  <button
                    type="button"
                    className={`adm-slot-mode-btn ${mode === "all_days" ? "active" : ""}`}
                    onClick={() => setSlotPickerModal((prev) => ({ ...prev, mode: "all_days" }))}
                  >
                    ⚡ Tất cả các ngày
                  </button>
                  <button
                    type="button"
                    className={`adm-slot-mode-btn ${mode === "weekends" ? "active" : ""}`}
                    onClick={() => setSlotPickerModal((prev) => ({ ...prev, mode: "weekends" }))}
                  >
                    📅 Chỉ T7 &amp; Chủ Nhật
                  </button>
                  <button
                    type="button"
                    className={`adm-slot-mode-btn ${mode === "custom_days" ? "active" : ""}`}
                    onClick={() => {
                      if (daysList.length === 0) {
                        toast.warning("Vui lòng chọn ngày bắt đầu & kết thúc ở form để dùng chế độ từng ngày!");
                      }
                      setSlotPickerModal((prev) => ({ ...prev, mode: "custom_days" }));
                    }}
                  >
                    🛠️ Từng ngày cụ thể
                  </button>
                </div>

                {/* 2. Nếu là chế độ từng ngày: Danh sách ngày nằm ngang */}
                {mode === "custom_days" && (
                  <div>
                    {daysList.length > 0 ? (
                      <div className="adm-slot-days-scroller">
                        {daysList.map((d, idx) => {
                          const slotCount = (selectedDaySlots[d.dateStr] || []).length;
                          return (
                            <div
                              key={d.dateStr}
                              className={`adm-slot-day-pill ${activeDayIndex === idx ? "active" : ""}`}
                              onClick={() => setSlotPickerModal((prev) => ({ ...prev, activeDayIndex: idx }))}
                            >
                              <div className="day-w">{d.weekdayName}</div>
                              <div className="day-d">{d.displayDate}</div>
                              <div className="day-count">{slotCount > 0 ? `${slotCount} slot` : "Chưa chọn"}</div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ background: "#fef3c7", padding: "8px 12px", borderRadius: "8px", fontSize: "0.82rem", color: "#b45309", marginBottom: "1rem" }}>
                        ⚠️ Chưa chọn ngày bắt đầu và kết thúc ở form. Vui lòng chọn ngày ở form chính để hiển thị lịch từng ngày.
                      </div>
                    )}
                  </div>
                )}

                {/* Nút chọn nhanh */}
                <div className="adm-slot-quick-actions">
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>Chọn nhanh:</span>
                  <button
                    type="button"
                    className="adm-slot-quick-btn"
                    onClick={() => {
                      const quick = ["17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00"];
                      if (mode === "custom_days" && activeDateStr) {
                        setSlotPickerModal((prev) => ({
                          ...prev,
                          selectedDaySlots: { ...prev.selectedDaySlots, [activeDateStr]: quick },
                        }));
                      } else {
                        setSlotPickerModal((prev) => ({ ...prev, selectedCommonSlots: quick }));
                      }
                    }}
                  >
                    Ca Tối (17h - 20h)
                  </button>
                  <button
                    type="button"
                    className="adm-slot-quick-btn"
                    onClick={() => {
                      const quick = ["18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00"];
                      if (mode === "custom_days" && activeDateStr) {
                        setSlotPickerModal((prev) => ({
                          ...prev,
                          selectedDaySlots: { ...prev.selectedDaySlots, [activeDateStr]: quick },
                        }));
                      } else {
                        setSlotPickerModal((prev) => ({ ...prev, selectedCommonSlots: quick }));
                      }
                    }}
                  >
                    Ca Muộn (18h - 21h)
                  </button>
                  <button
                    type="button"
                    className="adm-slot-quick-btn"
                    onClick={() => {
                      if (mode === "custom_days" && activeDateStr) {
                        setSlotPickerModal((prev) => ({
                          ...prev,
                          selectedDaySlots: { ...prev.selectedDaySlots, [activeDateStr]: [] },
                        }));
                      } else {
                        setSlotPickerModal((prev) => ({ ...prev, selectedCommonSlots: [] }));
                      }
                    }}
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>

                {/* 3. Danh sách slot: Ca Sáng */}
                <div className="adm-slot-section-title">
                  <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#f59e0b" }}>wb_sunny</span>
                  Ca Sáng (06:00 - 12:00)
                </div>
                <div className="adm-slot-chips-grid">
                  {MORNING_SLOTS.map((slot) => {
                    const checked = isSlotChecked(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`adm-slot-chip ${checked ? "selected" : ""}`}
                        onClick={() => handleTogglePickerSlot(slot)}
                      >
                        <span>{checked ? "✓" : "+"}</span>
                        <span>{slot}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 4. Danh sách slot: Ca Chiều & Tối */}
                <div className="adm-slot-section-title" style={{ marginTop: "1rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#3b82f6" }}>nightlight</span>
                  Ca Chiều &amp; Tối (Giờ vàng thi đấu: 14:00 - 22:00)
                </div>
                <div className="adm-slot-chips-grid">
                  {AFTERNOON_EVENING_SLOTS.map((slot) => {
                    const checked = isSlotChecked(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        className={`adm-slot-chip ${checked ? "selected" : ""}`}
                        onClick={() => handleTogglePickerSlot(slot)}
                      >
                        <span>{checked ? "✓" : "+"}</span>
                        <span>{slot}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 5. Ghi chú thêm */}
                <div style={{ marginTop: "1rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Ghi chú khung giờ thêm (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    className="adm-input"
                    placeholder="VD: Trận chung kết đá 19:00 - 21:00..."
                    value={slotNote}
                    onChange={(e) => setSlotPickerModal((prev) => ({ ...prev, slotNote: e.target.value }))}
                  />
                </div>

                {/* 6. Xem trước kết quả */}
                <div className="adm-slot-preview-box">
                  <div style={{ fontSize: "0.72rem", color: "#047857", fontWeight: 800, textTransform: "uppercase", marginBottom: "2px" }}>
                    👁️ Khung giờ sẽ được lưu:
                  </div>
                  <div>{previewSummary}</div>
                </div>
              </div>

              <div className="adm-slot-picker-footer">
                <button
                  type="button"
                  className="btn-modal-action btn-cancel"
                  onClick={() => setSlotPickerModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  className="btn-modal-action btn-save"
                  onClick={handleConfirmSlotPicker}
                >
                  ✓ Xác Nhận &amp; Áp Dụng Khung Giờ
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {selectedDelete && (
            <div className="modal-overlay" onClick={() => setSelectedDelete(null)}>
              <div className="modal modal-tour-delete" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title-group">
                    <span className="material-symbols-outlined modal-title-icon" style={{ color: "#dc2626", background: "#fef2f2" }}>
                      warning
                    </span>
                    <div>
                      <h3>Xác Nhận Xóa Yêu Cầu</h3>
                      <p className="modal-subtitle">Thao tác này không thể hoàn tác</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="modal-close"
                    onClick={() => setSelectedDelete(null)}
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="modal-body tour-modal-body">
                  <p style={{ margin: "0 0 1rem 0", color: "#334155", lineHeight: 1.5 }}>
                    Bạn có chắc chắn muốn xóa vĩnh viễn yêu cầu giải đấu này khỏi hệ thống không?
                  </p>

                  <div className="delete-info-summary">
                    <div className="delete-summary-row">
                      <span>Mã yêu cầu:</span>
                      <strong>{selectedDelete.request_id_short}</strong>
                    </div>
                    <div className="delete-summary-row">
                      <span>Tên giải đấu:</span>
                      <strong>{selectedDelete.tournament_name}</strong>
                    </div>
                    <div className="delete-summary-row">
                      <span>Người liên hệ:</span>
                      <span>{selectedDelete.contact_name} ({selectedDelete.contact_phone})</span>
                    </div>
                    <div className="delete-summary-row">
                      <span>Đơn vị tổ chức:</span>
                      <span>{selectedDelete.organization || "Cá nhân / Đội bóng"}</span>
                    </div>
                  </div>

                  <p className="delete-warning-text">
                    <span className="material-symbols-outlined">info</span>
                    Sau khi xóa, mọi dữ liệu liên hệ, dự toán và tiến trình điều phối sẽ bị hủy hoàn toàn.
                  </p>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setSelectedDelete(null)}
                    disabled={deleting}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="button"
                    className="btn-danger-confirm"
                    onClick={handleConfirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      "Đang xóa..."
                    ) : (
                      <>
                        <span className="material-symbols-outlined">delete</span>
                        Xác Nhận Xóa
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default Tournaments;
