import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFields } from "../../api/fieldsApi";
import { getServices } from "../../api/servicesApi";
import {
  createTournamentRequest,
  getTournamentRequests,
  getTournamentRequestById,
  cancelTournamentRequest,
} from "../../api/tournamentsApi";
import { createQrPayment, checkPaymentStatus, simulatePaymentTest } from "../../api/paymentsApi";
import { broadcastSyncEvent, onSyncEvent } from "../../utils/realtimeSync";
import { useToast, ToastContainer } from "../../components/Toast/Toast";
import { getFullImageUrl } from "../../config";
import "./TournamentRequest.css";

// Các khung giờ chuẩn của hệ thống
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

// 2 hình thức thanh toán giải đấu: Thanh toán 100% hoặc Cọc trước 50%
const PAYMENT_OPTIONS = [
  {
    value: "full",
    name: "Thanh toán toàn bộ (100%)",
    desc: "Thanh toán trọn gói toàn bộ dự toán giải đấu qua cổng thanh toán SePay (Napas 24/7).",
    badge: "100% TRỌN GÓI",
    badgeCls: "full",
  },
  {
    value: "deposit",
    name: "Đặt cọc trước 50%",
    desc: "Đặt cọc 50% để giữ sân thi đấu. 50% còn lại thanh toán tại sân khi diễn ra giải.",
    badge: "CỌC 50% GIỮ SÂN",
    badgeCls: "deposit",
  },
];

// Gói dịch vụ tổ chức sự kiện giải đấu chuyên nghiệp
const TOURNAMENT_PACKAGES = [
  { id: "referee", label: "Tổ trọng tài chuẩn VFF", icon: "sports", desc: "Trọng tài chính & trọng tài biên điều hành đạt chuẩn" },
  { id: "livestream", label: "Bình luận viên & Livestream HD", icon: "videocam", desc: "Quay phát trực tiếp, bình luận viên nhiệt huyết, highlights" },
  { id: "trophy", label: "Cúp vô địch, Huy chương & Cờ lưu niệm", icon: "emoji_events", desc: "Bộ cúp kim loại cao cấp, huy chương vàng/bạc/đồng, cờ trao giải" },
  { id: "medical", label: "Túi y tế sơ cứu & Xịt giảm đau", icon: "medical_services", desc: "Nhân viên y tế trực sân, băng gạc, bình xịt lạnh chấn thương" },
  { id: "sound_lights", label: "Hệ thống âm thanh & Đèn LED đêm", icon: "volume_up", desc: "Loa công suất lớn, micro khai mạc, chiếu sáng chuẩn thi đấu" },
  { id: "coordinator", label: "Điều phối viên & Lễ tân đón tiếp", icon: "support_agent", desc: "Ban thư ký ghi nhận tỉ số, bảng điểm điện tử, hỗ trợ check-in" },
];

const STATUS_CONFIG = {
  Pending: {
    label: "Chờ xử lý & Tiếp nhận",
    badgeClass: "st-pending",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
    icon: "hourglass_top",
    desc: "Yêu cầu đã được gửi đến Ban điều hành. Đội ngũ phụ trách giải đang rà soát lịch sân và sẽ gọi điện xác nhận trong vòng 2 - 4 giờ làm việc.",
  },
  Contacted: {
    label: "Đang liên hệ tư vấn",
    badgeClass: "st-contacted",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: "phone_in_talk",
    desc: "Ban quản lý đang liên hệ qua điện thoại để thống nhất lịch thi đấu cụ thể, dịch vụ hỗ trợ và gửi báo giá hợp đồng.",
  },
  Approved: {
    label: "Đã chốt duyệt & Khóa sân",
    badgeClass: "st-approved",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    icon: "check_circle",
    desc: "Phiếu đăng ký giải đấu đã được duyệt chính thức và sân đã được khóa lịch bảo đảm theo đúng yêu cầu.",
  },
  Completed: {
    label: "Đã hoàn thành",
    badgeClass: "st-approved",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    icon: "verified",
    desc: "Giải đấu đã kết thúc và hoàn tất dịch vụ tổ chức sân.",
  },
  Rejected: {
    label: "Đã từ chối",
    badgeClass: "st-rejected",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: "cancel",
    desc: "Rất tiếc yêu cầu không thể tiếp nhận do kín lịch sân hoặc điều kiện bất khả kháng.",
  },
  Cancelled: {
    label: "Khách đã hủy phiếu",
    badgeClass: "st-cancelled",
    color: "#64748b",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    icon: "block",
    desc: "Phiếu đăng ký giải đấu này đã được hủy theo yêu cầu của bạn. Khung giờ dự kiến đã được giải phóng.",
  },
};

const parseListField = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    return [String(val)];
  }
};

