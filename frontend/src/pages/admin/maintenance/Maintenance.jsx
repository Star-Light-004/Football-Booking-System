import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { getFields, updateField } from "../../../api/fieldsApi";
import {
  getMaintenanceIssues,
  createMaintenanceIssue,
  updateMaintenanceIssue,
  updateMaintenanceStatus,
  deleteMaintenanceIssue,
} from "../../../api/facilityApi";
import AdminSidebar from "../../../components/AdminSidebar/AdminSidebar";
import ConfirmModal from "../../../components/ConfirmModal/ConfirmModal";
import { useToast, ToastContainer } from "../../../components/Toast/Toast";
import { broadcastSyncEvent, onSyncEvent } from "../../../utils/realtimeSync";
import "../dashboard/dashboard.css";
import "./Maintenance.css";
import { MaintenanceStatsPanel } from "./MaintenanceStatsPanel";

// Định dạng hiển thị tiền tệ chuẩn tiếng Việt (dấu chấm phân tách)
const formatCurrency = (val) => {
  return Number(val || 0).toLocaleString("vi-VN");
};

// Định dạng số có dấu chấm phân cách hàng nghìn khi nhập liệu
const formatDotNumber = (val) => {
  if (val === null || val === undefined || val === "") return "";
  const cleaned = String(val).replace(/\D/g, "");
  if (!cleaned) return "";
  return Number(cleaned).toLocaleString("vi-VN");
};

// Chuyển chuỗi có dấu chấm về dạng số thực
const parseDotNumber = (val) => {
  if (!val) return 0;
  const cleaned = String(val).replace(/\D/g, "");
  return parseFloat(cleaned) || 0;
};

// Định dạng ngày giờ chuẩn tiếng Việt gọn đẹp
const formatDateTime = (val) => {
  if (!val) return "";
  if (typeof val !== "string") {
    if (val instanceof Date) {
      return val.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return String(val);
  }
  // Nếu đã ở dạng dd/mm/yyyy hoặc văn bản thân thiện
  if (!val.includes("T") && !val.includes("-") && (val.includes("/") || val.includes("Vừa") || val.includes("Hôm"))) {
    return val;
  }
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  } catch {
    return val;
  }
};

// Phân tích chi tiết mô tả sự cố để hiển thị thông tin rõ ràng, không bị dồn dính:
// 1. Khung giờ ca thi đấu (nếu có)
// 2. Phân loại lỗi cụ thể (trong ngoặc nếu có)
// 3. Ghi chú hư hỏng thực tế (tách xuống dòng riêng)
const parseIssueDescription = (item) => {
  let timeShift = item.bookingTime || null;
  let subCategory = null;
  let note = "";

  let rawDesc = String(item.description || item.issueDetail || "").trim();

  // 1. Tách khung giờ dạng "[Ca 18:00 - 19:00]"
  const caMatch = rawDesc.match(/\[Ca\s+([^\]]+)\]/i);
  if (caMatch) {
    if (!timeShift) {
      timeShift = caMatch[1].trim();
    }
    rawDesc = rawDesc.replace(/\[Ca\s+[^\]]+\]\s*/i, "").trim();
  }

  // 2. Nếu có dấu ":" ngăn cách giữa tên hạng mục/chi tiết lỗi và ghi chú thực tế
  if (rawDesc.includes(":")) {
    const colonIdx = rawDesc.indexOf(":");
    const prefix = rawDesc.substring(0, colonIdx).trim();
    const rest = rawDesc.substring(colonIdx + 1).trim();

    // Tìm chi tiết lỗi trong ngoặc đơn ở phần prefix, ví dụ: "(Rách lưới chắn, xô lệch rào)"
    const parenMatch = prefix.match(/\(([^)]+)\)/);
    if (parenMatch) {
      subCategory = parenMatch[1].trim();
    }

    note = rest;
  } else {
    // Không có dấu ":"
    const parenMatch = rawDesc.match(/\(([^)]+)\)/);
    if (parenMatch) {
      subCategory = parenMatch[1].trim();
      note = rawDesc.replace(/\([^)]+\)/, "").trim();
    } else {
      note = rawDesc;
    }
  }

  // Nếu note trùng với category thì bỏ qua
  const cat = String(item.category || "").trim();
  if (cat && note.toLowerCase() === cat.toLowerCase()) {
    note = "";
  }

  return {
    timeShift,
    subCategory,
    note: note || (subCategory ? "" : "Cần kiểm tra kỹ thuật"),
  };
};

// Hiển thị đầy đủ tất cả các mức độ ưu tiên (Khẩn cấp, Cao, Bình thường, Thấp)
const renderPriorityBadge = (priority) => {
  const p = String(priority || "Bình thường").trim();
  const pLower = p.toLowerCase();

  if (pLower.includes("khẩn cấp")) {
    return <span className="priority-badge priority-urgent">Khẩn cấp</span>;
  }
  if (pLower.includes("cao")) {
    return <span className="priority-badge priority-high">Cao</span>;
  }
  if (pLower.includes("thấp")) {
    return <span className="priority-badge priority-low">Thấp</span>;
  }
  return <span className="priority-badge priority-normal">Bình thường</span>;
};

function TopHeader({ searchQuery, onSearchChange, onAddIssue, onRefresh, loading }) {
  return (
    <header className="top-header">
      <div className="search-wrapper">
        <div className="search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Tìm kiếm thiết bị, sân bóng, sự cố..."
            value={searchQuery || ""}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="header-actions">
        <button
          className="icon-btn"
          type="button"
          title="Làm mới dữ liệu"
          onClick={onRefresh}
          disabled={loading}
        >
          <span className={`material-symbols-outlined ${loading ? "spin-icon" : ""}`}>
            sync
          </span>
        </button>
        <button className="icon-btn" type="button" title="Thông báo">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </div>
    </header>
  );
}

export default function Maintenance() {
  const [fields, setFields] = useState([]);
  const [issues, setIssues] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toasts, removeToast, showToast } = useToast();

  const ISSUES_STORAGE_KEY = "pitch_maintenance_issues";

  // Modal tạo phiếu mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newIssue, setNewIssue] = useState({
    fieldName: "",
    category: "Đèn chiếu sáng cao áp",
    priority: "Khẩn cấp",
    description: "",
    reportedBy: "Bộ phận kỹ thuật",
  });

  // Modal sửa phiếu
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);

  // Modal xem chi tiết sân
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPitch, setSelectedPitch] = useState(null);

  // Modal xác nhận sửa xong
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairingField, setRepairingField] = useState(null);
  const [repairingIssue, setRepairingIssue] = useState(null);
  const [actualCostInput, setActualCostInput] = useState("");

  // Tab chính: "board" (Quản lý bảo trì sân & thiết bị) | "stats" (Thống kê ca bảo trì)
  const [activeMainTab, setActiveMainTab] = useState("board");
  const [statsRange, setStatsRange] = useState("day"); // "day" | "week" | "month" | "all"
  const [statsFieldFilter, setStatsFieldFilter] = useState("all");

  const todayISO = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const [selectedPeriod, setSelectedPeriod] = useState("all"); // "all" | "today" | "week" | "month" | "custom"
  const [selectedDate, setSelectedDate] = useState(todayISO);

  // Danh sách 7 ngày gần nhất để chọn xem phiếu bảo trì theo ngày
  const pastDatesList = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toLocaleDateString("en-CA");
      const [year, month, day] = iso.split("-");
      let label = "";
      if (i === 0) label = `Hôm nay (${day}/${month}/${year})`;
      else if (i === 1) label = `Hôm qua (${day}/${month}/${year})`;
      else label = `${i} ngày trước (${day}/${month}/${year})`;
      list.push({ iso, label, displayDate: `${day}/${month}/${year}` });
    }
    return list;
  }, []);

  const isIssueInPeriod = (item, period, specificDate) => {
    if (!item) return true;
    const raw = item.date || item.created_at || item.createdAt || item.resolved_at || item.resolvedAt || "";
    if (!raw) return true;

    let ymd = "";
    const str = String(raw).trim();
    if (str.toLowerCase().includes("hôm nay") || str.toLowerCase().includes("vừa xong")) {
      ymd = todayISO;
    } else if (str.toLowerCase().includes("hôm qua")) {
      const yd = new Date(Date.now() - 24 * 60 * 60 * 1000);
      ymd = yd.toLocaleDateString("en-CA");
    } else {
      const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        ymd = `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
      } else {
        const slashMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
          ymd = `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`;
        }
      }
    }

    if (specificDate && (period === "custom" || period === "today")) {
      return ymd === specificDate;
    }

    if (!period || period === "all") return true;

    const now = new Date();
    if (period === "today") return ymd === todayISO;

    if (period === "week") {
      if (!ymd) return true;
      const t = new Date(ymd);
      const diff = (now - t) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    }

    if (period === "month") {
      if (!ymd) return true;
      const t = new Date(ymd);
      return t.getFullYear() === now.getFullYear() && t.getMonth() === now.getMonth();
    }

    return true;
  };

  // In-screen dialog confirm
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Xác nhận",
    cancelText: "Hủy bỏ",
    type: "danger",
    onConfirm: () => {},
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getFields({ params: { show_all: "true" } });
      const fieldList = res.data.fields || res.data || [];
      setFields(fieldList);

      if (fieldList.length > 0 && !newIssue.fieldName) {
        setNewIssue((prev) => ({ ...prev, fieldName: fieldList[0].field_name }));
      }

      try {
        const issuesRes = await getMaintenanceIssues();
        const serverIssues = issuesRes.data?.results || issuesRes.data || [];
        if (Array.isArray(serverIssues)) {
          setIssues(serverIssues);
          localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(serverIssues));
        } else {
          setIssues([]);
          localStorage.removeItem(ISSUES_STORAGE_KEY);
        }
      } catch {
        // Chỉ khi mất mạng hoàn toàn mới dùng tạm cache
        const saved = localStorage.getItem(ISSUES_STORAGE_KEY);
        if (saved) {
          try {
            setIssues(JSON.parse(saved));
          } catch {
            setIssues([]);
          }
        } else {
          setIssues([]);
        }
      }
    } catch (error) {
      showToast("Không thể tải thông tin sân bóng", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Tiếp nhận báo hỏng thời gian thực từ Vệ sinh sân hoặc nơi khác gửi xuống
    const cleanupSync = onSyncEvent((event) => {
      if (event?.type === "maintenance_issue_reported") {
        fetchData();
        const rep = event.reportedBy || "Quản lý đặt sân";
        showToast(
          `🔔 Có phiếu báo sự cố mới tại ${event.fieldName || "sân bóng"} (${event.category || "Cơ sở vật chất"}) do ${rep} gửi sang!`,
          "warning"
        );
      } else if (event?.type === "field_maintenance_resolved") {
        fetchData();
      }
    });

    return () => cleanupSync();
  }, []);

  // Khóa cuộn trang nền khi có bất kỳ modal nào đang mở (chỉ form cuộn chuột, trang ngoài không cuộn)
  useEffect(() => {
    const hasOpenModal = showCreateModal || showEditModal || showDetailModal || showRepairModal;
    if (hasOpenModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCreateModal, showEditModal, showDetailModal, showRepairModal]);

  // Lấy danh sách phiếu của sân bóng
  const getPitchIssues = (pitch) => {
    if (!pitch) return [];
    const pName = (pitch.field_name || "").trim().toLowerCase();
    const pId = String(pitch.id || "");
    return issues.filter((i) => {
      const matchId = i.field && String(i.field) === pId;
      const matchName = i.fieldName && (i.fieldName || "").trim().toLowerCase() === pName;
      return matchId || matchName;
    });
  };

  // Lấy các phiếu đang hỏng / cần sửa của sân bóng
  const getPitchActiveIssues = (pitch) => {
    return getPitchIssues(pitch).filter(
      (i) => i.status !== "done" && i.status !== "resolved"
    );
  };

  // Khóa / Mở sân đón khách
  const handleToggleMaintenance = async (field) => {
    const isNowAvailable = field.is_available === false;
    try {
      await updateField(field.id, { is_available: isNowAvailable });
      setFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, is_available: isNowAvailable } : f))
      );
      broadcastSyncEvent("field_updated", { fieldId: field.id, is_available: isNowAvailable });
      showToast(
        isNowAvailable
          ? `Đã mở khóa ${field.field_name} đón khách bình thường`
          : `Đã đưa ${field.field_name} vào trạng thái BẢO TRÌ (Khóa đặt sân)`,
        "success"
      );
    } catch (error) {
      showToast("Lỗi cập nhật trạng thái bảo trì của sân", "error");
    }
  };

  // Cập nhật tiến độ đơn lẻ (Chuyển sang "Đang sửa")
  const handleUpdateIssueStatus = (issueId, newStatus) => {
    const updated = issues.map((item) =>
      item.id === issueId ? { ...item, status: newStatus } : item
    );
    setIssues(updated);
    localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(updated));

    try {
      updateMaintenanceStatus(issueId, newStatus).catch(() => {});
    } catch {}

    if (newStatus === "done") {
      broadcastSyncEvent("field_maintenance_resolved", { issueId });
    }

    showToast(
      newStatus === "done" ? "Đã sửa xong phiếu bảo trì" : "Đã cập nhật tiến độ bảo trì",
      "success"
    );
  };

  // Mở modal xác nhận sửa xong: hiển thị thông báo xác nhận để nhập chi phí thực tế
  const openRepairModal = (field, specificIssue = null) => {
    setRepairingField(field);
    setRepairingIssue(specificIssue);

    let defaultCost = 0;
    if (specificIssue && specificIssue.cost) {
      defaultCost = parseFloat(specificIssue.cost) || 0;
    }

    setActualCostInput(defaultCost > 0 ? formatDotNumber(defaultCost) : "");
    setShowRepairModal(true);
  };

  // Xác nhận sửa xong -> Đổi trạng thái 'done', lưu chi phí thực tế, hết chấm đỏ
  const handleConfirmRepairDone = async () => {
    const actualCost = parseDotNumber(actualCostInput);
    const nowTimeStr = new Date().toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (repairingIssue) {
      // Sửa xong một phiếu cụ thể
      const updated = issues.map((item) => {
        if (item.id === repairingIssue.id) {
          return {
            ...item,
            status: "done",
            cost: actualCost,
            resolvedAt: nowTimeStr,
            resolved_at: new Date().toISOString(),
          };
        }
        return item;
      });
      setIssues(updated);
      localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(updated));

      try {
        await updateMaintenanceStatus(repairingIssue.id, "done", actualCost);
      } catch {}

      broadcastSyncEvent("field_maintenance_resolved", {
        issueId: repairingIssue.id,
        fieldName: repairingIssue.fieldName || repairingIssue.field_name,
      });

      showToast(`Đã xác nhận sửa xong phiếu sự cố "${repairingIssue.category}"!`, "success");
    } else if (repairingField) {
      // Sửa xong tất cả các phiếu đang hỏng của sân này
      const targetIssues = getPitchActiveIssues(repairingField);
      if (targetIssues.length === 0) {
        showToast("Sân này hiện không có phiếu bảo trì nào cần sửa", "info");
        setShowRepairModal(false);
        return;
      }

      const costPerIssue = actualCost > 0 ? actualCost / targetIssues.length : 0;
      const targetIds = new Set(targetIssues.map((i) => i.id));

      const updated = issues.map((item) => {
        if (targetIds.has(item.id)) {
          return {
            ...item,
            status: "done",
            cost: costPerIssue,
            resolvedAt: nowTimeStr,
            resolved_at: new Date().toISOString(),
          };
        }
        return item;
      });
      setIssues(updated);
      localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(updated));

      // Cập nhật backend API cho từng issue
      for (const t of targetIssues) {
        try {
          updateMaintenanceStatus(t.id, "done", costPerIssue).catch(() => {});
        } catch {}
      }

      broadcastSyncEvent("field_maintenance_resolved", {
        fieldId: repairingField.id,
        fieldName: repairingField.field_name,
      });

      showToast(
        `Đã sửa xong toàn bộ sự cố tại ${repairingField.field_name}! Chấm đỏ cảnh báo đã được gỡ bỏ.`,
        "success"
      );
    }

    setShowRepairModal(false);
    setRepairingField(null);
    setRepairingIssue(null);
  };

  // Tự tạo phiếu bảo trì mới (chỉ thực hiện ở trang bảo trì)
  const handleCreateIssue = (e) => {
    e.preventDefault();
    if (!newIssue.description.trim()) {
      showToast("Vui lòng nhập mô tả sự cố", "error");
      return;
    }

    const matchedField = fields.find(
      (f) => (f.field_name || "").toLowerCase() === (newIssue.fieldName || "").toLowerCase()
    );

    const item = {
      id: Date.now(),
      field: matchedField?.id || null,
      fieldName: newIssue.fieldName,
      category: newIssue.category,
      description: newIssue.description,
      priority: newIssue.priority,
      cost: 0,
      reportedBy: newIssue.reportedBy || "Bộ phận kỹ thuật",
      status: "pending",
      createdAt: "Vừa xong",
    };

    const updated = [item, ...issues];
    setIssues(updated);
    localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(updated));

    try {
      createMaintenanceIssue({
        field: matchedField?.id || null,
        field_name: newIssue.fieldName,
        category: newIssue.category,
        description: newIssue.description,
        priority: newIssue.priority,
        status: "pending",
        reported_by_name: item.reportedBy,
      })
        .then((res) => {
          if (res.data?.id) {
            item.id = res.data.id;
            const synced = [item, ...issues];
            localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(synced));
          }
        })
        .catch(() => {});
    } catch {}

    broadcastSyncEvent("maintenance_issue_reported", item);

    setShowCreateModal(false);
    setNewIssue((prev) => ({ ...prev, description: "" }));
    showToast("Đã tạo phiếu bảo trì sân thành công", "success");
  };

  // Mở modal sửa phiếu
  const openEditModal = (issue) => {
    const rawAct = issue.cost || 0;

    setEditingIssue({
      ...issue,
      fieldName: issue.fieldName || issue.field_name || "",
      category: issue.category || "Đèn chiếu sáng cao áp",
      priority: issue.priority || "Khẩn cấp",
      description: issue.description || "",
      cost: rawAct > 0 ? formatDotNumber(rawAct) : "",
      status: issue.status || "pending",
    });
    setShowEditModal(true);
  };

  // Lưu sửa phiếu bảo trì
  const handleSaveEditIssue = (e) => {
    e.preventDefault();
    if (!editingIssue || !editingIssue.description.trim()) {
      showToast("Vui lòng nhập mô tả sự cố", "error");
      return;
    }

    const actCost = parseDotNumber(editingIssue.cost);

    const updated = issues.map((item) => {
      if (item.id === editingIssue.id) {
        return {
          ...item,
          fieldName: editingIssue.fieldName,
          category: editingIssue.category,
          priority: editingIssue.priority,
          description: editingIssue.description,
          cost: actCost,
          status: editingIssue.status,
        };
      }
      return item;
    });

    setIssues(updated);
    localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(updated));

    try {
      updateMaintenanceIssue(editingIssue.id, {
        field_name: editingIssue.fieldName,
        category: editingIssue.category,
        priority: editingIssue.priority,
        description: editingIssue.description,
        cost: actCost,
        status: editingIssue.status,
      }).catch(() => {});
    } catch {}

    setShowEditModal(false);
    setEditingIssue(null);
    showToast("Đã cập nhật thông tin phiếu bảo trì", "success");
  };

  // Tự xóa phiếu bảo trì
  const handleDeleteIssue = (issueId) => {
    setConfirmConfig({
      isOpen: true,
      title: "Xác nhận xóa phiếu bảo trì",
      message: "Bạn có chắc chắn muốn xóa phiếu bảo trì này không? Dữ liệu sự cố sẽ bị xóa hoàn toàn.",
      confirmText: "Xóa phiếu",
      cancelText: "Hủy bỏ",
      type: "danger",
      onConfirm: () => {
        const updated = issues.filter((i) => i.id !== issueId);
        setIssues(updated);
        localStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(updated));

        try {
          deleteMaintenanceIssue(issueId).catch(() => {});
        } catch {}

        showToast("Đã xóa phiếu bảo trì sân", "success");
      },
    });
  };

  // Mở modal xem chi tiết sân
  const openPitchDetailModal = (field) => {
    setSelectedPitch(field);
    setShowDetailModal(true);
  };

  const periodFilteredIssues = useMemo(() => {
    return issues.filter((i) => isIssueInPeriod(i, selectedPeriod, selectedDate));
  }, [issues, selectedPeriod, selectedDate, todayISO]);

  const maintenanceFields = fields.filter((f) => f.is_available === false);
  const fixingIssues = periodFilteredIssues.filter((i) => i.status !== "done" && i.status !== "resolved");
  const totalActualCost = periodFilteredIssues
    .filter((i) => i.status === "done" || i.status === "resolved")
    .reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0);

  const filteredIssues = periodFilteredIssues.filter(
    (i) =>
      (i.fieldName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.reportedBy || i.reported_by_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Xuất file CSV thống kê bảo trì
  const handleExportStatsCSV = (statsList, rangeLabel) => {
    const headers = [
      "Mã phiếu",
      "Sân bóng",
      "Ca đặt sân",
      "Hạng mục",
      "Mô tả sự cố",
      "Mức độ",
      "Nguồn báo",
      "Người báo",
      "Thời gian tiếp nhận",
      "Thời gian sửa xong",
      "Chi phí thực tế (VNĐ)",
      "Trạng thái",
    ];
    const rows = statsList.map((item) => [
      item.id,
      `"${item.fieldName || item.field_name || ""}"`,
      `"${item.bookingTime || "Bảo trì định kỳ"}"`,
      `"${item.category || ""}"`,
      `"${(item.description || "").replace(/"/g, '""')}"`,
      `"${item.priority || ""}"`,
      `"${(item.reportedBy || "").toLowerCase().includes("vệ sinh") ? "Từ vệ sinh sân" : (item.reportedBy || "").toLowerCase().includes("đặt sân") ? "Quản lý đặt sân" : "Kỹ thuật viên"}"`,
      `"${item.reportedBy || item.reported_by_name || ""}"`,
      `"${formatDateTime(item.createdAt || item.created_at)}"`,
      `"${item.resolvedAt || item.resolved_at ? formatDateTime(item.resolvedAt || item.resolved_at) : "Chưa hoàn tất"}"`,
      item.cost || 0,
      `"${item.status === "done" || item.status === "resolved" ? "Đã sửa xong" : item.status === "fixing" ? "Đang sửa" : "Chờ xử lý"}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Thong_Ke_Bao_Tri_${rangeLabel}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Đã tải xuống file thống kê ca bảo trì!", "success");
  };

  return (
    <>
      <AdminSidebar />
      <TopHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddIssue={() => {
          setNewIssue((prev) => ({
            ...prev,
            fieldName: fields[0]?.field_name || "",
            description: "",
          }));
          setShowCreateModal(true);
        }}
        onRefresh={fetchData}
        loading={loading}
      />

      <main className="main-content admin-dashboard-main">
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        <div className="content-area">
          {/* Header Trang */}
          <div className="page-heading">
            <div className="page-heading-left">
              <h2>Bảo trì &amp; Quản lý Thiết bị Sân</h2>
              <p className="page-subheading" style={{ color: "#64748b", fontSize: "0.82rem", margin: "0.2rem 0 0 0" }}>
                Giám sát tình trạng cơ sở vật chất, khóa sân và điều phối sửa chữa trang thiết bị.
              </p>
            </div>
            <div className="dashboard-heading-actions">
              <div className="dashboard-past-date-selector">
                <span className="material-symbols-outlined date-icon">event</span>
                <select
                  className="dashboard-past-date-select"
                  value={selectedPeriod === "custom" || selectedPeriod === "today" ? selectedDate : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setSelectedDate(val);
                      setSelectedPeriod(val === todayISO ? "today" : "custom");
                    }
                  }}
                  title="Chọn ngày để xem phiếu bảo trì"
                >
                  <option value="" disabled>Lịch sử ngày đã qua</option>
                  {pastDatesList.map((item) => (
                    <option key={item.iso} value={item.iso}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="btn-new-booking"
                onClick={() => {
                  setNewIssue((prev) => ({
                    ...prev,
                    fieldName: fields[0]?.field_name || "",
                    description: "",
                  }));
                  setShowCreateModal(true);
                }}
              >
                <span className="material-symbols-outlined">add_alert</span>
                Tạo phiếu bảo trì
              </button>
            </div>
          </div>

          {/* 3 Ô chỉ số tổng quan (0 sân tạm khóa, 3 sự cố cần sửa, Thực chi: 200.000 đ) */}
          <div className="maintenance-kpi-grid">
            <div className="kpi-stat-box box-amber">
              <div className="kpi-stat-info">
                <span className="kpi-stat-label">Sân đang tạm khóa</span>
                <span className="kpi-stat-number">{maintenanceFields.length} sân</span>
                <span className="kpi-stat-sub">Tạm dừng đón khách bảo trì</span>
              </div>
              <div className="kpi-stat-icon-wrap bg-amber">
                <span className="material-symbols-outlined">lock</span>
              </div>
            </div>

            <div className="kpi-stat-box box-red">
              <div className="kpi-stat-info">
                <span className="kpi-stat-label">Sự cố cần sửa</span>
                <span className="kpi-stat-number">{fixingIssues.length} sự cố</span>
                <span className="kpi-stat-sub">
                  {selectedPeriod === "today"
                    ? "Hôm nay"
                    : selectedPeriod === "week"
                    ? "Tuần này"
                    : selectedPeriod === "month"
                    ? "Tháng này"
                    : "Chờ kỹ thuật xử lý"}
                </span>
              </div>
              <div className="kpi-stat-icon-wrap bg-red">
                <span className="material-symbols-outlined">engineering</span>
              </div>
            </div>

            <div className="kpi-stat-box box-green">
              <div className="kpi-stat-info">
                <span className="kpi-stat-label">Tổng chi phí thực tế</span>
                <span className="kpi-stat-number">{formatCurrency(totalActualCost)} đ</span>
                <span className="kpi-stat-sub">
                  {selectedPeriod === "today"
                    ? "Chi phí hôm nay"
                    : selectedPeriod === "week"
                    ? "Chi phí tuần này"
                    : selectedPeriod === "month"
                    ? "Chi phí tháng này"
                    : "Thực chi hoàn tất sửa chữa"}
                </span>
              </div>
              <div className="kpi-stat-icon-wrap bg-green">
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>
          </div>

          {/* Tabs chuyển đổi giữa Quản lý bảo trì sân và Thống kê bảo trì */}
          <div className="maintenance-tabs-bar">
            <div className="maintenance-tabs-left">
              <button
                type="button"
                className={`maintenance-tab-item ${activeMainTab === "board" ? "active" : ""}`}
                onClick={() => setActiveMainTab("board")}
              >
                <span className="material-symbols-outlined">handyman</span>
                Quản lý bảo trì sân &amp; Thiết bị
              </button>
              <button
                type="button"
                className={`maintenance-tab-item ${activeMainTab === "stats" ? "active" : ""}`}
                onClick={() => setActiveMainTab("stats")}
              >
                <span className="material-symbols-outlined">insights</span>
                Thống kê ca bảo trì
                <span className="tab-pill-badge">{periodFilteredIssues.length}</span>
              </button>
            </div>

            <div className="maintenance-period-filter">
              <span className="filter-period-label">
                <span className="material-symbols-outlined">calendar_month</span>
                Mốc thời gian:
              </span>
              {[
                { key: "all", label: "Tất cả" },
                { key: "today", label: "Hôm nay" },
                { key: "week", label: "Tuần này" },
                { key: "month", label: "Tháng này" },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`dashboard-period-tag ${selectedPeriod === p.key ? "active" : ""}`}
                  onClick={() => {
                    setSelectedPeriod(p.key);
                    if (p.key === "today") {
                      setSelectedDate(todayISO);
                    }
                    if (p.key === "week" || p.key === "month" || p.key === "today" || p.key === "all") {
                      setStatsRange(p.key === "today" ? "day" : p.key);
                    }
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {activeMainTab === "stats" ? (
            <MaintenanceStatsPanel
              fields={fields}
              issues={issues}
              statsRange={statsRange}
              setStatsRange={setStatsRange}
              statsFieldFilter={statsFieldFilter}
              setStatsFieldFilter={setStatsFieldFilter}
              onExportCSV={handleExportStatsCSV}
            />
          ) : (
            <>
          {/* Bảng Quản lý Trạng thái & Thông tin từng sân */}
          <div className="maintenance-board-card">
            <div className="board-header">
              <div>
                <h3 className="chart-title">Trạng thái kỹ thuật từng sân</h3>
                <p className="chart-subtitle">
                  Theo dõi trạng thái kỹ thuật và điều khiển khóa/mở đón khách từng sân.
                </p>
              </div>
              <span className="count-pill">{fields.length} sân cơ sở</span>
            </div>

            <div className="fields-maintenance-grid">
              {fields.map((f) => {
                const isUnderMaintenance = f.is_available === false;
                const pitchIssues = getPitchIssues(f);
                const activePitchIssues = getPitchActiveIssues(f);
                const hasActiveIssue = activePitchIssues.length > 0;

                return (
                  <div
                    key={f.id}
                    className={`field-toggle-card ${
                      hasActiveIssue ? "has-issues" : isUnderMaintenance ? "under-maintenance" : "available"
                    }`}
                  >
                    {/* Ô 1: Tiêu đề sân, icon và nút khóa */}
                    <div className="pitch-card-top">
                      <div className="pitch-card-title-group">
                        <span className="material-symbols-outlined pitch-card-icon">
                          {hasActiveIssue ? "report" : isUnderMaintenance ? "engineering" : "sports_soccer"}
                        </span>
                        <div className="pitch-card-title-wrap">
                          <h4 className="pitch-card-name">
                            <span>{f.field_name}</span>
                            {hasActiveIssue && (
                              <span
                                className="red-dot-indicator pulse"
                                title={`${activePitchIssues.length} phiếu báo hỏng đang chờ sửa!`}
                              />
                            )}
                          </h4>
                          <span className="pitch-card-sub">{f.field_type || "Sân cỏ nhân tạo"}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`btn-toggle-switch ${isUnderMaintenance ? "btn-resume" : "btn-stop"}`}
                        onClick={() => handleToggleMaintenance(f)}
                        title={isUnderMaintenance ? "Mở khóa cho khách đặt" : "Khóa sân bảo trì"}
                      >
                        <span className="material-symbols-outlined">
                          {isUnderMaintenance ? "lock_open" : "lock"}
                        </span>
                        <span>{isUnderMaintenance ? "Mở khóa" : "Khóa"}</span>
                      </button>
                    </div>

                    {/* Ô 2: Khối tình trạng kỹ thuật thiết bị riêng biệt */}
                    <div className="pitch-facility-box">
                      <div className="facility-box-label">
                        <span className="material-symbols-outlined">
                          {hasActiveIssue ? "construction" : "verified"}
                        </span>
                        <span>{hasActiveIssue ? "Cần khắc phục sự cố:" : "Tình trạng kỹ thuật:"}</span>
                      </div>
                      <div className={`facility-box-value ${hasActiveIssue ? "is-issue" : "is-good"}`}>
                        {hasActiveIssue ? (
                          activePitchIssues.length > 1
                            ? `${activePitchIssues[0]?.category || "Sự cố"} (+${activePitchIssues.length - 1} khác)`
                            : activePitchIssues[0]?.category || "Có sự cố cần xử lý"
                        ) : (
                          "Đạt chuẩn phục vụ ca đá"
                        )}
                      </div>
                    </div>

                    {/* Ô 3: Thanh công cụ các nút bấm thao tác riêng biệt */}
                    <div className="pitch-actions-toolbar">
                      <button
                        type="button"
                        className="btn-pitch-action btn-pitch-detail"
                        onClick={() => openPitchDetailModal(f)}
                        title="Xem chi tiết các phiếu bảo trì của sân này"
                      >
                        <span className="material-symbols-outlined">visibility</span>
                        <span>Xem chi tiết{pitchIssues.length > 0 ? ` (${pitchIssues.length})` : ""}</span>
                      </button>

                      {hasActiveIssue && (
                        <button
                          type="button"
                          className="btn-pitch-action btn-pitch-done"
                          onClick={() => openRepairModal(f)}
                          title="Xác nhận đã sửa xong tất cả sự cố của sân này"
                        >
                          <span className="material-symbols-outlined">check_circle</span>
                          <span>Sửa xong</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Danh sách Sự cố Kỹ thuật & Phiếu bảo trì */}
          <div className="bookings-card" style={{ marginTop: "1rem" }}>
            <div className="bookings-header">
              <div>
                <h3>Danh sách phiếu sự cố &amp; Bảo trì thiết bị ({filteredIssues.length})</h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Bao gồm các sự cố tiếp nhận từ Vệ sinh sân và do Kỹ thuật viên tự lập.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-new-booking"
                  style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem" }}
                  onClick={() => {
                    setNewIssue((prev) => ({
                      ...prev,
                      fieldName: fields[0]?.field_name || "",
                      description: "",
                    }));
                    setShowCreateModal(true);
                  }}
                >
                  <span className="material-symbols-outlined">add</span> Tạo phiếu mới
                </button>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="maintenance-table-optimized">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Sân bóng &amp; Thời gian</th>
                    <th style={{ width: "18%" }}>Hạng mục &amp; Mức độ</th>
                    <th style={{ width: "28%" }}>Mô tả chi tiết sự cố</th>
                    <th className="text-right" style={{ width: "12%" }}>Chi phí thực tế</th>
                    <th className="text-center" style={{ width: "12%" }}>Trạng thái</th>
                    <th className="text-right" style={{ width: "10%" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIssues.map((item) => {
                    const isDone = item.status === "done" || item.status === "resolved";
                    const isFixing = item.status === "fixing";
                    const actCost = parseFloat(item.cost) || 0;
                    const isUrgent = item.priority === "Khẩn cấp" || item.priority === "Cao";

                    return (
                      <tr key={item.id}>
                        {/* 1. Sân bóng và thời gian tạo (xuống dòng tự nhiên nếu tên dài) */}
                        <td>
                          <div className="pitch-info-stack">
                            <strong className="field-name-title">{item.fieldName || item.field_name || "Sân"}</strong>
                            <span className="field-time-sub">
                              <span className="material-symbols-outlined time-icon">schedule</span>
                              {formatDateTime(item.createdAt || item.created_at || "Vừa xong")}
                            </span>
                          </div>
                        </td>

                        {/* 2. Hạng mục và mức độ ưu tiên (hiển thị đầy đủ tất cả các mức độ) */}
                        <td>
                          <div className="cat-priority-stack">
                            <span className="category-pill">
                              <span className="material-symbols-outlined">hardware</span>
                              {item.category}
                            </span>
                            {renderPriorityBadge(item.priority)}
                          </div>
                        </td>

                        {/* 3. Mô tả sự cố (khung giờ ca, phân loại hư hỏng và ghi chú chi tiết xuống dòng riêng biệt) */}
                        <td>
                          {(() => {
                            const parsed = parseIssueDescription(item);
                            return (
                              <div className="issue-desc-block">
                                {(parsed.timeShift || parsed.subCategory) && (
                                  <div className="desc-meta-row">
                                    {parsed.timeShift && (
                                      <span className="desc-time-badge" title={`Phát hiện trong ca ${parsed.timeShift}`}>
                                        <span className="material-symbols-outlined time-mini-icon">schedule</span>
                                        Ca {parsed.timeShift}
                                      </span>
                                    )}
                                    {parsed.subCategory && (
                                      <span className="desc-subcat-badge" title="Chi tiết sự cố hư hỏng">
                                        {parsed.subCategory}
                                      </span>
                                    )}
                                  </div>
                                )}
                                {parsed.note && (
                                  <div className="desc-note-line">
                                    <span>{parsed.note}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* 4. Chi phí thực tế */}
                        <td className="text-right">
                          <span className="cost-val-text" style={{ color: actCost > 0 ? "#059669" : "#94a3b8" }}>
                            {actCost > 0 ? `${formatCurrency(actCost)} đ` : "—"}
                          </span>
                        </td>

                        {/* 5. Trạng thái */}
                        <td className="text-center">
                          {isDone ? (
                            <span className="badge-status-pill pill-done">
                              <span className="badge-dot" /> Đã sửa xong
                            </span>
                          ) : isFixing ? (
                            <span className="badge-status-pill pill-fixing">
                              <span className="material-symbols-outlined status-pill-icon">engineering</span>
                              Đang sửa
                            </span>
                          ) : (
                            <span className="badge-status-pill pill-pending">
                              <span className="material-symbols-outlined status-pill-icon">schedule</span>
                              Chờ xử lý
                            </span>
                          )}
                        </td>

                        {/* 6. Thao tác (ngòi bút đầy đủ chức năng và nút xóa) */}
                        <td className="text-right">
                          <div className="table-actions-cell" style={{ justifyContent: "flex-end" }}>
                            {/* Nút sửa phiếu (ngòi bút đầy đủ chức năng cập nhật tiến độ, chi phí, nội dung) */}
                            <button
                              type="button"
                              className="btn-tbl-action btn-edit"
                              onClick={() => openEditModal(item)}
                              title="Chỉnh sửa chi tiết, trạng thái & chi phí bảo trì"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                                edit
                              </span>
                            </button>

                            {/* Nút xóa phiếu */}
                            <button
                              type="button"
                              className="btn-tbl-action btn-delete"
                              onClick={() => handleDeleteIssue(item.id)}
                              title="Xóa phiếu bảo trì"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                                delete
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!filteredIssues.length && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                        Hiện không có sự cố kỹ thuật nào phù hợp với bộ lọc tìm kiếm.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
        </div>
      </main>

      {/* ── Modal Tạo phiếu sự cố / bảo trì mới (Ngoài trang) ── */}
      {showCreateModal && (
        <div className="modal-overlay modal-top-layer" style={{ zIndex: 1100 }} onClick={() => setShowCreateModal(false)}>
          <div
            className="modal-content-box modal-issue-form"
            style={{ maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3>Tạo phiếu bảo trì / Báo sự cố mới</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form
              onSubmit={handleCreateIssue}
              style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}
            >
              <div
                className="modal-body-form"
                style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}
              >
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Sân bóng xảy ra sự cố</label>
                    <select
                      className="form-input"
                      value={newIssue.fieldName}
                      onChange={(e) => setNewIssue({ ...newIssue, fieldName: e.target.value })}
                    >
                      {fields.map((f) => (
                        <option key={f.id} value={f.field_name}>
                          {f.field_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Hạng mục hư hỏng</label>
                    <select
                      className="form-input"
                      value={newIssue.category}
                      onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
                    >
                      <option value="Đèn chiếu sáng cao áp">Đèn chiếu sáng cao áp</option>
                      <option value="Mặt cỏ nhân tạo">Mặt cỏ nhân tạo</option>
                      <option value="Lưới khung thành & Cột">Lưới khung thành &amp; Cột</option>
                      <option value="Hệ thống thoát nước">Hệ thống thoát nước</option>
                      <option value="Hàng rào & Khán đài">Hàng rào &amp; Khán đài</option>
                      <option value="Khác (Ghế chờ, bảng tỷ số)">Khác (Ghế chờ, bảng tỷ số)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Mức độ ưu tiên</label>
                    <select
                      className="form-input"
                      value={newIssue.priority}
                      onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                    >
                      <option value="Khẩn cấp">Khẩn cấp (Cần xử lý ngay trước ca đá)</option>
                      <option value="Cao">Cao (Xử lý trong ngày)</option>
                      <option value="Bình thường">Bình thường (Trong 2-3 ngày)</option>
                      <option value="Thấp">Thấp (Định kỳ cuối tuần)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Người báo cáo / Đơn vị tạo</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Bộ phận kỹ thuật"
                      value={newIssue.reportedBy}
                      onChange={(e) => setNewIssue({ ...newIssue, reportedBy: e.target.value })}
                    />
                  </div>

                  <div className="form-group col-span-2">
                    <label>Mô tả chi tiết tình trạng hỏng</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      placeholder="Mô tả cụ thể vị trí, tình trạng hỏng hóc..."
                      value={newIssue.description}
                      onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-modal-submit">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                    add_circle
                  </span>
                  Tạo phiếu bảo trì
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Xem Chi tiết Sân & Các Phiếu Bảo trì (Tối ưu giao diện, bỏ nút dư thừa) ── */}
      {showDetailModal && selectedPitch && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1000 }}
          onClick={() => {
            if (!showEditModal && !showRepairModal) setShowDetailModal(false);
          }}
        >
          <div
            className={`modal-content-box modal-pitch-detail ${showEditModal || showRepairModal ? "modal-dimmed-background" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span className="material-symbols-outlined" style={{ color: "#059669", fontSize: "1.4rem" }}>
                  stadium
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center" }}>
                    Chi tiết bảo trì: {selectedPitch.field_name}
                    {getPitchActiveIssues(selectedPitch).length > 0 && (
                      <span
                        className="red-dot-indicator pulse"
                        style={{ marginLeft: 8 }}
                        title="Sân có sự cố chưa xử lý"
                      />
                    )}
                  </h3>
                  <small style={{ color: "#64748b" }}>
                    {selectedPitch.field_type || "Sân cỏ nhân tạo"} •{" "}
                    {selectedPitch.is_available === false ? (
                      <span style={{ color: "#d97706", fontWeight: 600 }}>Đang khóa bảo trì</span>
                    ) : (
                      <span style={{ color: "#059669", fontWeight: 600 }}>Đang hoạt động bình thường</span>
                    )}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1, overscrollBehavior: "contain" }}>
              {/* Thẻ tổng quan sân */}
              <div className="pitch-detail-overview">
                <div className="overview-item">
                  <span className="lbl">Số phiếu sự cố</span>
                  <span className="val">
                    {getPitchIssues(selectedPitch).length} phiếu
                  </span>
                </div>
                <div className="overview-item">
                  <span className="lbl">Sự cố đang chờ sửa</span>
                  <span className="val" style={{ color: getPitchActiveIssues(selectedPitch).length > 0 ? "#ef4444" : "#059669" }}>
                    {getPitchActiveIssues(selectedPitch).length} phiếu
                  </span>
                </div>
                <div className="overview-item">
                  <span className="lbl">Chi phí đã sửa chữa</span>
                  <span className="val" style={{ color: "#059669" }}>
                    {formatCurrency(
                      getPitchIssues(selectedPitch)
                        .filter((i) => i.status === "done" || i.status === "resolved")
                        .reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0)
                    )} đ
                  </span>
                </div>
                <div className="overview-item">
                  <span className="lbl">Đã khắc phục xong</span>
                  <span className="val" style={{ color: "#059669" }}>
                    {getPitchIssues(selectedPitch).filter((i) => i.status === "done" || i.status === "resolved").length} phiếu
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#1e293b" }}>
                  Danh sách hồ sơ bảo trì của sân ({getPitchIssues(selectedPitch).length})
                </h4>
              </div>

              {/* Danh sách các phiếu bảo trì của sân */}
              <div className="tickets-list-wrap">
                {getPitchIssues(selectedPitch).map((ticket) => {
                  const isDone = ticket.status === "done" || ticket.status === "resolved";
                  const reporter = ticket.reportedBy || ticket.reported_by_name || "Kỹ thuật";
                  const isFromCleaning =
                    reporter.toLowerCase().includes("vệ sinh") ||
                    reporter.toLowerCase().includes("dọn dẹp");

                  const actCost = parseFloat(ticket.cost) || 0;

                  return (
                    <div
                      key={ticket.id}
                      className={`ticket-card-item ${isDone ? "is-done" : "is-active"}`}
                    >
                      <div className="ticket-card-header">
                        <div className="ticket-title">
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: "1.15rem",
                              color: isDone ? "#10b981" : "#ef4444",
                            }}
                          >
                            {isDone ? "check_circle" : "error"}
                          </span>
                          {ticket.category}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span
                            className={`priority-badge priority-${
                              ticket.priority === "Khẩn cấp" || ticket.priority === "Cao"
                                ? "high"
                                : "normal"
                            }`}
                          >
                            {ticket.priority}
                          </span>
                          <span
                            className={`priority-badge`}
                            style={{
                              background: isDone ? "#ecfdf5" : ticket.status === "fixing" ? "#fffbeb" : "#fee2e2",
                              color: isDone ? "#047857" : ticket.status === "fixing" ? "#b45309" : "#b91c1c",
                            }}
                          >
                            {isDone ? "Đã sửa xong" : ticket.status === "fixing" ? "Đang sửa chữa" : "Chờ xử lý"}
                          </span>
                        </div>
                      </div>

                      <div className="ticket-meta-row">
                        <span>
                          <strong>Nguồn báo:</strong>{" "}
                          {isFromCleaning ? (
                            <span className="source-tag cleaning-source">
                              <span className="material-symbols-outlined">cleaning_services</span>
                              Từ vệ sinh sân
                            </span>
                          ) : (
                            <span className="source-tag tech-source">
                              <span className="material-symbols-outlined">build</span>
                              {reporter}
                            </span>
                          )}
                        </span>
                        <span>
                          <strong>Tiếp nhận:</strong> {formatDateTime(ticket.createdAt || ticket.created_at || "Vừa xong")}
                        </span>
                        {(ticket.resolvedAt || ticket.resolved_at) && (
                          <span style={{ color: "#059669" }}>
                            <strong>Đã sửa xong:</strong> {formatDateTime(ticket.resolvedAt || ticket.resolved_at)}
                          </span>
                        )}
                      </div>

                      <div className="ticket-desc-box">
                        <strong>Mô tả sự cố:</strong> {ticket.description}
                      </div>

                      <div className="ticket-cost-info">
                        {isDone ? (
                          <span className="cost-act-tag">
                            Chi phí thực tế: <strong>{formatCurrency(actCost)} đ</strong>
                          </span>
                        ) : null}
                      </div>

                      <div className="ticket-actions-bar">
                        {!isDone && (
                          <button
                            type="button"
                            className="btn-tbl-action btn-complete-fix"
                            onClick={() => {
                              openRepairModal(selectedPitch, ticket);
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>
                              done
                            </span>
                            Sửa xong
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-tbl-action btn-edit"
                          onClick={() => {
                            openEditModal(ticket);
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>
                            edit
                          </span>
                          Sửa phiếu
                        </button>

                        <button
                          type="button"
                          className="btn-tbl-action btn-delete"
                          onClick={() => handleDeleteIssue(ticket.id)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>
                            delete
                          </span>
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}

                {getPitchIssues(selectedPitch).length === 0 && (
                  <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "#94a3b8" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "2.5rem", display: "block", marginBottom: 8, color: "#10b981" }}>
                      verified
                    </span>
                    Sân này hiện hoạt động rất tốt, không có phiếu bảo trì nào được ghi nhận.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setShowDetailModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* ── Modal Sửa phiếu bảo trì (Form chuẩn đẹp 2 cột, nút xanh) ── */}
      {showEditModal && editingIssue && (
        <div
          className="modal-overlay modal-top-layer"
          style={{ zIndex: 200005 }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="modal-content-box modal-issue-form"
            style={{ maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h3>Chỉnh sửa phiếu bảo trì</h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowEditModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEditIssue} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
              <div className="modal-body-form" style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
                <div className="modal-form-grid">
                  <div className="form-group">
                    <label>Sân bóng</label>
                    <select
                      className="form-input"
                      value={editingIssue.fieldName}
                      onChange={(e) =>
                        setEditingIssue({ ...editingIssue, fieldName: e.target.value })
                      }
                    >
                      {fields.map((f) => (
                        <option key={f.id} value={f.field_name}>
                          {f.field_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Hạng mục hư hỏng</label>
                    <select
                      className="form-input"
                      value={editingIssue.category}
                      onChange={(e) =>
                        setEditingIssue({ ...editingIssue, category: e.target.value })
                      }
                    >
                      <option value="Đèn chiếu sáng cao áp">Đèn chiếu sáng cao áp</option>
                      <option value="Mặt cỏ nhân tạo">Mặt cỏ nhân tạo</option>
                      <option value="Lưới khung thành & Cột">Lưới khung thành &amp; Cột</option>
                      <option value="Hệ thống thoát nước">Hệ thống thoát nước</option>
                      <option value="Hàng rào & Khán đài">Hàng rào &amp; Khán đài</option>
                      <option value="Khác (Ghế chờ, bảng tỷ số)">Khác (Ghế chờ, bảng tỷ số)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Mức độ ưu tiên</label>
                    <select
                      className="form-input"
                      value={editingIssue.priority}
                      onChange={(e) =>
                        setEditingIssue({ ...editingIssue, priority: e.target.value })
                      }
                    >
                      <option value="Khẩn cấp">Khẩn cấp</option>
                      <option value="Cao">Cao</option>
                      <option value="Bình thường">Bình thường</option>
                      <option value="Thấp">Thấp</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Trạng thái xử lý</label>
                    <select
                      className="form-input"
                      value={editingIssue.status}
                      onChange={(e) =>
                        setEditingIssue({ ...editingIssue, status: e.target.value })
                      }
                    >
                      <option value="pending">Chờ xử lý (Đang hỏng)</option>
                      <option value="fixing">Đang sửa chữa</option>
                      <option value="done">Đã sửa xong</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Chi phí thực tế (VNĐ)</label>
                    <div className="formatted-currency-input-wrapper">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="0"
                        value={editingIssue.cost}
                        onChange={(e) =>
                          setEditingIssue({
                            ...editingIssue,
                            cost: formatDotNumber(e.target.value),
                          })
                        }
                      />
                      <span className="currency-unit-suffix">VNĐ</span>
                    </div>
                  </div>

                  <div className="form-group col-span-2">
                    <label>Mô tả chi tiết sự cố</label>
                    <textarea
                      className="form-input"
                      rows="3"
                      value={editingIssue.description}
                      onChange={(e) =>
                        setEditingIssue({ ...editingIssue, description: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-modal-submit">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                    save
                  </span>
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Xác nhận Sửa Xong & Nhập Chi phí Thực tế (có dấu . phân biệt triệu trăm nghìn) ── */}
      {showRepairModal && (repairingField || repairingIssue) && (
        <div
          className="modal-overlay modal-top-layer"
          style={{ zIndex: 200005 }}
          onClick={() => setShowRepairModal(false)}
        >
          <div
            className="modal-content-box"
            style={{ maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="material-symbols-outlined" style={{ color: "#059669" }}>
                  task_alt
                </span>
                <h3 style={{ margin: 0 }}>Xác nhận hoàn thành sửa chữa</h3>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowRepairModal(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="modal-body-form" style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain" }}>
              <div className="repair-confirm-box">
                <div className="repair-confirm-title">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                    check_circle
                  </span>
                  Thông báo xác nhận sửa xong
                </div>
                <p className="repair-confirm-desc">
                  {repairingIssue ? (
                    <>
                      Bạn đang xác nhận đã khắc phục xong sự cố{" "}
                      <strong>{repairingIssue.category}</strong> tại{" "}
                      <strong>{repairingIssue.fieldName || repairingField?.field_name}</strong>.
                    </>
                  ) : (
                    <>
                      Bạn đang xác nhận đã khắc phục xong tất cả sự cố tại{" "}
                      <strong>{repairingField?.field_name}</strong>. Sau khi hoàn thành,{" "}
                      <strong>chấm đỏ cảnh báo sự cố trên sân sẽ hết</strong>.
                    </>
                  )}
                </p>
              </div>

              <div className="form-group">
                <label>Chi phí bảo trì thực tế (VNĐ) — Nhập để ghi nhận chi phí:</label>
                <div className="formatted-currency-input-wrapper">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: 500.000"
                    value={actualCostInput}
                    onChange={(e) => setActualCostInput(formatDotNumber(e.target.value))}
                    autoFocus
                  />
                  <span className="currency-unit-suffix">VNĐ</span>
                </div>
                <small style={{ color: "#64748b" }}>
                  Hệ thống tự động thêm dấu chấm (.) phân biệt triệu, trăm, nghìn.
                </small>
              </div>
            </div>

            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowRepairModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-submit"
                onClick={handleConfirmRepairDone}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "1rem", verticalAlign: "middle", marginRight: "4px" }}
                >
                  verified
                </span>
                Xác nhận sửa xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN IN-SCREEN */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        type={confirmConfig.type}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