const formatDateVN = (dateStr) => {
  if (!dateStr) return "N/A";
  const parts = String(dateStr).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

const formatDateTimeVN = (dtStr) => {
  if (!dtStr) return "Vừa xong";
  try {
    const d = new Date(dtStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dtStr;
  }
};

const getDurationDays = (sDate, eDate) => {
  if (!sDate || !eDate) return null;
  const s = new Date(sDate);
  const e = new Date(eDate);
  const diffTime = e - s;
  if (diffTime < 0) return null;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// Khách hàng có thể hủy khi phiếu chưa hoàn thành (chưa Approved/Completed và chưa Cancelled/Rejected)
const canCancelTournamentTicket = (status) => {
  const s = String(status || "").trim().toLowerCase();
  return s === "pending" || s === "contacted" || s === "chờ xử lý" || s === "đã liên hệ";
};

const resolveImgUrl = (urlOrPath) => {
  return getFullImageUrl(urlOrPath);
};

const TournamentRequest = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, toast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [fields, setFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [systemServices, setSystemServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState(null);

  // Thao tác hủy phiếu & lịch sử phiếu giải đấu
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [refreshingTicket, setRefreshingTicket] = useState(false);
  const [myTournamentRequests, setMyTournamentRequests] = useState([]);
  const [showMyRequestsModal, setShowMyRequestsModal] = useState(false);

  // Form states
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expectedTeams, setExpectedTeams] = useState(8);
  const [selectedFieldIds, setSelectedFieldIds] = useState([]);

  // Khung giờ thi đấu states
  const [slotMode, setSlotMode] = useState("all_days"); // "all_days" | "weekends" | "custom_days"
  const [selectedCommonSlots, setSelectedCommonSlots] = useState(["17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00"]);
  const [selectedDaySlots, setSelectedDaySlots] = useState({});
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [customSlotNotes, setCustomSlotNotes] = useState("");

  // Dịch vụ states & Vật tư tiện ích tại sân (chọn số lượng, size giày như đặt sân)
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [selectedShoeSizes, setSelectedShoeSizes] = useState({});

  // Gói dịch vụ sự kiện trọn gói (Mặc định được tick chọn hết, người dùng có thể tick bỏ nếu không muốn)
  const [selectedEventPackageIds, setSelectedEventPackageIds] = useState(() =>
    TOURNAMENT_PACKAGES.map((p) => p.id)
  );

  const toggleEventPackage = (pkgId) => {
    setSelectedEventPackageIds((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
  };

  const isShoeService = (service) =>
    /giày|giay|shoe/i.test(`${service?.name || ""} ${service?.category || ""}`);

  const updateServiceQuantity = (serviceId, delta) => {
    const srv = systemServices.find((s) => String(s.id) === String(serviceId));
    const maxStock = srv && srv.stock !== undefined && srv.stock !== null ? Number(srv.stock) : 999;

    setSelectedQuantities((prev) => {
      const currentQty = prev[serviceId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty > maxStock) {
        toast.warning(`Kho hiện chỉ còn tối đa ${maxStock} ${srv?.name || "sản phẩm"}!`);
        return prev;
      }
      const next = { ...prev, [serviceId]: newQty };
      if (newQty === 0) {
        delete next[serviceId];
      }
      return next;
    });
  };

  const updateShoeSize = (serviceId, size) => {
    setSelectedShoeSizes((prev) => ({
      ...prev,
      [serviceId]: size,
    }));
  };

  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("deposit");

  // ─── VietQR Payment Modal States ──────────────────────────────
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrCountdown, setQrCountdown] = useState(600);
  const [qrPaymentSuccess, setQrPaymentSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [simulating, setSimulating] = useState(false);
  const qrPollRef = useRef(null);
  const qrTimerRef = useRef(null);
  const pendingTicketRef = useRef(null);

  const handleCopy = (text, fieldName) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(String(text));
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(""), 2000);
    }
  };

  const handleCloseQrModal = async () => {
    if (qrPollRef.current) clearInterval(qrPollRef.current);
    if (qrTimerRef.current) clearInterval(qrTimerRef.current);

    // Khi người dùng bấm dấu X hoặc nút Hủy: xóa ngay đơn chưa thanh toán khỏi DB và đồng bộ lập tức cho admin
    const pendingTicket = pendingTicketRef.current;
    if (pendingTicket?.id && !qrPaymentSuccess) {
      try {
        await deleteTournamentRequest(pendingTicket.id);
        broadcastSyncEvent("tournament_updated", { action: "delete", id: pendingTicket.id });
      } catch (err) {
        console.error("Lỗi xóa đơn chưa thanh toán:", err);
      }
      setMyTournamentRequests((prev) => prev.filter((r) => r.id !== pendingTicket.id));
      pendingTicketRef.current = null;
    }

    try {
      localStorage.removeItem("last_tournament_request_id");
    } catch {}

    setShowQrModal(false);
    setQrData(null);
    setSuccessData(null);
    setSubmitting(false);
    toast.info("Đã hủy thanh toán. Thông tin đăng ký của bạn vẫn được giữ nguyên trên form.");
  };

  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
      const pendingTicket = pendingTicketRef.current;
      if (pendingTicket?.id && !qrPaymentSuccess) {
        deleteTournamentRequest(pendingTicket.id).catch(() => {});
        broadcastSyncEvent("tournament_updated", { action: "delete", id: pendingTicket.id });
      }
    };
  }, [qrPaymentSuccess]);

  const handleSimulatePayment = async () => {
    const targetId = qrData?.tournament_id || qrData?.booking_id || pendingTicketRef.current?.id || successData?.id;
    if (!targetId || simulating) return;
    setSimulating(true);
    try {
      await simulatePaymentTest(targetId);
      toast.info("Đã kích hoạt giả lập thanh toán thành công!");
    } catch (err) {
      console.error("Lỗi giả lập thanh toán:", err);
      toast.error("Không thể giả lập thanh toán");
    } finally {
      setSimulating(false);
    }
  };

  const handleOpenQrForTicket = async (ticket) => {
    if (!ticket?.id) return;
    try {
      const isDep = ticket.payment_method === "deposit";
      const totalB = Number(ticket.estimated_budget || 0);
      const payAmt = isDep ? (Number(ticket.deposit_amount) || Math.round(totalB * 0.5)) : totalB;
      const res = await createQrPayment({
        tournament_id: ticket.id,
        amount: payAmt,
      });
      if (res.data) {
        setQrData(res.data);
        setQrCountdown(600);
        setQrPaymentSuccess(false);
        setShowQrModal(true);

        if (qrTimerRef.current) clearInterval(qrTimerRef.current);
        qrTimerRef.current = setInterval(() => {
          setQrCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(qrTimerRef.current);
              setShowQrModal(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        if (qrPollRef.current) clearInterval(qrPollRef.current);
        qrPollRef.current = setInterval(async () => {
          try {
            const statusRes = await checkPaymentStatus(ticket.id);
            if (statusRes.data?.is_paid) {
              clearInterval(qrPollRef.current);
              clearInterval(qrTimerRef.current);
              setQrPaymentSuccess(true);
              const updatedTicket = {
                ...ticket,
                payment_status: isDep ? "Deposit_Paid" : "Paid",
                paid_amount: payAmt,
                remaining_amount: Math.max(0, totalB - payAmt),
              };
              setSuccessData(updatedTicket);
              setMyTournamentRequests((prev) =>
                prev.map((r) => (r.id === ticket.id ? updatedTicket : r))
              );
              broadcastSyncEvent("tournament_updated", { action: "paid", id: ticket.id });
              setTimeout(() => {
                setShowQrModal(false);
                toast.success("Thanh toán thành công!");
              }, 1600);
            }
          } catch (e) {}
        }, 2000);
      }
    } catch (err) {
      console.error("Lỗi tạo mã QR:", err);
      toast.error("Không thể mở mã QR thanh toán lúc này.");
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setCurrentUser(u);
        if (u.full_name) setContactName(u.full_name);
        if (u.phone) setContactPhone(u.phone);
        if (u.email) setContactEmail(u.email);

        // Tải các phiếu đặt giải đấu của người dùng (kể cả phiếu do Admin tạo)
        const fetchUserTournaments = () => {
          getTournamentRequests({ customer_id: u.id, phone: u.phone })
            .then((res) => {
              if (Array.isArray(res.data)) {
                setMyTournamentRequests(res.data);
                // Tự động hiển thị phiếu đặt giải đấu của người dùng nếu có
                if (res.data.length > 0) {
                  const active = res.data.find((r) => r.status !== "Cancelled" && r.status !== "Rejected") || res.data[0];
                  setSuccessData(active);
                }
              }
            })
            .catch(() => {});
        };
        fetchUserTournaments();
      }
    } catch {}

    // Load fields
    getFields()
      .then((res) => {
        const list = res.data?.fields || (Array.isArray(res.data) ? res.data : []);
        setFields(list);
      })
      .catch((err) => console.error("Lỗi tải danh sách sân:", err))
      .finally(() => setLoadingFields(false));

    // Load services hệ thống đang có
    getServices()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.services || []);
        const formatted = list
          .filter((s) => s.is_active !== false)
          .map((item) => ({
            ...item,
            id: item.id,
            name: item.name,
            desc: item.description || "Dịch vụ đi kèm chất lượng cao",
            price: Number(item.price) || 0,
            stock: item.stock !== undefined && item.stock !== null ? Number(item.stock) : 0,
            unit: item.unit || (/nước|pocari|aquafina|sting|revive|chai/i.test(item.name)
              ? "chai"
              : /giày|shoe|giay/i.test(item.name)
              ? "đôi"
              : /áo|bib/i.test(item.name)
              ? "bộ"
              : /trọng tài/i.test(item.name)
              ? "trận"
              : /bóng/i.test(item.name)
              ? "quả"
              : "lần"),
            image: item.image || item.image_url || "",
            icon: /giày|giay|shoe/i.test(item.name)
              ? "sports"
              : /nước|pocari|water|aquafina|sting|revive/i.test(item.name)
              ? "water_drop"
              : /áo|bib/i.test(item.name)
              ? "checkroom"
              : /trọng tài/i.test(item.name)
              ? "sports_soccer"
              : "inventory_2",
            isShoe: /giày|giay|shoe/i.test(`${item.name || ""} ${item.category || ""}`),
            isFree: Number(item.price) === 0,
          }));
        setSystemServices(formatted);
      })
      .catch((err) => console.error("Lỗi tải dịch vụ hệ thống:", err))
      .finally(() => setLoadingServices(false));

    // Lắng nghe sự kiện đồng bộ realtime khi Admin tạo hoặc cập nhật phiếu giải đấu
    const cleanupSync = onSyncEvent((event) => {
      if (event.type?.startsWith("tournament_")) {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          try {
            const parsedUser = JSON.parse(rawUser);
            getTournamentRequests({ customer_id: parsedUser.id, phone: parsedUser.phone })
              .then((res) => {
                if (Array.isArray(res.data)) {
                  setMyTournamentRequests(res.data);
                  if (res.data.length > 0) {
                    const active = res.data.find((r) => r.status !== "Cancelled" && r.status !== "Rejected") || res.data[0];
                    setSuccessData(active);
                  }
                }
              })
              .catch(() => {});
          } catch {}
        }
      }
    });

    return () => {
      cleanupSync();
    };
  }, []);

  // Tính toán danh sách ngày diễn ra giải đấu
  const tournamentDays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const s = new Date(startDate);
    const e = new Date(endDate);
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
  }, [startDate, endDate]);

  const handleToggleField = (fieldId) => {
    setSelectedFieldIds((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };



  // Toggle slot chung
  const handleToggleCommonSlot = (slot) => {
    setSelectedCommonSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  // Toggle slot theo ngày cụ thể
  const handleToggleDaySlot = (dateStr, slot) => {
    setSelectedDaySlots((prev) => {
      const cur = prev[dateStr] || [];
      const next = cur.includes(slot) ? cur.filter((s) => s !== slot) : [...cur, slot];
      return { ...prev, [dateStr]: next };
    });
  };

  // Tính toán chuỗi mô tả khung giờ thi đấu
  const getComputedTimeSlotsInfo = () => {
    let summary = "";
    if (slotMode === "all_days") {
      if (selectedCommonSlots.length > 0) {
        summary = `Các ngày trong giải: ${selectedCommonSlots.join(", ")}`;
      }
    } else if (slotMode === "weekends") {
      if (selectedCommonSlots.length > 0) {
        summary = `Chỉ Thứ 7 & Chủ Nhật: ${selectedCommonSlots.join(", ")}`;
      }
    } else if (slotMode === "custom_days") {
      const parts = Object.entries(selectedDaySlots)
        .filter(([_, slots]) => slots.length > 0)
        .map(([date, slots]) => {
          const d = new Date(date);
          const formatted = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
          return `${formatted}: ${slots.join(", ")}`;
        });
      if (parts.length > 0) {
        summary = parts.join("; ");
      }
    }

    if (customSlotNotes.trim()) {
      summary = summary ? `${summary} | Ghi chú: ${customSlotNotes.trim()}` : customSlotNotes.trim();
    }
    return summary || "Chưa xác định khung giờ chi tiết";
  };

  // Tự động ước tính ngân sách dựa trên số ngày, số sân, số khung giờ thi đấu và vật tư đã chọn
  const autoEstimatedBudget = useMemo(() => {
    const daysCount = Math.max(1, tournamentDays.length);
    const fieldCount = Math.max(1, selectedFieldIds.length);
    let slotsPerDay = 2;
    if (slotMode === "all_days" || slotMode === "weekends") {
      slotsPerDay = Math.max(1, selectedCommonSlots.length || 2);
    } else if (slotMode === "custom_days") {
      const totalCustom = Object.values(selectedDaySlots).reduce((a, b) => a + b.length, 0);
      slotsPerDay = totalCustom > 0 ? Math.ceil(totalCustom / daysCount) : 2;
    }
    const avgFieldRate = 350000;
    const fieldTotal = daysCount * fieldCount * slotsPerDay * avgFieldRate;

    // Chi phí vật tư & tiện ích tại sân (nếu người dùng có chọn)
    const suppliesTotal = Object.entries(selectedQuantities).reduce((sum, [srvId, qty]) => {
      if (qty <= 0) return sum;
      const srv = systemServices.find((s) => String(s.id) === String(srvId));
      return sum + (srv ? Number(srv.price || 0) * qty : 0);
    }, 0);

    // Gói dịch vụ tổ chức chuyên nghiệp là sẵn có và KHÔNG tính thêm vào giá
    return Math.max(350000, fieldTotal + suppliesTotal);
  }, [tournamentDays, selectedFieldIds, slotMode, selectedCommonSlots, selectedDaySlots, selectedQuantities, systemServices]);

  const currentBudget = autoEstimatedBudget;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contactName.trim()) {
      toast.warning("Vui lòng nhập họ tên người liên hệ!");
      return;
    }
    if (!contactPhone.trim()) {
      toast.warning("Vui lòng nhập số điện thoại liên hệ!");
      return;
    }
    if (!tournamentName.trim()) {
      toast.warning("Vui lòng nhập tên giải đấu!");
      return;
    }
    if (!startDate || !endDate) {
      toast.warning("Vui lòng chọn ngày bắt đầu và kết thúc giải đấu!");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (startDate < todayStr) {
      toast.warning("Ngày bắt đầu giải đấu không được chọn ngày đã qua trong quá khứ!");
      return;
    }
    if (endDate < startDate) {
      toast.warning("Ngày kết thúc giải đấu phải bằng hoặc sau ngày bắt đầu!");
      return;
    }

    const selectedFieldNames = fields
      .filter((f) => selectedFieldIds.includes(f.id))
      .map((f) => f.field_name);

    const timeSlotsComputed = getComputedTimeSlotsInfo();

    const finalBudget = currentBudget;
    const payAmount = paymentMethod === "deposit" ? Math.round(finalBudget * 0.5) : finalBudget;

    // Gói dịch vụ sự kiện sẵn có (mặc định tick chọn hết, lọc theo lựa chọn của người dùng)
    const includedPackages = TOURNAMENT_PACKAGES
      .filter((pkg) => selectedEventPackageIds.includes(pkg.id))
      .map((pkg) => `${pkg.label} (Trọn gói sẵn có)`);

    // Danh sách vật tư tiện ích đã chọn có số lượng > 0
    const chosenSupplies = Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([srvId, qty]) => {
        const srv = systemServices.find((s) => String(s.id) === String(srvId));
        if (!srv) return null;
        const sizeStr = selectedShoeSizes[srvId] ? ` - Size ${selectedShoeSizes[srvId]}` : "";
        return `${srv.name}${sizeStr} x${qty} (${(Number(srv.price || 0) * qty).toLocaleString("vi-VN")}đ)`;
      })
      .filter(Boolean);

    const finalServicesRequested = [...includedPackages, ...chosenSupplies];

    const payload = {
      customer_id: currentUser?.id || null,
      contact_name: contactName.trim(),
      contact_phone: contactPhone.trim(),
      contact_email: contactEmail.trim(),
      organization: organization.trim(),
      tournament_name: tournamentName.trim(),
      start_date: startDate,
      end_date: endDate,
      expected_teams: Number(expectedTeams) || 8,
      selected_fields_info: selectedFieldNames.length > 0 ? selectedFieldNames : ["Chưa chỉ định sân cụ thể"],
      time_slots_info: timeSlotsComputed,
      services_requested: finalServicesRequested,
      estimated_budget: finalBudget,
      notes: notes.trim(),
      payment_method: paymentMethod,
      payment_status: "Unpaid",
    };

    try {
      setSubmitting(true);
      const res = await createTournamentRequest(payload);
      const ticketData = res.data?.data || res.data;
      pendingTicketRef.current = ticketData;
      // KHÔNG gọi setSuccessData ở đây. Người dùng vẫn ở form, chỉ mở popup quét mã QR.
      // Nếu bấm dấu X đóng popup, sẽ quay lại màn hình form trước đó.
      toast.info("Đã tạo thông tin giải đấu. Vui lòng quét mã QR để hoàn tất thanh toán giữ sân!");

      // ── Mở ngay cổng thanh toán SePay Napas 24/7 ──
      try {
        const qrRes = await createQrPayment({
          tournament_id: ticketData.id,
          amount: payAmount,
        });

        if (qrRes.data) {
          setQrData(qrRes.data);
          setQrCountdown(600);
          setQrPaymentSuccess(false);
          setShowQrModal(true);

          if (qrTimerRef.current) clearInterval(qrTimerRef.current);
          qrTimerRef.current = setInterval(() => {
            setQrCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(qrTimerRef.current);
                handleCloseQrModal();
                toast.info("Hết thời gian phiên thanh toán QR. Phiếu giải đấu chưa thanh toán đã được hủy.");
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          if (qrPollRef.current) clearInterval(qrPollRef.current);
          qrPollRef.current = setInterval(async () => {
            try {
              const statusRes = await checkPaymentStatus(ticketData.id);
              if (statusRes.data?.is_paid) {
                clearInterval(qrPollRef.current);
                clearInterval(qrTimerRef.current);
                setQrPaymentSuccess(true);
                const updatedTicket = {
                  ...ticketData,
                  payment_status: paymentMethod === "deposit" ? "Deposit_Paid" : "Paid",
                  paid_amount: payAmount,
                  remaining_amount: Math.max(0, finalBudget - payAmount),
                };
                pendingTicketRef.current = null;
                setSuccessData(updatedTicket);
                try {
                  localStorage.removeItem("last_tournament_request_id");
                } catch {}
                setMyTournamentRequests((prev) => [updatedTicket, ...prev.filter((r) => r.id !== ticketData.id)]);
                broadcastSyncEvent("tournament_updated", { action: "paid", id: ticketData.id });
                setTimeout(() => {
                  setShowQrModal(false);
                  toast.success("Thanh toán thành công! Ban quản lý đã xác nhận số tiền của bạn.");
                }, 1600);
              }
            } catch (pollErr) {
              console.log("Lỗi polling payment status:", pollErr);
            }
          }, 2000);
        }
      } catch (qrErr) {
        console.error("Lỗi tạo QR thanh toán:", qrErr);
        toast.warning("Phiếu đã tạo, nhưng không thể kết nối SePay lúc này. Bạn có thể thanh toán sau!");
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Lỗi gửi yêu cầu giải đấu:", err);
      const msg = err.response?.data?.error || "Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại!";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTicket = async () => {
    if (!successData?.id) return;
    try {
      setCancelling(true);
      const res = await cancelTournamentRequest(successData.id, cancelReason);
      const updatedTicket = res.data?.data || { ...successData, status: "Cancelled" };
      setSuccessData(updatedTicket);
      setMyTournamentRequests((prev) =>
        prev.map((r) => (r.id === updatedTicket.id ? updatedTicket : r))
      );
      broadcastSyncEvent("tournament_updated", { action: "cancel", id: successData.id });
      setShowCancelModal(false);
      setCancelReason("");
      toast.success("Đã hủy phiếu đặt giải đấu thành công!");
    } catch (err) {
      console.error("Lỗi hủy phiếu giải đấu:", err);
      const msg = err.response?.data?.error || "Không thể hủy phiếu giải đấu. Vui lòng thử lại!";
      toast.error(msg);
    } finally {
      setCancelling(false);
    }
  };

  // Realtime đồng bộ trạng thái phiếu giải đấu khi khách hàng đang xem trên màn hình
  useEffect(() => {
    if (!successData?.id) return;

    const cleanupSync = onSyncEvent((event) => {
      if (event.type?.startsWith("tournament_")) {
        getTournamentRequestById(successData.id)
          .then((res) => {
            if (res.data) {
              if (res.data.status !== successData.status) {
                toast.info(`Trạng thái phiếu giải đấu đã đổi thành: ${STATUS_CONFIG[res.data.status]?.label || res.data.status}`);
              }
              setSuccessData(res.data);
            }
          })
          .catch(() => {});
      }
    });

    const pollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        getTournamentRequestById(successData.id)
          .then((res) => {
            if (res.data) {
              if (res.data.status !== successData.status) {
                toast.info(`Trạng thái phiếu giải đấu đã đổi thành: ${STATUS_CONFIG[res.data.status]?.label || res.data.status}`);
              }
              setSuccessData(res.data);
            }
          })
          .catch(() => {});
      }
    }, 3500);

    return () => {
      cleanupSync();
      clearInterval(pollInterval);
    };
  }, [successData?.id, successData?.status]);

  const handleRefreshTicket = async () => {
    if (!successData?.id) return;
    try {
      setRefreshingTicket(true);
      const res = await getTournamentRequestById(successData.id);
      if (res.data) {
        setSuccessData(res.data);
        setMyTournamentRequests((prev) =>
          prev.map((r) => (r.id === res.data.id ? res.data : r))
        );
        toast.success("Đã làm mới thông tin phiếu đặt!");
      }
    } catch (err) {
      console.error("Lỗi làm mới phiếu giải đấu:", err);
      toast.error("Không thể cập nhật trạng thái phiếu.");
    } finally {
      setRefreshingTicket(false);
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success(`Đã sao chép mã phiếu: ${code}`);
  };

  return (
    <div className="tr-page">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Hero Banner ── */}
      <section className="tr-hero">
        <div className="tr-hero__content">
          <span className="tr-hero__badge">
            <span className="material-symbols-outlined">emoji_events</span>
            Dành cho Doanh nghiệp, CLB &amp; Ban tổ chức
          </span>
          <h1 className="tr-hero__title">
            Tổ Chức Giải Đấu Bóng Đá <span className="highlight">Trọn Gói Chuyên Nghiệp</span>
          </h1>
          <p className="tr-hero__desc">
            Không giới hạn số khung giờ, hỗ trợ đặt nhiều sân thi đấu song song cùng lúc với chính sách giá ưu đãi,
            tổ trọng tài VFF, livestream đa góc và hệ thống vật tư dịch vụ sẵn có đạt chuẩn.
          </p>
        </div>
      </section>

      {/* ── Feature Highlights ── */}
      <section className="tr-features">
        <div className="tr-features__grid">
          <div className="tr-feature-card">
            <div className="tr-feature-card__icon" style={{ background: "#ecfdf5", color: "#059669" }}>
              <span className="material-symbols-outlined">grid_view</span>
            </div>
            <h3>Đặt Đa Sân &amp; Dài Ngày</h3>
            <p>Hỗ trợ đặt nhiều sân thi đấu song song trong nhiều ngày liên tiếp hoặc các ngày cuối tuần.</p>
          </div>

          <div className="tr-feature-card">
            <div className="tr-feature-card__icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
              <span className="material-symbols-outlined">videocam</span>
            </div>
            <h3>Livestream &amp; Bình Luận</h3>
            <p>Đội ngũ media chuyên nghiệp, bình luận viên trực tiếp và quay phát highlights trận đấu.</p>
          </div>

          <div className="tr-feature-card">
            <div className="tr-feature-card__icon" style={{ background: "#fef3c7", color: "#d97706" }}>
              <span className="material-symbols-outlined">sports</span>
            </div>
            <h3>Trọng Tài &amp; Điều Phối</h3>
            <p>Đội ngũ trọng tài có chứng chỉ VFF, giám sát biên và bảng điện tử điều khiển trận đấu.</p>
          </div>

          <div className="tr-feature-card">
            <div className="tr-feature-card__icon" style={{ background: "#fdf2f8", color: "#db2777" }}>
              <span className="material-symbols-outlined">percent</span>
            </div>
            <h3>Ưu Đãi Hợp Đồng Lớn</h3>
            <p>Chiết khấu đặc biệt theo quy mô giải, hợp đồng pháp lý rõ ràng và xuất hóa đơn VAT đầy đủ.</p>
          </div>
        </div>
      </section>

      {/* ── Main Form Section ── */}
      <section className="tr-main-section">
        {/* Banner chuyển đổi nếu người dùng đã có phiếu trước đó */}
        {myTournamentRequests.length > 0 && !successData && (
          <div className="tr-my-requests-banner">
            <div className="tr-my-requests-info">
              <span className="material-symbols-outlined">receipt_long</span>
              <span>
                Bạn đang có <b>{myTournamentRequests.length}</b> phiếu yêu cầu tổ chức giải đấu.
              </span>
            </div>
            <button
              type="button"
              className="btn-view-recent-tr"
              onClick={() => setSuccessData(myTournamentRequests[0])}
            >
              <span className="material-symbols-outlined">visibility</span>
              Xem phiếu gần nhất ({myTournamentRequests[0].request_id_short || `#TR-${String(myTournamentRequests[0].id).slice(0, 8).toUpperCase()}`})
            </button>
          </div>
        )}

        {successData ? (() => {
          const statusKey = successData.status || "Pending";
          const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.Pending;
          const ticketCode = successData.request_id_short || `#TR-${String(successData.id).slice(0, 8).toUpperCase()}`;
          const fieldsList = parseListField(successData.selected_fields_info);
          const servicesList = parseListField(successData.services_requested);
          const durationDays = getDurationDays(successData.start_date, successData.end_date);
          const canCancel = canCancelTournamentTicket(successData.status);

          return (
            <div className="tr-ticket-container">
              {/* 1. Header Banner Thông Báo & Trạng Thái */}
              <div className={`tr-ticket-banner ${statusCfg.badgeClass}`}>
                <div className="tr-ticket-banner__icon">
                  <span className="material-symbols-outlined">{statusCfg.icon}</span>
                </div>
                <div className="tr-ticket-banner__main">
                  <div className="tr-ticket-banner__meta-row">
                    <span
                      className="tr-status-pill"
                      style={{
                        background: statusCfg.bg,
                        color: statusCfg.color,
                        borderColor: statusCfg.border,
                      }}
                    >
                      <span className="dot" style={{ background: statusCfg.color }} />
                      {statusCfg.label}
                    </span>
                    <span className="tr-ticket-banner__created">
                      <span className="material-symbols-outlined">schedule</span>
                      Gửi lúc: {formatDateTimeVN(successData.created_at)}
                    </span>
                  </div>

                  <h2 className="tr-ticket-banner__title">
                    {successData.status === "Cancelled"
                      ? "Phiếu Đặt Giải Đấu Đã Bị Hủy"
                      : successData.status === "Approved"
                      ? "Yêu Cầu Giải Đấu Đã Được Phê Duyệt"
                      : "Phiếu Đăng Ký Giải Đấu Của Bạn"}
                  </h2>

                  <p className="tr-ticket-banner__desc">{statusCfg.desc}</p>
                </div>

                <div className="tr-ticket-banner__actions">
                  <button
                    type="button"
                    className="btn-tr-refresh"
                    onClick={handleRefreshTicket}
                    disabled={refreshingTicket}
                    title="Kiểm tra trạng thái mới nhất từ Ban quản lý"
                  >
                    <span className={`material-symbols-outlined ${refreshingTicket ? "spin" : ""}`}>
                      refresh
                    </span>
                    {refreshingTicket ? "Đang tải..." : "Làm mới"}
                  </button>
                </div>
              </div>

              {/* 2. Thẻ Chi Tiết Phiếu Đặt (Ticket Card) */}
              <div className="tr-ticket-card">
                {/* Thanh mã phiếu & hành động */}
                <div className="tr-ticket-card__top">
                  <div className="tr-ticket-code-group">
                    <div className="tr-ticket-code-icon">
                      <span className="material-symbols-outlined">receipt_long</span>
                    </div>
                    <div>
                      <div className="tr-ticket-code-label">MÃ PHIẾU GIẢI ĐẤU</div>
                      <div className="tr-ticket-code-val">{ticketCode}</div>
                    </div>
                  </div>
                  <div className="tr-ticket-top-actions">
                    <button
                      type="button"
                      className="btn-code-copy"
                      onClick={() => handleCopyCode(ticketCode)}
                    >
                      <span className="material-symbols-outlined">content_copy</span>
                      Sao chép mã
                    </button>
                    <button
                      type="button"
                      className="btn-ticket-print"
                      onClick={() => window.print()}
                    >
                      <span className="material-symbols-outlined">print</span>
                      In phiếu
                    </button>
                  </div>
                </div>

                {/* Phản hồi từ Quản trị viên (nếu có) */}
                {successData.admin_notes && (
                  <div className="tr-admin-feedback-box">
                    <div className="tr-admin-feedback-header">
                      <span className="material-symbols-outlined">support_agent</span>
                      Phản hồi &amp; Ghi chú từ Ban Điều Phối:
                    </div>
                    <div className="tr-admin-feedback-text">
                      {successData.admin_notes}
                    </div>
                  </div>
                )}

                {/* Nội dung lưới 3 khối */}
                <div className="tr-ticket-grid">
                  {/* Khối 1: Thông tin Giải đấu & Đại diện */}
                  <div className="tr-ticket-block">
                    <div className="tr-ticket-block__title">
                      <span className="material-symbols-outlined">emoji_events</span>
                      1. Giải Đấu &amp; Người Đại Diện
                    </div>
                    <div className="tr-ticket-dl">
                      <div className="tr-ticket-row highlight-tournament">
                        <span className="tr-lbl">Tên giải đấu:</span>
                        <strong className="tr-val tr-val-tournament">{successData.tournament_name}</strong>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Đơn vị / Doanh nghiệp:</span>
                        <span className="tr-val">{successData.organization || "Cá nhân / Đội tự do"}</span>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Họ tên người liên hệ:</span>
                        <span className="tr-val font-semibold">{successData.contact_name}</span>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Số điện thoại:</span>
                        <span className="tr-val font-semibold text-phone">{successData.contact_phone}</span>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Email liên hệ:</span>
                        <span className="tr-val">{successData.contact_email || "Chưa cung cấp"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Khối 2: Lịch trình & Địa điểm thi đấu */}
                  <div className="tr-ticket-block">
                    <div className="tr-ticket-block__title">
                      <span className="material-symbols-outlined">calendar_month</span>
                      2. Lịch Trình &amp; Sân Thi Đấu
                    </div>
                    <div className="tr-ticket-dl">
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Thời gian dự kiến:</span>
                        <div className="tr-val">
                          <span className="tr-date-range">
                            {formatDateVN(successData.start_date)} ➜ {formatDateVN(successData.end_date)}
                          </span>
                          {durationDays && (
                            <span className="tr-days-badge">{durationDays} ngày</span>
                          )}
                        </div>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Quy mô giải đấu:</span>
                        <span className="tr-val font-semibold">{successData.expected_teams || 8} đội bóng tham gia</span>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Sân bóng đăng ký:</span>
                        <div className="tr-val tr-tags-wrap">
                          {fieldsList.length > 0 ? (
                            fieldsList.map((fName, i) => (
                              <span key={i} className="tr-field-tag-item">
                                <span className="material-symbols-outlined">sports_soccer</span>
                                {fName}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">Chưa chỉ định sân cụ thể</span>
                          )}
                        </div>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Khung giờ thi đấu:</span>
                        <div className="tr-val tr-slots-desc">
                          {successData.time_slots_info || "Chưa xác định"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Khối 3: Gói Dịch Vụ & Ngân Sách */}
                  <div className="tr-ticket-block full-width">
                    <div className="tr-ticket-block__title">
                      <span className="material-symbols-outlined">design_services</span>
                      3. Dịch Vụ Tổ Chức &amp; Dự Toán
                    </div>
                    <div className="tr-ticket-dl">
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Gói dịch vụ đã chọn:</span>
                        <div className="tr-val tr-tags-wrap">
                          {servicesList.length > 0 ? (
                            servicesList.map((sName, i) => (
                              <span key={i} className="tr-srv-tag-item">
                                <span className="material-symbols-outlined">verified</span>
                                {sName}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">Không chọn dịch vụ thêm</span>
                          )}
                        </div>
                      </div>
                      <div className="tr-ticket-row">
                        <span className="tr-lbl">Dự toán ngân sách:</span>
                        <span className="tr-val tr-budget-val">
                          {successData.estimated_budget
                            ? `${Number(successData.estimated_budget).toLocaleString("vi-VN")} VNĐ`
                            : "Chưa ước tính ngân sách"}
                        </span>
                      </div>
                      {successData.notes && (
                        <div className="tr-ticket-row">
                          <span className="tr-lbl">Ghi chú từ bạn:</span>
                          <div className="tr-val tr-notes-bubble">{successData.notes}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Khối 4: Thông Tin Thanh Toán */}
                  <div className="tr-ticket-block full-width">
                    <div className="tr-ticket-block__title">
                      <span className="material-symbols-outlined">payments</span>
                      4. Tình Trạng Thanh Toán Giữ Sân
                    </div>
                    {(() => {
                      const pStatus = String(successData.payment_status || "Unpaid").toLowerCase().trim();
                      const isFullPaid = (pStatus === "paid" || pStatus === "completed" || pStatus === "success" || pStatus === "full_paid");
                      const isDepositPaid = (pStatus === "deposit_paid" || pStatus === "partial_paid");
                      const cardClass = isFullPaid ? "status-paid" : (isDepositPaid ? "status-deposit" : "status-unpaid");

                      return (
                        <div className={`tr-ticket-pay-card ${cardClass}`}>
                          <div className="tr-ticket-pay-header">
                            <div className="tr-ticket-pay-title">
                              <span className="material-symbols-outlined">receipt_long</span>
                              <span>Chi tiết thanh toán giải đấu</span>
                            </div>
                            <div>
                              {isFullPaid ? (
                                <span className="tr-ticket-pay-badge full_paid">
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
                                  ĐÃ THANH TOÁN 100%
                                </span>
                              ) : isDepositPaid ? (
                                <span className="tr-ticket-pay-badge deposit_paid">
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>bolt</span>
                                  ĐÃ CỌC TRƯỚC 50%
                                </span>
                              ) : (
                                <span className="tr-ticket-pay-badge unpaid">
                                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>pending</span>
                                  CHỜ THANH TOÁN
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="tr-ticket-pay-grid">
                            <div className="tr-ticket-pay-item">
                              <span className="lbl">Phương thức:</span>
                              <span className="val">
                                {successData.payment_method === "deposit"
                                  ? "Đặt cọc trước 50% (SePay)"
                                  : "Thanh toán toàn bộ 100% (SePay)"}
                              </span>
                            </div>
                            <div className="tr-ticket-pay-item">
                              <span className="lbl">Số tiền đã trả:</span>
                              <span className="val paid">
                                {Number(successData.paid_amount || 0).toLocaleString("vi-VN")} VNĐ
                              </span>
                            </div>
                            <div className="tr-ticket-pay-item">
                              <span className="lbl">Còn lại cần thu tại sân:</span>
                              <span className="val remaining">
                                {Number(successData.remaining_amount || 0).toLocaleString("vi-VN")} VNĐ
                              </span>
                            </div>
                            <div className="tr-ticket-pay-item">
                              <span className="lbl">Mã giao dịch / Nội dung:</span>
                              <span className="val font-mono">
                                {successData.transaction_id || `TR${String(successData.id).slice(0, 8).toUpperCase()}`}
                              </span>
                            </div>
                          </div>

                          {!isFullPaid && (!isDepositPaid || Number(successData.paid_amount || 0) === 0) && (
                            <button
                              type="button"
                              className="btn-open-payment-qr"
                              onClick={() => handleOpenQrForTicket(successData)}
                            >
                              <span className="material-symbols-outlined">qr_code_scanner</span>
                              Mở mã QR SePay để thanh toán ngay
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 3. Thanh tác vụ & NÚT HỦY PHIẾU */}
                <div className="tr-ticket-bottom-bar">
                  <div className="tr-ticket-cancel-area">
                    {canCancel ? (
                      <button
                        type="button"
                        className="btn-cancel-ticket"
                        onClick={() => setShowCancelModal(true)}
                      >
                        <span className="material-symbols-outlined">event_busy</span>
                        Hủy Phiếu Đặt Giải Đấu
                      </button>
                    ) : successData.status === "Cancelled" ? (
                      <div className="tr-status-callout tr-callout-cancelled">
                        <span className="material-symbols-outlined">cancel</span>
                        <span>Phiếu đăng ký này đã được bạn hủy bỏ.</span>
                      </div>
                    ) : (
                      <div className="tr-status-callout tr-callout-approved">
                        <span className="material-symbols-outlined">verified</span>
                        <span>Phiếu đã được duyệt và khóa lịch thi đấu chính thức.</span>
                      </div>
                    )}
                  </div>

                  <div className="tr-ticket-nav-btns">
                    <button
                      type="button"
                      className="btn-tr-outline"
                      onClick={() => {
                        setSuccessData(null);
                        setTournamentName("");
                        setNotes("");
                      }}
                    >
                      <span className="material-symbols-outlined">add_circle</span>
                      Gửi thêm phiếu khác
                    </button>
                    {myTournamentRequests.length > 1 && (
                      <button
                        type="button"
                        className="btn-tr-outline"
                        onClick={() => setShowMyRequestsModal(true)}
                      >
                        <span className="material-symbols-outlined">view_list</span>
                        Danh sách phiếu ({myTournamentRequests.length})
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-tr-primary"
                      onClick={() => navigate("/fields")}
                    >
                      <span className="material-symbols-outlined">stadium</span>
                      Xem danh sách sân
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          <form className="tr-form-card" onSubmit={handleSubmit}>
            <div className="tr-form-header">
              <h2>Phiếu Đăng Ký Tổ Chức Giải Đấu</h2>
              <p>Điền thông tin giải đấu của bạn dưới đây. Chúng tôi sẽ liên hệ báo giá và giữ sân sớm nhất.</p>
            </div>

            {/* 1. Ban tổ chức */}
            <div className="tr-form-section">
              <div className="tr-section-title">
                <span className="material-symbols-outlined">badge</span>
                1. Thông tin Ban tổ chức / Người đại diện
              </div>
              <div className="tr-fields-grid-2">
                <div className="tr-input-group">
                  <label>Họ và tên người liên hệ <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn Nam"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>
                <div className="tr-input-group">
                  <label>Số điện thoại liên hệ <span className="req">*</span></label>
                  <input
                    type="tel"
                    placeholder="VD: 0912 345 678"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="tr-fields-grid-2">
                <div className="tr-input-group">
                  <label>Email nhận báo giá &amp; hợp đồng</label>
                  <input
                    type="email"
                    placeholder="VD: contact@congty.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="tr-input-group">
                  <label>Tên Công ty / Câu lạc bộ / Đoàn thể</label>
                  <input
                    type="text"
                    placeholder="VD: Công ty Cổ phần Công nghệ ABC"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 2. Quy mô giải đấu & Thời gian */}
            <div className="tr-form-section">
              <div className="tr-section-title">
                <span className="material-symbols-outlined">stadium</span>
                2. Thông tin giải đấu &amp; Lịch trình dự kiến
              </div>
              <div className="tr-input-group" style={{ marginBottom: "1rem" }}>
                <label>Tên giải đấu dự kiến <span className="req">*</span></label>
                <input
                  type="text"
                  placeholder="VD: Giải Bóng Đá Giao Hữu Mùa Thu 2026 - Cup ABC"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  required
                />
              </div>

              <div className="tr-fields-grid-3">
                <div className="tr-input-group">
                  <label>Ngày bắt đầu dự kiến <span className="req">*</span></label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      if (endDate && endDate < newStart) {
                        setEndDate(newStart);
                      }
                    }}
                    required
                  />
                </div>
                <div className="tr-input-group">
                  <label>Ngày kết thúc dự kiến <span className="req">*</span></label>
                  <input
                    type="date"
                    min={startDate || new Date().toISOString().split("T")[0]}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
                <div className="tr-input-group">
                  <label>Số đội tham gia dự kiến</label>
                  <select
                    value={expectedTeams}
                    onChange={(e) => setExpectedTeams(Number(e.target.value))}
                  >
                    <option value={4}>4 đội</option>
                    <option value={8}>8 đội (Phổ biến)</option>
                    <option value={12}>12 đội</option>
                    <option value={16}>16 đội (Giải lớn)</option>
                    <option value={24}>24 đội</option>
                    <option value={32}>32 đội</option>
                  </select>
                </div>
              </div>

              {/* Chọn cụm sân mong muốn có hiển thị ảnh sân kèm tên sân */}
              <div className="tr-input-group" style={{ marginTop: "1rem" }}>
                <div className="tr-field-select-header">
                  <label className="tr-field-select-label">
                    Các sân mong muốn thi đấu (Chọn một hoặc nhiều sân song song):
                  </label>
                  <span className="tr-field-select-counter">
                    Đã chọn: <strong>{selectedFieldIds.length}</strong> sân
                  </span>
                </div>
                {loadingFields ? (
                  <p className="tr-hint">Đang tải danh sách sân bóng...</p>
                ) : (
                  <div className="tr-fields-card-grid">
                    {fields.map((f) => {
                      const isChecked = selectedFieldIds.includes(f.id);
                      const imgSource = resolveImgUrl(f.image_url || f.image);
                      return (
                        <div
                          key={f.id}
                          className={`tr-field-card-select ${isChecked ? "selected" : ""}`}
                          onClick={() => handleToggleField(f.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggleField(f.id);
                            }
                          }}
                        >
                          <div className="tr-field-card-thumb">
                            {imgSource ? (
                              <img
                                src={imgSource}
                                alt={f.field_name}
                                className="tr-field-card-img"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fallback = e.currentTarget.parentElement?.querySelector(".tr-field-card-fallback");
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="tr-field-card-fallback"
                              style={{ display: imgSource ? "none" : "flex" }}
                            >
                              <span className="material-symbols-outlined">sports_soccer</span>
                            </div>
                            <div className={`tr-field-card-checkbox ${isChecked ? "active" : ""}`}>
                              <span className="material-symbols-outlined">
                                {isChecked ? "check_circle" : "radio_button_unchecked"}
                              </span>
                            </div>
                          </div>
                          <div className="tr-field-card-info">
                            <span className="tr-field-card-title" title={f.field_name}>{f.field_name}</span>
                            <div className="tr-field-card-meta">
                              <span className="tr-field-card-tag">{f.field_type || "Sân cỏ nhân tạo"}</span>
                              {f.price_per_hour ? (
                                <span className="tr-field-card-price">
                                  {Number(f.price_per_hour).toLocaleString("vi-VN")}đ/h
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── BỘ CHỌN KHUNG GIỜ THI ĐẤU THEO CÁC NGÀY ── */}
              <div className="tr-slots-box" style={{ marginTop: "1.25rem" }}>
                <div className="tr-slots-box__header">
                  <div className="tr-slots-box__title">
                    <span className="material-symbols-outlined">schedule</span>
                    <h4>Chọn Khung Giờ Thi Đấu Trong Các Ngày</h4>
                  </div>
                  <span className="tr-badge-green">Không giới hạn khung giờ</span>
                </div>

                {/* 3 Lựa chọn chế độ lên lịch */}
                <div className="tr-slot-mode-selector">
                  <button
                    type="button"
                    className={`tr-mode-btn ${slotMode === "all_days" ? "active" : ""}`}
                    onClick={() => setSlotMode("all_days")}
                  >
                    <span className="material-symbols-outlined">calendar_month</span>
                    <span>Tất cả các ngày trong giải</span>
                  </button>
                  <button
                    type="button"
                    className={`tr-mode-btn ${slotMode === "weekends" ? "active" : ""}`}
                    onClick={() => setSlotMode("weekends")}
                  >
                    <span className="material-symbols-outlined">date_range</span>
                    <span>Chỉ Thứ 7 &amp; Chủ Nhật</span>
                  </button>
                  <button
                    type="button"
                    className={`tr-mode-btn ${slotMode === "custom_days" ? "active" : ""}`}
                    onClick={() => setSlotMode("custom_days")}
                    disabled={tournamentDays.length === 0}
                    title={tournamentDays.length === 0 ? "Vui lòng chọn ngày bắt đầu & kết thúc trước" : ""}
                  >
                    <span className="material-symbols-outlined">tune</span>
                    <span>Tùy chỉnh chi tiết từng ngày</span>
                  </button>
                </div>

                {/* Nếu chọn chế độ Tùy chỉnh chi tiết từng ngày */}
                {slotMode === "custom_days" && (
                  <div className="tr-custom-days-tabs">
                    {tournamentDays.length === 0 ? (
                      <p className="tr-hint">Vui lòng chọn Ngày bắt đầu và Ngày kết thúc ở trên để hiển thị lịch từng ngày.</p>
                    ) : (
                      <div className="tr-days-nav">
                        {tournamentDays.map((d, idx) => {
                          const slotCount = (selectedDaySlots[d.dateStr] || []).length;
                          return (
                            <button
                              key={d.dateStr}
                              type="button"
                              className={`tr-day-nav-item ${activeDayIndex === idx ? "active" : ""} ${d.isWeekend ? "weekend" : ""}`}
                              onClick={() => setActiveDayIndex(idx)}
                            >
                              <span className="day-name">{d.weekdayName}</span>
                              <span className="day-num">{d.displayDate}</span>
                              {slotCount > 0 && <span className="day-badge">{slotCount} ca</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Danh sách các khung giờ để tích chọn */}
                <div className="tr-slot-groups-container">
                  {/* Ca Sáng */}
                  <div className="tr-slot-group">
                    <span className="slot-group-label">
                      <span className="material-symbols-outlined">wb_sunny</span>
                      Ca Sáng / Buổi trưa:
                    </span>
                    <div className="tr-slots-chips-grid">
                      {MORNING_SLOTS.map((slot) => {
                        let isSelected = false;
                        if (slotMode === "custom_days") {
                          const activeDate = tournamentDays[activeDayIndex]?.dateStr;
                          isSelected = (selectedDaySlots[activeDate] || []).includes(slot);
                        } else {
                          isSelected = selectedCommonSlots.includes(slot);
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`tr-slot-chip ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              if (slotMode === "custom_days") {
                                const activeDate = tournamentDays[activeDayIndex]?.dateStr;
                                if (activeDate) handleToggleDaySlot(activeDate, slot);
                              } else {
                                handleToggleCommonSlot(slot);
                              }
                            }}
                          >
                            <span className="slot-check">{isSelected ? "✓" : "+"}</span>
                            <span>{slot}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ca Chiều & Tối */}
                  <div className="tr-slot-group" style={{ marginTop: "0.85rem" }}>
                    <span className="slot-group-label">
                      <span className="material-symbols-outlined">nightlight</span>
                      Ca Chiều &amp; Tối (Giờ vàng thi đấu):
                    </span>
                    <div className="tr-slots-chips-grid">
                      {AFTERNOON_EVENING_SLOTS.map((slot) => {
                        let isSelected = false;
                        if (slotMode === "custom_days") {
                          const activeDate = tournamentDays[activeDayIndex]?.dateStr;
                          isSelected = (selectedDaySlots[activeDate] || []).includes(slot);
                        } else {
                          isSelected = selectedCommonSlots.includes(slot);
                        }

                        return (
                          <button
                            key={slot}
                            type="button"
                            className={`tr-slot-chip ${isSelected ? "selected" : ""}`}
                            onClick={() => {
                              if (slotMode === "custom_days") {
                                const activeDate = tournamentDays[activeDayIndex]?.dateStr;
                                if (activeDate) handleToggleDaySlot(activeDate, slot);
                              } else {
                                handleToggleCommonSlot(slot);
                              }
                            }}
                          >
                            <span className="slot-check">{isSelected ? "✓" : "+"}</span>
                            <span>{slot}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Hộp tóm tắt khung giờ đã chọn */}
                <div className="tr-slot-summary-box">
                  <div className="tr-slot-summary-left">
                    <span className="material-symbols-outlined">event_available</span>
                    <div>
                      <strong>Tóm tắt khung giờ dự kiến:</strong>
                      <p>{getComputedTimeSlotsInfo()}</p>
                    </div>
                  </div>
                </div>

                {/* Ô nhập ghi chú khung giờ đặc biệt */}
                <div className="tr-input-group" style={{ marginTop: "0.85rem" }}>
                  <label style={{ fontSize: "0.78rem" }}>Ghi chú khung giờ đặc biệt (nếu có):</label>
                  <input
                    type="text"
                    placeholder="VD: Khai mạc 07:30 ngày đầu, chung kết đá đêm 19:30 - 21:30..."
                    value={customSlotNotes}
                    onChange={(e) => setCustomSlotNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 3. Dịch vụ hỗ trợ sự kiện & Dịch vụ hệ thống */}
            <div className="tr-form-section">
              <div className="tr-section-title">
                <span className="material-symbols-outlined">volunteer_activism</span>
                3. Dịch vụ hỗ trợ &amp; Tiện ích tại sân
              </div>
              <p className="tr-hint" style={{ marginBottom: "1rem" }}>
                Chọn các dịch vụ bạn cần hỗ trợ để ban quản trị lên dự toán và chuẩn bị đầy đủ:
              </p>

              {/* 3.1 Dịch vụ tiện ích tại sân đang có trong hệ thống (Hình ảnh thật, chọn số lượng, size giày) */}
              <div className="tr-service-sub-block">
                <h4 className="tr-sub-heading">
                  <span className="material-symbols-outlined">inventory_2</span>
                  Vật tư &amp; Tiện ích sẵn có tại sân cỏ
                </h4>
                {loadingServices ? (
                  <p className="tr-hint">Đang tải danh mục dịch vụ từ hệ thống...</p>
                ) : systemServices.length > 0 ? (
                  <div className="fd-services-grid">
                    {systemServices.map((service) => {
                      const qty = selectedQuantities[service.id] || 0;
                      const isFree = service.isFree || service.price === 0;
                      const maxStock = service.stock !== undefined && service.stock !== null ? Number(service.stock) : 999;
                      const isOutOfStock = maxStock <= 0;

                      return (
                        <div key={service.id} className={`service-item-card ${qty > 0 ? "selected" : ""}`}>
                          <div className="service-icon-box">
                            {service.image ? (
                              <img src={getFullImageUrl(service.image)} alt={service.name} className="service-image-thumb" />
                            ) : (
                              <span className="material-symbols-outlined">{service.icon}</span>
                            )}
                          </div>
                          <div className="service-details">
                            <div className="service-title">{service.name}</div>
                            <div className="service-desc">{service.desc}</div>
                            <div className="service-price">
                              {isFree ? (
                                <span className="price-free">Miễn phí / {service.unit}</span>
                              ) : (
                                <span className="price-val">
                                  {Number(service.price).toLocaleString("vi-VN")}đ <span>/ {service.unit}</span>
                                </span>
                              )}
                            </div>

                            {/* Thông tin số lượng trong kho */}
                            <div style={{ marginTop: "4px" }}>
                              {isFree ? (
                                <span style={{ fontSize: "0.74rem", color: "#16a34a", fontWeight: 600 }}>
                                  Miễn phí đi kèm
                                </span>
                              ) : isOutOfStock ? (
                                <span style={{ fontSize: "0.74rem", color: "#dc2626", fontWeight: 700, background: "#fee2e2", padding: "1px 6px", borderRadius: "4px" }}>
                                  Hết hàng trong kho
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "0.74rem",
                                    color: maxStock <= 5 ? "#e11d48" : "#047857",
                                    fontWeight: 600,
                                    background: maxStock <= 5 ? "#fff1f2" : "#f0fdf4",
                                    padding: "2px 7px",
                                    borderRadius: "4px",
                                    border: `1px solid ${maxStock <= 5 ? "#fecdd3" : "#bbf7d0"}`,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>inventory_2</span>
                                  Kho: <strong>{service.stock}</strong> {service.unit}
                                </span>
                              )}
                            </div>

                            {/* Size selector nếu là giày */}
                            {service.isShoe && qty > 0 && (
                              <div className="service-size-selector">
                                <span>Chọn size:</span>
                                <select
                                  value={selectedShoeSizes[service.id] || "41"}
                                  onChange={(e) => updateShoeSize(service.id, e.target.value)}
                                >
                                  {[38, 39, 40, 41, 42, 43, 44].map((sz) => (
                                    <option key={sz} value={sz}>
                                      Size {sz}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          <div className="service-action">
                            {isFree ? (
                              <span className="badge-included">Đã bao gồm</span>
                            ) : isOutOfStock ? (
                              <span className="badge-included" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700 }}>
                                Hết hàng
                              </span>
                            ) : (
                              <div className="qty-control">
                                <button
                                  type="button"
                                  className="qty-btn"
                                  onClick={() => updateServiceQuantity(service.id, -1)}
                                  disabled={qty <= 0}
                                  title="Giảm số lượng"
                                >
                                  -
                                </button>
                                <span className="qty-val">{qty}</span>
                                <button
                                  type="button"
                                  className="qty-btn plus"
                                  onClick={() => updateServiceQuantity(service.id, 1)}
                                  disabled={qty >= maxStock || isOutOfStock}
                                  title={isOutOfStock ? "Sản phẩm đã hết kho" : qty >= maxStock ? `Đã đạt số lượng tồn kho tối đa (${maxStock})` : "Thêm số lượng"}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="tr-hint">Chưa có dịch vụ vật tư bán kèm trên hệ thống.</p>
                )}
              </div>

              {/* 3.2 Gói sự kiện & giải đấu chuyên nghiệp (Sẵn có trọn gói, không cần chọn và không tính phí phụ thu) */}
              <div className="tr-service-sub-block" style={{ marginTop: "1.25rem" }}>
                <h4 className="tr-sub-heading">
                  <span className="material-symbols-outlined">military_tech</span>
                  Gói dịch vụ tổ chức sự kiện chuyên nghiệp
                </h4>
                <p className="tr-hint" style={{ marginBottom: "0.75rem" }}>
                  ✨ Các gói dịch vụ dưới đây là <strong>tiện ích sẵn có trọn gói</strong> đi kèm giải đấu, không cần chọn và <strong>không tính thêm chi phí</strong>:
                </p>
                <div className="tr-packages-included-grid">
                  {TOURNAMENT_PACKAGES.map((s) => {
                    const isChecked = selectedEventPackageIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`tr-package-included-card ${isChecked ? "active" : "unchecked"}`}
                        onClick={() => toggleEventPackage(s.id)}
                        role="button"
                        tabIndex={0}
                        title={isChecked ? "Nhấn để bỏ chọn gói này" : "Nhấn để chọn lại gói này"}
                      >
                        <div
                          className="tr-pkg-icon-wrap"
                          style={{
                            background: isChecked ? "#ecfdf5" : "#f1f5f9",
                            color: isChecked ? "#059669" : "#94a3b8"
                          }}
                        >
                          <span className="material-symbols-outlined">{s.icon}</span>
                        </div>
                        <div className="tr-pkg-body">
                          <div className="tr-pkg-title-row">
                            <span className="tr-pkg-name" style={{ color: isChecked ? "#0f172a" : "#64748b" }}>
                              {s.label}
                            </span>
                            <span
                              className="tr-pkg-free-tag"
                              style={{
                                background: isChecked ? "#ecfdf5" : "#f1f5f9",
                                color: isChecked ? "#047857" : "#94a3b8",
                                borderColor: isChecked ? "#a7f3d0" : "#cbd5e1"
                              }}
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "14px", verticalAlign: "middle", marginRight: "3px" }}
                              >
                                {isChecked ? "check_circle" : "cancel"}
                              </span>
                              {isChecked ? "✓ Đã chọn (Trọn gói)" : "Bỏ chọn"}
                            </span>
                          </div>
                          <span className="tr-pkg-desc" style={{ color: isChecked ? "#475569" : "#94a3b8" }}>
                            {s.desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dự toán & Ghi chú (Dự toán tự động không sửa được) */}
              <div className="tr-fields-grid-2" style={{ marginTop: "1.25rem" }}>
                <div className="tr-input-group">
                  <label>Dự toán ngân sách giải đấu (VNĐ)</label>
                  <div className="tr-readonly-budget-box">
                    <span className="material-symbols-outlined">calculate</span>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={`${currentBudget.toLocaleString("vi-VN")} VNĐ`}
                      className="tr-budget-readonly-input"
                    />
                  </div>
                  <small className="budget-preview">
                    Dự toán tính theo: <strong>{tournamentDays.length || 1} ngày thi đấu</strong> × <strong>{selectedFieldIds.length || 1} sân đăng ký</strong>
                    {Object.values(selectedQuantities).some((q) => q > 0) && " + vật tư tiện ích đã chọn"}
                  </small>
                </div>
                <div className="tr-input-group">
                  <label>Ghi chú hoặc yêu cầu đặc biệt</label>
                  <textarea
                    rows={3}
                    placeholder="VD: Cần hỗ trợ xuất hóa đơn đỏ VAT cho công ty, có lễ khai mạc vào ngày đầu tiên..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* ══ PHẦN THANH TOÁN (ÁP DỤNG TỪ ĐẶT SÂN) - CHỈ 2 PHƯƠNG THỨC: 100% & CỌC 50% ══ */}
              <div className="tr-payment-section">
                <div className="tr-section-title">
                  <span className="material-symbols-outlined">payments</span>
                  <span>Phương Thức Thanh Toán Xác Nhận</span>
                  <span className="tr-section-badge">Bắt buộc</span>
                </div>
                <p className="tr-section-desc">
                  Chọn phương thức thanh toán để giữ sân giải đấu. Quét mã QR SePay tiện lợi, hệ thống tự động xác nhận 24/7.
                </p>

                <div className="tr-payment-cards-grid">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const isSelected = paymentMethod === opt.value;
                    const dueAmount = opt.value === "deposit" ? Math.round(currentBudget * 0.5) : currentBudget;
                    const remainAmount = opt.value === "deposit" ? Math.round(currentBudget * 0.5) : 0;

                    return (
                      <div
                        key={opt.value}
                        className={`tr-payment-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setPaymentMethod(opt.value)}
                      >
                        <div className="tr-payment-card__header">
                          <div className="tr-radio-indicator">
                            <span className="dot" />
                          </div>
                          <div className="tr-payment-card__title-box">
                            <strong className="tr-payment-card__name">{opt.name}</strong>
                            <span className={`tr-payment-badge ${opt.badgeCls}`}>{opt.badge}</span>
                          </div>
                        </div>
                        <p className="tr-payment-card__desc">{opt.desc}</p>
                        <div className="tr-payment-card__amount-row">
                          <span className="lbl">Số tiền thanh toán ngay:</span>
                          <strong className="amt">{dueAmount.toLocaleString("vi-VN")} VNĐ</strong>
                        </div>
                        {opt.value === "deposit" && (
                          <small className="tr-payment-card__remain-note">
                            50% còn lại ({remainAmount.toLocaleString("vi-VN")} VNĐ) thanh toán tại sân khi diễn ra giải.
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="tr-payment-summary-strip">
                  <div className="summary-item">
                    <span className="lbl">Tổng dự toán:</span>
                    <span className="val">{currentBudget.toLocaleString("vi-VN")} VNĐ</span>
                  </div>
                  <div className="summary-item">
                    <span className="lbl">Hình thức:</span>
                    <span className="val" style={{ color: "#059669" }}>
                      {paymentMethod === "deposit" ? "Đặt cọc trước 50%" : "Thanh toán toàn bộ (100%)"}
                    </span>
                  </div>
                  <div className="summary-item highlight">
                    <span className="lbl">Cần chuyển khoản SePay:</span>
                    <span className="val total-pay">
                      {(paymentMethod === "deposit" ? Math.round(currentBudget * 0.5) : currentBudget).toLocaleString("vi-VN")} VNĐ
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer submit */}
            <div className="tr-form-footer">
              <button type="submit" className="btn-tr-submit" disabled={submitting}>
                {submitting ? (
                  "Đang khởi tạo thanh toán..."
                ) : (
                  <>
                    <span className="material-symbols-outlined">lock_open</span>
                    Xác Nhận &amp; Thanh Toán (
                    {(paymentMethod === "deposit" ? Math.round(currentBudget * 0.5) : currentBudget).toLocaleString("vi-VN")} VNĐ
                    )
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Modal Xác Nhận Hủy Phiếu Đặt Giải Đấu ── */}
      {showCancelModal && successData && (
        <div className="tr-modal-overlay" onClick={() => !cancelling && setShowCancelModal(false)}>
          <div className="tr-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-header danger-header">
              <div className="tr-modal-icon danger-icon">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h3>Xác Nhận Hủy Phiếu Đặt Giải Đấu</h3>
                <p>Hành động này sẽ hủy yêu cầu và giải phóng các khung giờ sân dự kiến.</p>
              </div>
              <button
                type="button"
                className="tr-modal-close"
                onClick={() => !cancelling && setShowCancelModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="tr-modal-body">
              <div className="tr-cancel-summary-box">
                <div className="summary-row">
                  <span className="lbl">Giải đấu:</span>
                  <strong className="val">{successData.tournament_name}</strong>
                </div>
                <div className="summary-row">
                  <span className="lbl">Mã phiếu:</span>
                  <span className="val font-mono">{successData.request_id_short || `#TR-${String(successData.id).slice(0, 8).toUpperCase()}`}</span>
                </div>
                <div className="summary-row">
                  <span className="lbl">Thời gian:</span>
                  <span className="val">{formatDateVN(successData.start_date)} - {formatDateVN(successData.end_date)}</span>
                </div>
                <div className="summary-row">
                  <span className="lbl">Người đặt:</span>
                  <span className="val">{successData.contact_name} ({successData.contact_phone})</span>
                </div>
              </div>

              <div className="tr-input-group" style={{ marginTop: "1rem" }}>
                <label>Lý do hủy phiếu (tùy chọn):</label>
                <textarea
                  rows={3}
                  className="tr-cancel-textarea"
                  placeholder="VD: Thay đổi kế hoạch công ty, dời lịch giải đấu sang tháng sau, đặt nhầm ngày..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={cancelling}
                />
              </div>

              <div className="tr-cancel-alert-warning">
                <span className="material-symbols-outlined">info</span>
                <span>Sau khi hủy, trạng thái phiếu sẽ chuyển thành <b>Đã hủy</b>. Nếu muốn tổ chức lại, bạn có thể gửi phiếu mới bất cứ lúc nào.</span>
              </div>
            </div>

            <div className="tr-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
              >
                Không, giữ lại phiếu
              </button>
              <button
                type="button"
                className="btn-modal-danger-confirm"
                onClick={handleCancelTicket}
                disabled={cancelling}
              >
                {cancelling ? (
                  <>
                    <span className="material-symbols-outlined spin">progress_activity</span>
                    Đang hủy...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">delete_forever</span>
                    Xác Nhận Hủy Phiếu
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Danh Sách Các Phiếu Giải Đấu Của Khách Hàng ── */}
      {showMyRequestsModal && (
        <div className="tr-modal-overlay" onClick={() => setShowMyRequestsModal(false)}>
          <div className="tr-modal-dialog my-requests-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tr-modal-header">
              <div className="tr-modal-icon">
                <span className="material-symbols-outlined">history_edu</span>
              </div>
              <div>
                <h3>Phiếu Đặt Giải Đấu Của Bạn</h3>
                <p>Danh sách các yêu cầu tổ chức giải đấu bạn đã gửi trong hệ thống</p>
              </div>
              <button
                type="button"
                className="tr-modal-close"
                onClick={() => setShowMyRequestsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="tr-modal-body">
              <div className="tr-my-requests-list">
                {myTournamentRequests.map((req) => {
                  const stKey = req.status || "Pending";
                  const st = STATUS_CONFIG[stKey] || STATUS_CONFIG.Pending;
                  return (
                    <div
                      key={req.id}
                      className={`tr-my-request-item ${successData?.id === req.id ? "active-item" : ""}`}
                    >
                      <div className="tr-item-left">
                        <div className="tr-item-code">
                          {req.request_id_short || `#TR-${String(req.id).slice(0, 8).toUpperCase()}`}
                        </div>
                        <div className="tr-item-title">{req.tournament_name}</div>
                        <div className="tr-item-dates">
                          <span className="material-symbols-outlined">calendar_today</span>
                          {formatDateVN(req.start_date)} - {formatDateVN(req.end_date)}
                        </div>
                      </div>
                      <div className="tr-item-right">
                        <span
                          className="tr-status-pill sm-pill"
                          style={{ background: st.bg, color: st.color, borderColor: st.border }}
                        >
                          <span className="dot" style={{ background: st.color }} />
                          {st.label}
                        </span>
                        <button
                          type="button"
                          className="btn-select-tr-item"
                          onClick={() => {
                            setSuccessData(req);
                            setShowMyRequestsModal(false);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tr-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setShowMyRequestsModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VIETQR PAYMENT MODAL (TỰ ĐỘNG NHẬN DIỆN QUA SEPAY) ═══ */}
      {showQrModal && qrData && (
        <div className="qr-overlay" onClick={handleCloseQrModal}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            {qrPaymentSuccess ? (
              <div className="qr-modal--success">
                <div className="qr-success-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: 44 }}>check_circle</span>
                </div>
                <h3 className="qr-success-title">Thanh toán giải đấu thành công!</h3>
                <p className="qr-success-desc">
                  Hệ thống đã nhận diện giao dịch chuyển khoản thành công. Đang cập nhật phiếu đăng ký giải đấu...
                </p>
                <div className="cd-spinner" style={{ borderColor: "#16a34a", borderTopColor: "transparent", margin: "0 auto" }} />
              </div>
            ) : (
              <>
                <div className="qr-modal__header">
                  <div className="qr-modal__header-info">
                    <div className="qr-modal__badge-icon">
                      <span className="material-symbols-outlined">qr_code_scanner</span>
                    </div>
                    <div>
                      <h3 className="qr-modal__title">Quét mã QR thanh toán giải đấu</h3>
                      <p className="qr-modal__subtitle">Tự động xác nhận qua cổng thanh toán SePay (Napas 24/7)</p>
                    </div>
                  </div>
                  <button className="qr-modal__close-btn" onClick={handleCloseQrModal} title="Đóng">
                    ✕
                  </button>
                </div>

                <div className="qr-modal__body">
                  {/* Left QR Column */}
                  <div className="qr-code-box">
                    <div className="qr-img-wrapper">
                      <img
                        src={qrData.qr_url}
                        alt="Mã QR SePay thanh toán giải đấu"
                        className="qr-img"
                      />
                    </div>
                    <div className="qr-code-box__label">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#16a34a" }}>verified</span>
                      <span>Mã SePay Napas 24/7 hợp lệ</span>
                    </div>
                    <div className="qr-code-box__timer">
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>timer</span>
                      <span>
                        {String(Math.floor(qrCountdown / 60)).padStart(2, "0")}:
                        {String(qrCountdown % 60).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  {/* Right Details Column */}
                  <div className="qr-details">
                    <div className="qr-detail-row">
                      <div>
                        <span className="qr-detail-label">Ngân hàng thụ hưởng</span>
                        <div className="qr-detail-value">{qrData.bank_name || "Vietcombank"}</div>
                      </div>
                    </div>

                    <div className="qr-detail-row">
                      <div>
                        <span className="qr-detail-label">Số tài khoản</span>
                        <div className="qr-detail-value">{qrData.account_no}</div>
                      </div>
                      <button
                        type="button"
                        className={`qr-copy-btn ${copiedField === "acc" ? "qr-copy-btn--copied" : ""}`}
                        onClick={() => handleCopy(qrData.account_no, "acc")}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {copiedField === "acc" ? "check" : "content_copy"}
                        </span>
                        {copiedField === "acc" ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>

                    <div className="qr-detail-row">
                      <div>
                        <span className="qr-detail-label">Tên chủ tài khoản</span>
                        <div className="qr-detail-value">{qrData.account_name}</div>
                      </div>
                    </div>

                    <div className="qr-detail-row">
                      <div>
                        <span className="qr-detail-label">Số tiền cần thanh toán</span>
                        <div className="qr-detail-value qr-detail-value--amount">
                          {Number(qrData.amount || 0).toLocaleString("vi-VN")} VNĐ
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`qr-copy-btn ${copiedField === "amt" ? "qr-copy-btn--copied" : ""}`}
                        onClick={() => handleCopy(qrData.amount, "amt")}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {copiedField === "amt" ? "check" : "content_copy"}
                        </span>
                        {copiedField === "amt" ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>

                    <div className="qr-detail-row" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
                      <div>
                        <span className="qr-detail-label" style={{ color: "#166534" }}>Nội dung chuyển khoản (bắt buộc)</span>
                        <div className="qr-detail-value qr-detail-value--code">{qrData.payment_code}</div>
                      </div>
                      <button
                        type="button"
                        className={`qr-copy-btn ${copiedField === "code" ? "qr-copy-btn--copied" : ""}`}
                        onClick={() => handleCopy(qrData.payment_code, "code")}
                        style={{ background: "#22c55e", color: "#fff" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {copiedField === "code" ? "check" : "content_copy"}
                        </span>
                        {copiedField === "code" ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>

                    <div className="qr-notice">
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                      <div>
                        Mở App ngân hàng quét mã QR trên. Hệ thống sẽ <strong>tự động nhận diện sau 2-3 giây</strong> khi tiền vào tài khoản!
                      </div>
                    </div>
                  </div>
                </div>

                {/* Radar Status Bar & Test Demo Trigger */}
                <div className="qr-status-bar">
                  <div className="qr-status-bar__left">
                    <div className="qr-status-pulse">
                      <div className="qr-status-pulse__dot" />
                      <div className="qr-status-pulse__ring" />
                    </div>
                    <div>
                      <div className="qr-status-text">Đang lắng nghe giao dịch chuyển khoản...</div>
                      <div className="qr-status-sub">Trang sẽ tự động cập nhật khi nhận được tiền</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="qr-simulate-btn"
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    title="Bấm để kích hoạt thanh toán ngay mà không cần chuyển tiền thật (Dành cho Test / Demo)"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#f59e0b" }}>bolt</span>
                    {simulating ? "Đang xử lý..." : "Mô phỏng Test"}
                  </button>
                </div>

                {/* Nút Hủy Thanh Toán & Quay Lại rõ ràng */}
                <div className="qr-modal__footer-actions">
                  <button
                    type="button"
                    className="qr-cancel-modal-btn"
                    onClick={handleCloseQrModal}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>cancel</span>
                    <span>Hủy thanh toán & Quay lại</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentRequest;
