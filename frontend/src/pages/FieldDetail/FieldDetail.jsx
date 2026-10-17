import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getFieldDetail } from "../../api/fieldsApi";
import { getServices } from "../../api/servicesApi";
import timeslotsApi from "../../api/timeslotsApi";
import { validateVoucher, getMyVouchers } from "../../api/vouchersApi";
import FieldMap from "../../components/FieldMap/FieldMap";
import { BASE_URL } from "../../config";
import "./FieldDetail.css";

const DEFAULT_SERVICES = [
  {
    id: "serv_shoes",
    name: "Thuê giày đá bóng",
    desc: "Đầy đủ size 38 - 44, vệ sinh sạch sẽ",
    price: 20000,
    unit: "đôi",
    icon: "sports",
    isShoe: true,
  },
  {
    id: "serv_water",
    name: "Nước bù khoáng Pocari",
    desc: "Chai 500ml ướp lạnh sẵn sàng",
    price: 15000,
    unit: "chai",
    icon: "water_drop",
    isShoe: false,
  },
  {
    id: "serv_bib",
    name: "Áo bib phân đội (7 cái)",
    desc: "Gồm 2 màu phân biệt nổi bật",
    price: 0,
    unit: "bộ",
    icon: "checkroom",
    isShoe: false,
    isFree: true,
  },
  {
    id: "serv_referee",
    name: "Trọng tài bắt trận",
    desc: "Trọng tài cấp 2 VFF điều hành",
    price: 150000,
    unit: "trận",
    icon: "sports_soccer",
    isShoe: false,
  },
];

const formatDateDisplay = (dateValue) => {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
};

const getSlotDurationMinutes = (slot) => {
  const [startHour, startMinute] = String(slot.start_time).split(":").map(Number);
  const [endHour, endMinute] = String(slot.end_time).split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};

const FieldDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [field, setField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // ─── DATE PICKER STATE ──────────────────────────────────────────────────
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const [year, month] = todayStr.split("-").map(Number);
    return new Date(year, month - 1, 1);
  });

  // Tạo danh sách 7 ngày liên tiếp từ hôm nay
  const weekDays = useMemo(() => {
    const list = [];
    const base = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayNames = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const label = i === 0 ? "Hôm nay" : dayNames[d.getDay()];
      const dayNum = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      list.push({ dateStr, label, dayNum, dayOfWeek: d.getDay() });
    }
    return list;
  }, []);

  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const [year, month] = selectedDate.split("-").map(Number);
    setCalendarMonth(new Date(year, month - 1, 1));
  }, [selectedDate]);

  const monthCalendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const cells = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ date, inCurrentMonth: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(year, month, day), inCurrentMonth: true });
    }

    while (cells.length < 42) {
      const nextDay = cells.length - (startOffset + daysInMonth) + 1;
      cells.push({ date: new Date(year, month + 1, nextDay), inCurrentMonth: false });
    }

    return cells;
  }, [calendarMonth]);

  const changeCalendarMonth = (direction) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
  };

  // ─── TIMESLOTS STATE ────────────────────────────────────────────────────
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [slotPrice, setSlotPrice] = useState(0);
  const [showSlotDropdown, setShowSlotDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ─── SERVICES STATE ─────────────────────────────────────────────────────
  const [servicesList, setServicesList] = useState([]);
  const [selectedServices, setSelectedServices] = useState({});
  const [selectedShoeSizes, setSelectedShoeSizes] = useState({});

  // ─── VOUCHER STATE ──────────────────────────────────────────────────────
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [myVouchers, setMyVouchers] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);

  // Tải danh sách voucher cá nhân của người dùng nếu đã đăng nhập
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user?.id) {
        getMyVouchers(user.id, "active")
          .then((res) => {
            if (res.data?.vouchers) {
              setMyVouchers(res.data.vouchers);
            }
          })
          .catch((err) => console.log("Lỗi tải voucher cá nhân:", err));
      }
    } catch (e) {}
  }, []);

  // ─── REVIEWS STATE (CHỈ LẤY TỪ API) ────────────────────────────────────
  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // ─── Fetch Field Detail ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await getFieldDetail(id);
        const data = res.data;
        setField(data);
        setCurrentImage(data.image_url || "");
        if (data.price_per_hour) {
          setSlotPrice(Number(data.price_per_hour));
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết sân:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  // 3 ảnh nhỏ tạm thời lấy ảnh của ảnh chính hiển thị
  const subImages = useMemo(() => {
    const mainImg = field?.image_url || currentImage || "";
    return [
      {
        url: mainImg,
        label: "Khung thành & lưới chuẩn FIFA",
      },
      {
        url: mainImg,
        label: "Mặt cỏ nhân tạo thế hệ 3 mới",
      },
      {
        url: mainImg,
        label: "Dàn đèn LED chiếu sáng ban đêm",
      },
    ];
  }, [field?.image_url, currentImage]);

  // ─── Fetch Timeslots by Date ───────────────────────────────────────────
  const fetchSlots = useCallback(async (dateToFetch) => {
    if (!id || !dateToFetch) return;
    setLoadingSlots(true);
    try {
      const res = await timeslotsApi.getByField(id, dateToFetch);
      const slots = (Array.isArray(res.data) ? res.data : [])
        .filter((slot) => getSlotDurationMinutes(slot) === 60)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      setAvailableSlots(slots);

      if (slots.length > 0) {
        const firstAvail = slots.find((s) => s.status === "available");
        if (firstAvail) {
          const tr = `${firstAvail.start_time} - ${firstAvail.end_time}`;
          setSelectedTimeSlot(tr);
          setSlotPrice(Number(firstAvail.price) || (field?.price_per_hour ? Number(field.price_per_hour) : 350000));
        }
      }
    } catch (err) {
      console.error("Lỗi lấy timeslots:", err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [id, field]);

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate, fetchSlots]);

  // ─── Fetch Services ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchServicesList = async () => {
      try {
        const res = await getServices({ field_id: id });
        const list = Array.isArray(res.data) ? res.data : res.data?.services || [];
        if (list.length > 0) {
          const formatted = list.map((item) => ({
            id: item.id,
            name: item.name,
            desc: item.description || "Dịch vụ đi kèm chất lượng",
            price: Number(item.price) || 0,
            unit: "lần",
            image: item.image || item.image_url || "",
            icon: /giày|shoe/i.test(item.name)
              ? "sports"
              : /nước|pocari|water/i.test(item.name)
              ? "water_drop"
              : /áo|bib/i.test(item.name)
              ? "checkroom"
              : "inventory_2",
            isShoe: /giày|giay|shoe/i.test(item.name),
            isFree: Number(item.price) === 0,
          }));
          setServicesList(formatted);
        } else {
          setServicesList(DEFAULT_SERVICES);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách dịch vụ:", err);
        setServicesList(DEFAULT_SERVICES);
      }
    };
    fetchServicesList();
  }, [id]);

  // ─── Fetch Reviews (Chỉ lấy dữ liệu thực từ API) ────────────────────────
  useEffect(() => {
    const fetchRev = async () => {
      try {
        const res = await fetch(`${BASE_URL}/reviews/${id}/`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setReviews(data);
            return;
          }
        }
        setReviews([]);
      } catch (err) {
        console.error("Lỗi lấy đánh giá:", err);
        setReviews([]);
      }
    };
    fetchRev();
  }, [id]);

  // ─── Tính điểm trung bình thực tế nếu có reviews ──────────────────────
  const averageRating = useMemo(() => {
    if (!reviews || reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  // ─── Handle Service Quantity ───────────────────────────────────────────
  const updateServiceQty = (serviceId, delta) => {
    setSelectedServices((prev) => {
      const cur = prev[serviceId] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[serviceId];
        return copy;
      }
      return { ...prev, [serviceId]: next };
    });
  };

  const updateShoeSize = (serviceId, size) => {
    setSelectedShoeSizes((prev) => ({
      ...prev,
      [serviceId]: size,
    }));
  };

  // ─── Calculate Total Services Price ─────────────────────────────────────
  const totalServicePrice = useMemo(() => {
    let sum = 0;
    servicesList.forEach((s) => {
      const qty = selectedServices[s.id] || 0;
      if (qty > 0 && s.price > 0) {
        sum += s.price * qty;
      }
    });
    return sum;
  }, [servicesList, selectedServices]);

  const currentFieldPrice = slotPrice || (field?.price_per_hour ? Number(field.price_per_hour) : 350000);
  const subtotalPrice = currentFieldPrice + totalServicePrice;
  const discountAmount = appliedVoucher ? (Number(appliedVoucher.discount_amount) || 0) : 0;
  const totalPrice = Math.max(0, subtotalPrice - discountAmount);

  // ─── Voucher Apply / Remove Handlers ────────────────────────────────────
  const handleApplyVoucher = async (codeOverride) => {
    const code = (codeOverride || voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã voucher!");
      return;
    }
    setValidatingVoucher(true);
    setVoucherError("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await validateVoucher({
        code,
        customer_id: user.id || null,
        total_price: subtotalPrice,
      });
      if (res.data && res.data.valid) {
        setAppliedVoucher(res.data);
        setVoucherCode(res.data.code);
        setShowVoucherModal(false);
      } else {
        setVoucherError(res.data?.error || "Mã giảm giá không hợp lệ");
      }
    } catch (err) {
      setVoucherError(err.response?.data?.error || "Mã voucher không hợp lệ hoặc đã hết hạn");
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  // Tự động tính lại giảm giá nếu subtotal thay đổi
  useEffect(() => {
    if (appliedVoucher) {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      validateVoucher({
        code: appliedVoucher.code,
        customer_id: user.id || null,
        total_price: subtotalPrice,
      })
        .then((res) => {
          if (res.data && res.data.valid) {
            setAppliedVoucher(res.data);
          }
        })
        .catch(() => {});
    }
  }, [subtotalPrice]);

  // ─── Handle Slot Selection ──────────────────────────────────────────────
  const handleSelectSlot = (slot) => {
    if (slot.status !== "available") return;
    const tr = `${slot.start_time} - ${slot.end_time}`;
    setSelectedTimeSlot(tr);
    setSlotPrice(Number(slot.price) || currentFieldPrice);
  };

  // ─── Handle Proceed to Booking ──────────────────────────────────────────
  const handleProceedBooking = async () => {
    if (!selectedTimeSlot) {
      alert("Vui lòng chọn khung giờ thi đấu trước khi tiếp tục!");
      return;
    }

    let currentApplied = appliedVoucher;
    let currentDiscount = discountAmount;
    const rawCode = (appliedVoucher?.code || voucherCode || "").trim().toUpperCase();

    // Nếu người dùng đã gõ mã voucher nhưng chưa bấm nút Áp dụng, tự động kiểm tra và áp dụng
    if (!currentApplied && rawCode) {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const res = await validateVoucher({
          code: rawCode,
          customer_id: user.id || null,
          total_price: subtotalPrice,
        });
        if (res.data && res.data.valid) {
          currentApplied = res.data;
          currentDiscount = Number(res.data.discount_amount) || 0;
          setAppliedVoucher(res.data);
        }
      } catch (err) {
        console.warn("Tự động xác thực voucher trước khi chuyển tiếp:", err);
      }
    }

    const effectiveCode = currentApplied?.code || rawCode;
    const finalPrice = Math.max(0, subtotalPrice - currentDiscount);

    const bookingPayload = {
      fieldId: field.id,
      fieldName: field.field_name,
      fieldAddress: field.location || field.address,
      fieldType: field.field_type,
      fieldImage: currentImage || field.image_url,
      selectedDate,
      selectedTimeSlot,
      price: currentFieldPrice,
      selectedServices,
      selectedShoeSizes,
      totalServicePrice,
      subtotalPrice,
      totalPrice: finalPrice,
      appliedVoucher: currentApplied,
      voucherCode: effectiveCode,
      discountAmount: currentDiscount,
      fromDetailWithVoucher: Boolean(effectiveCode),
      bookingCode: `FB-${selectedDate.replace(/-/g, "")}-${String(field.id).padStart(2, "0")}`,
    };

    navigate(`/booking?field=${field.id}`, { state: bookingPayload });
  };

  // ─── Handle Submit Review ───────────────────────────────────────────────
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const newEntry = {
      id: `rev-${Date.now()}`,
      username: user.fullname || user.username || "Cầu thủ ẩn danh",
      role: "Đã trải nghiệm sân",
      created_at: new Date().toISOString(),
      rating: newRating,
      comment: newComment.trim(),
    };

    setReviews((prev) => [newEntry, ...prev]);
    setNewComment("");
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3000);

    // Gửi lên backend nếu người dùng có tài khoản
    if (user.id) {
      try {
        await fetch(`${BASE_URL}/reviews/create/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field_id: field.id,
            user_id: user.id,
            rating: Number(newRating),
            comment: newComment.trim(),
          }),
        });
      } catch (err) {
        console.error("Lỗi gửi đánh giá lên server:", err);
      }
    }
  };

  // ─── Format date for display ────────────────────────────────────────────
  const formattedFullDate = useMemo(() => {
    if (!selectedDate) return "Chưa chọn";
    const [y, m, d] = selectedDate.split("-");
    return new Date(y, m - 1, d).toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }, [selectedDate]);

  // Phân chia ca sáng/chiều vs ca tối
  const { daySlots, nightSlots } = useMemo(() => {
    const day = [];
    const night = [];

    availableSlots.forEach((slot) => {
      const startHour = parseInt(slot.start_time.split(":")[0], 10);
      if (startHour >= 18) {
        night.push(slot);
      } else {
        day.push(slot);
      }
    });

    return { daySlots: day, nightSlots: night };
  }, [availableSlots]);

  if (loading) {
    return (
      <div className="fd-loading-screen">
        <span className="fd-spinner" />
        <p>Đang tải thông tin sân bóng...</p>
      </div>
    );
  }

  if (!field) {
    return (
      <div className="fd-not-found">
        <h2>Không tìm thấy sân bóng!</h2>
        <Link to="/fields" className="fd-btn-back">
          ← Quay lại danh sách sân
        </Link>
      </div>
    );
  }

  const AMENITIES_LIST = [
    { icon: "directions_car", title: "Bãi đỗ xe oto & xe máy", desc: "An ninh, trông xe 24/7" },
    { icon: "water_drop", title: "Nước suối free", desc: "Miễn phí 1 thùng/ca đặt" },
    { icon: "checkroom", title: "Phòng thay đồ & tắm nóng", desc: "Sạch sẽ, tiện nghi" },
    { icon: "stadium", title: "Khán đài có mái che", desc: "Sức chứa 200 chỗ" },
    { icon: "light_mode", title: "Đèn LED 500W", desc: "Độ sáng chuẩn FIFA" },
    { icon: "sports", title: "Thuê giày & Áo bib", desc: "Đủ size, giặt sạch thơm" },
    { icon: "videocam", title: "Camera an ninh", desc: "Trực tiếp an toàn" },
    { icon: "local_cafe", title: "Căng tin giải khát", desc: "Đồ ăn nhanh, nước ép" },
  ];

  return (
    <div className="fd-page-wrapper">
      <div className="fd-container">
        {/* ── BREADCRUMB ── */}
        <nav className="fd-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="sep">/</span>
          <Link to="/fields">Danh sách sân bóng</Link>
          <span className="sep">/</span>
          <span className="current">{field.field_name}</span>
        </nav>

        {/* ── HEADER THÔNG TIN SÂN ── */}
        <header className="fd-header">
          <div className="fd-header-left">
            <div className="fd-header-badges">
              <span className="fd-badge fd-badge--type">{field.field_type || "SÂN 7 NGƯỜI"}</span>

              {/* Chỉ hiển thị đánh giá khi có dữ liệu thật */}
              {averageRating && (
                <span className="fd-badge fd-badge--rating">
                  <span className="star">⭐</span> {averageRating} ({reviews.length} đánh giá)
                </span>
              )}

              <span className="fd-badge fd-badge--fifa">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
                Mặt cỏ tiêu chuẩn FIFA Pro
              </span>
              <span className="fd-badge fd-badge--open">
                <span className="pulse-dot" /> Đang mở cửa
              </span>
            </div>

            <h1 className="fd-header-title">{field.field_name}</h1>

            <div className="fd-header-meta">
              <div className="meta-item">
                <span className="material-symbols-outlined icon-green">location_on</span>
                <span>{field.location || field.address || "Khu đô thị Nam Hòa Xuân, Ngũ Hành Sơn, Đà Nẵng"}</span>
                <a href="#map-section" className="map-anchor-link">Xem bản đồ</a>
              </div>
              <div className="meta-item">
                <span className="material-symbols-outlined icon-orange">local_fire_department</span>
                <span>Đã có <strong>{field.booking_count || "1.450+"}</strong> lượt đặt sân thành công</span>
              </div>
              <div className="meta-item">
                <span className="material-symbols-outlined icon-green">call</span>
                <span>Hotline: <strong>{field.phone || "0905.123.778"}</strong></span>
              </div>
            </div>
          </div>

          <div className="fd-header-actions">
            <button
              type="button"
              className={`btn-action-outline ${isSaved ? "saved" : ""}`}
              onClick={() => setIsSaved(!isSaved)}
            >
              <span className="material-symbols-outlined">
                {isSaved ? "favorite" : "favorite_border"}
              </span>
              <span>{isSaved ? "Đã lưu" : "Lưu sân"}</span>
            </button>
            <button
              type="button"
              className="btn-action-outline"
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Đã sao chép liên kết sân bóng vào khay nhớ tạm!");
                }
              }}
            >
              <span className="material-symbols-outlined">share</span>
              <span>Chia sẻ</span>
            </button>
          </div>
        </header>

        {/* ── HERO GALLERY (FULL CONTAINER WIDTH TRÊN CÙNG THEO DESIGN) ── */}
        <section className="fd-gallery-hero">
          <div className="fd-gallery-hero__main">
            {currentImage ? (
              <img src={currentImage} alt={field.field_name} className="main-img" />
            ) : (
              <div className="main-img-placeholder">
                <span className="material-symbols-outlined" style={{ fontSize: 64, color: "#16a34a" }}>stadium</span>
              </div>
            )}
            <div className="main-badges">
              <span className="badge-tag dark">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>
                CHUẨN FIFA PRO
              </span>
              <span className="badge-tag green">Kích thước 30x50m</span>
              <span className="badge-tag grey">Sân cỏ nhân tạo</span>
            </div>
            <div className="main-caption">
              <div className="caption-sub">MẶT SÂN TIÊU CHUẨN</div>
              <div className="caption-title">Cụm 4 sân 7 người kết hợp sân 11 tiêu chuẩn</div>
            </div>
            <button
              type="button"
              className="btn-view-all-photos"
              onClick={() => setCurrentImage(field.image_url || "")}
            >
              <span className="material-symbols-outlined">photo_library</span>
              <span>Xem toàn bộ ảnh</span>
            </button>
          </div>

          <div className="fd-gallery-hero__subs">
            {subImages.map((img, idx) => (
              <div
                key={idx}
                className={`sub-img-card ${currentImage === img.url ? "active" : ""}`}
                onClick={() => setCurrentImage(img.url)}
              >
                {img.url ? (
                  <img src={img.url} alt={img.label} />
                ) : (
                  <div className="sub-placeholder">
                    <span className="material-symbols-outlined">stadium</span>
                  </div>
                )}
                <div className="sub-img-caption">
                  <span>{img.label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BỐ CỤC 2 CỘT TỔNG THỂ ── */}
        <div className="fd-layout-grid">
          {/* ═══ CỘT TRÁI (MAIN COL - ~68%) ═══ */}
          <main className="fd-main-col">
            {/* 1. CARD: TIỆN ÍCH VÀ DỊCH VỤ TẠI SÂN (Bắt buộc hiển thị theo design) */}
            <div className="fd-card fd-card--amenities">
              <div className="fd-card-header">
                <span className="green-bar" />
                <h2 className="fd-card-title">Tiện ích và dịch vụ tại sân</h2>
              </div>
              <div className="fd-amenities-grid">
                {AMENITIES_LIST.map((item, idx) => (
                  <div key={idx} className="amenity-item">
                    <div className="amenity-icon-wrap">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="amenity-info">
                      <div className="amenity-title">{item.title}</div>
                      <div className="amenity-desc">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CARD: MÔ TẢ SÂN BÓNG */}
            <div className="fd-card fd-card--desc">
              <div className="fd-card-header">
                <span className="green-bar" />
                <h2 className="fd-card-title">Mô tả sân bóng</h2>
              </div>
              <div className="fd-description-body">
                <p>{field.description?.trim() || "Chưa có mô tả cho sân bóng này."}</p>
              </div>
            </div>

            {/* 4. CARD: DỊCH VỤ ĐI KÈM & PHỤ KIỆN */}
            <div className="fd-card fd-card--services">
              <div className="fd-card-header flex-between">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="green-bar" />
                  <h2 className="fd-card-title">Dịch vụ đi kèm & Phụ kiện</h2>
                </div>
                <span className="fd-card-subtitle-link">Tùy chọn thêm vào giỏ đặt</span>
              </div>

              <div className="fd-services-grid">
                {servicesList.map((service) => {
                  const qty = selectedServices[service.id] || 0;
                  const isFree = service.isFree || service.price === 0;

                  return (
                    <div key={service.id} className={`service-item-card ${qty > 0 ? "selected" : ""}`}>
                      <div className="service-icon-box">
                        {service.image ? (
                          <img src={service.image} alt={service.name} className="service-image-thumb" />
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
                              {service.price.toLocaleString("vi-VN")}đ <span>/ {service.unit}</span>
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
                        ) : (
                          <div className="qty-control">
                            <button
                              type="button"
                              className="qty-btn"
                              onClick={() => updateServiceQty(service.id, -1)}
                              disabled={qty <= 0}
                            >
                              -
                            </button>
                            <span className="qty-val">{qty}</span>
                            <button
                              type="button"
                              className="qty-btn plus"
                              onClick={() => updateServiceQty(service.id, 1)}
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
            </div>

            {/* 5. CARD: LỊCH TRỐNG & CHỌN KHUNG GIỜ */}
            <div className="fd-card fd-card--schedule">
              <div className="fd-card-header flex-between">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="green-bar" />
                  <h2 className="fd-card-title">Lịch trống & Chọn khung giờ</h2>
                </div>
                <div className="fd-slot-legend">
                  <span className="legend-item">
                    <span className="dot dot-avail" /> Trống
                  </span>
                  <span className="legend-item">
                    <span className="dot dot-selected" /> Đang chọn
                  </span>
                  <span className="legend-item">
                    <span className="dot dot-booked" /> Đã đặt
                  </span>
                </div>
              </div>

              {/* Day Tabs */}
              <div className="fd-day-tabs">
                {weekDays.map((w) => {
                  const isCurrent = w.dateStr === selectedDate;
                  return (
                    <button
                      key={w.dateStr}
                      type="button"
                      className={`day-tab-btn ${isCurrent ? "active" : ""}`}
                      onClick={() => setSelectedDate(w.dateStr)}
                    >
                      <span className="day-name">{w.label}</span>
                      <span className="day-date">{w.dayNum}</span>
                      <span className="day-indicator" />
                    </button>
                  );
                })}
              </div>

              {loadingSlots && (
                <div className="slots-loading">
                  <span className="fd-spinner" />
                  <span>Đang tải danh sách khung giờ ngày {selectedDate}...</span>
                </div>
              )}

              {/* Ca Sáng & Chiều */}
              <div className="slots-group">
                <div className="group-label">
                  <span className="label-icon">☀️</span>
                  <span>Ca Sáng & Chiều (Khung giờ phổ thông)</span>
                </div>
                <div className="slots-grid">
                  {daySlots.length === 0 && !loadingSlots ? (
                    <div className="empty-slots">Chưa có ca sáng & chiều cho ngày này.</div>
                  ) : (
                    daySlots.map((slot) => {
                      const isBooked = slot.status !== "available";
                      const tr = `${slot.start_time} - ${slot.end_time}`;
                      const isSelected = selectedTimeSlot === tr;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isBooked}
                          className={`slot-pill ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""}`}
                          onClick={() => handleSelectSlot(slot)}
                        >
                          <div className="slot-pill__time">{tr}</div>
                          <div className="slot-pill__price">
                            {Number(slot.price || currentFieldPrice).toLocaleString()}đ
                          </div>
                          <div className="slot-pill__status">
                            {isBooked ? "Đã đặt" : isSelected ? "✓ Đang chọn" : "Trống"}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Buổi Tối (Giờ vàng thi đấu) */}
              <div className="slots-group">
                <div className="group-label">
                  <span className="label-icon">🌙</span>
                  <span>Buổi Tối (Giờ vàng thi đấu)</span>
                  <span className="hot-tag">🔥 Giờ cao điểm HOT</span>
                </div>
                <div className="slots-grid">
                  {nightSlots.length === 0 && !loadingSlots ? (
                    <div className="empty-slots">Chưa có ca tối cho ngày này.</div>
                  ) : (
                    nightSlots.map((slot) => {
                      const isBooked = slot.status !== "available";
                      const tr = `${slot.start_time} - ${slot.end_time}`;
                      const isSelected = selectedTimeSlot === tr;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isBooked}
                          className={`slot-pill ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""}`}
                          onClick={() => handleSelectSlot(slot)}
                        >
                          <div className="slot-pill__time">{tr}</div>
                          <div className="slot-pill__price">
                            {Number(slot.price || currentFieldPrice).toLocaleString()}đ
                          </div>
                          <div className="slot-pill__status">
                            {isBooked ? "Đã đặt" : isSelected ? "✓ Đang chọn" : "Trống"}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 6. CARD: ĐÁNH GIÁ TỪ CẦU THỦ */}
            <div className="fd-card fd-card--reviews">
              <div className="fd-card-header flex-between">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="green-bar" />
                    <h2 className="fd-card-title">Đánh giá từ cầu thủ</h2>
                  </div>
                  <div className="fd-card-subtitle">
                    {reviews.length > 0
                      ? `${reviews.length} đánh giá xác thực từ người chơi đã trải nghiệm sân`
                      : "Chưa có đánh giá nào cho sân bóng này"}
                  </div>
                </div>

                {/* Chỉ hiển thị tổng điểm khi có reviews thật */}
                {averageRating && (
                  <div className="rating-summary-badge">
                    <div className="score">{averageRating}</div>
                    <div className="stars-meta">
                      <div className="stars">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className="material-symbols-outlined star-icon"
                            style={{
                              color: i < Math.round(Number(averageRating)) ? "#f59e0b" : "#d1d5db",
                              fontVariationSettings: "'FILL' 1",
                            }}
                          >
                            star
                          </span>
                        ))}
                      </div>
                      <div className="sub">{reviews.length} đánh giá xác thực</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Danh sách bình luận nếu có */}
              {reviews.length > 0 ? (
                <div className="reviews-list">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="review-item">
                      <div className="review-avatar">
                        {rev.username ? rev.username.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="review-content">
                        <div className="review-top">
                          <div className="review-user">
                            <strong>{rev.username}</strong>
                            <span className="verified-badge">
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>verified</span>
                              {rev.role || "Đã đặt sân"}
                            </span>
                          </div>
                          <span className="review-date">
                            {rev.created_at
                              ? new Date(rev.created_at).toLocaleDateString("vi-VN")
                              : rev.date || "Gần đây"}
                          </span>
                        </div>
                        <div className="review-stars">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined star-icon"
                              style={{
                                color: i < (rev.rating || 5) ? "#f59e0b" : "#d1d5db",
                                fontVariationSettings: "'FILL' 1",
                              }}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <p className="review-text">{rev.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reviews-empty-state">
                  <span className="material-symbols-outlined empty-icon">rate_review</span>
                  <p>Hiện chưa có đánh giá nào cho sân này. Hãy là người đầu tiên trải nghiệm và để lại nhận xét!</p>
                </div>
              )}

              {/* Form gửi đánh giá */}
              <div className="review-form-wrap">
                <div className="review-form-title">Gửi nhận xét của bạn:</div>
                <div className="rating-picker">
                  <span>Mức độ hài lòng:</span>
                  <div className="stars-pick">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className="material-symbols-outlined star-pick-btn"
                        style={{
                          color: s <= newRating ? "#f59e0b" : "#d1d5db",
                          fontVariationSettings: "'FILL' 1",
                        }}
                        onClick={() => setNewRating(s)}
                      >
                        star
                      </span>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmitReview} className="review-input-row">
                  <input
                    type="text"
                    className="review-input"
                    placeholder="Chia sẻ trải nghiệm của bạn về mặt sân, ánh sáng, dịch vụ..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" className="btn-submit-review">
                    Đánh giá
                  </button>
                </form>
                {reviewSubmitted && (
                  <div className="review-success-msg">✓ Cảm ơn bạn đã đóng góp đánh giá cho sân bóng!</div>
                )}
              </div>
            </div>
          </main>

          {/* ═══ CỘT PHẢI (SIDEBAR COL - ~32%) ═══ */}
          <aside className="fd-sidebar-col">
            <div className="fd-sidebar-sticky-wrap">
              {/* 1. CARD: THÔNG TIN ĐẶT SÂN */}
              <div className="fd-booking-widget">
                <div className="widget-header">
                  <h3 className="widget-title">Thông tin đặt sân</h3>
                <span className="material-symbols-outlined icon-clock">schedule</span>
              </div>

              {/* Ngày thi đấu */}
              <div
                className={`widget-field-row ${showDatePicker ? "open" : ""}`}
                onClick={() => setShowDatePicker((prev) => !prev)}
                title="Bấm để chọn ngày thi đấu"
              >
                <span className="material-symbols-outlined icon-gray">calendar_today</span>
                <div className="widget-field-info">
                  <div className="label">Ngày thi đấu:</div>
                  <div className="val">{formattedFullDate}</div>
                </div>
                <button
                  type="button"
                  className="btn-change-date"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDatePicker((prev) => !prev);
                  }}
                >
                  Đổi
                </button>
              </div>

              {showDatePicker && (
                <div className="widget-date-picker">
                  <div className="widget-date-picker__header">
                    <button
                      type="button"
                      className="widget-date-picker__nav"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeCalendarMonth(-1);
                      }}
                    >
                      ‹
                    </button>
                    <span>
                      {calendarMonth.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      type="button"
                      className="widget-date-picker__nav"
                      onClick={(e) => {
                        e.stopPropagation();
                        changeCalendarMonth(1);
                      }}
                    >
                      ›
                    </button>
                  </div>

                  <div className="widget-date-picker__weekdays">
                    {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((wd) => (
                      <span key={wd}>{wd}</span>
                    ))}
                  </div>

                  <div className="widget-date-picker__grid">
                    {monthCalendarDays.map(({ date, inCurrentMonth }) => {
                      const dateKey = formatDateKey(date);
                      const isSelected = dateKey === selectedDate;
                      const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          className={`widget-date-cell ${inCurrentMonth ? "in-month" : "out-month"} ${isSelected ? "selected" : ""} ${isPast ? "past" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isPast) {
                              setSelectedDate(dateKey);
                              setShowDatePicker(false);
                            }
                          }}
                          disabled={isPast}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* KHUNG GIỜ ĐÃ CHỌN - CLICK VÀO ĐỂ HIỂN THỊ CÁC KHUNG GIỜ CÓ TRONG TIMESLOT ĐỂ CHỌN */}
              <div
                className={`widget-slot-card ${showSlotDropdown ? "open" : ""}`}
                onClick={() => setShowSlotDropdown((prev) => !prev)}
                title="Bấm để chọn hoặc đổi khung giờ"
              >
                <div className="widget-slot-card-left">
                  <div className="widget-slot-label">KHUNG GIỜ ĐÃ CHỌN (BẤM ĐỂ CHỌN)</div>
                  <div className="widget-slot-time">
                    {selectedTimeSlot ? `${selectedTimeSlot} (60 phút)` : "Chưa chọn — bấm để chọn"}
                  </div>
                  <div className="widget-slot-sub">
                    {field.field_name} • {field.field_type || "Sân 7 FIFA Pro"}
                  </div>
                </div>
                <span className="material-symbols-outlined widget-slot-arrow">
                  {showSlotDropdown ? "expand_less" : "expand_more"}
                </span>
              </div>

              {/* DROPDOWN DANH SÁCH TIMESLOT KHI BẤM VÀO KHUNG GIỜ */}
              {showSlotDropdown && (
                <div className="widget-slot-dropdown">
                  <div className="dropdown-title">
                    <span>Chọn khung giờ ngày {formatDateDisplay(selectedDate)}:</span>
                    <button
                      type="button"
                      className="btn-close-dropdown"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSlotDropdown(false);
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {availableSlots.length === 0 ? (
                    <div className="dropdown-empty">Chưa có khung giờ nào cho ngày này</div>
                  ) : (
                    <div className="dropdown-slots-list">
                      {availableSlots.map((slot) => {
                        const isBooked = slot.status !== "available";
                        const tr = `${slot.start_time} - ${slot.end_time}`;
                        const timeLabel = `${slot.start_time}\u2013${slot.end_time}`;
                        const isSelected = selectedTimeSlot === tr;

                        return (
                          <div
                            key={slot.id}
                            className={`dropdown-slot-item ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isBooked) {
                                handleSelectSlot(slot);
                                setShowSlotDropdown(false);
                              }
                            }}
                          >
                            <span className="item-time">{timeLabel}</span>
                            <div className="item-right">
                              <span className="item-price">
                                {Number(slot.price || currentFieldPrice).toLocaleString()}đ
                              </span>
                              <span className={`item-badge ${isBooked ? "badge-booked" : isSelected ? "badge-selected" : "badge-avail"}`}>
                                {isBooked ? "Đã đặt" : isSelected ? "✓ Đang chọn" : "Trống"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Dịch vụ phát sinh */}
              {Object.keys(selectedServices).length > 0 && (
                <div className="widget-services-box">
                  <div className="box-title">Dịch vụ phát sinh:</div>
                  {servicesList
                    .filter((s) => selectedServices[s.id] > 0)
                    .map((s) => (
                      <div key={s.id} className="widget-service-line">
                        <span>
                          + {selectedServices[s.id]} {s.name}
                          {s.isShoe && selectedShoeSizes[s.id] ? ` (size ${selectedShoeSizes[s.id]})` : ""}
                        </span>
                        <span className="service-line-price">
                          {(s.price * selectedServices[s.id]).toLocaleString()}đ
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Bảng chi phí */}
              <div className="widget-price-table">
                <div className="price-row">
                  <span className="row-label">Tiền thuê sân (60p):</span>
                  <span className="row-val">{currentFieldPrice.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="price-row">
                  <span className="row-label">Phí dịch vụ phụ trợ:</span>
                  <span className="row-val">
                    {totalServicePrice > 0 ? `${totalServicePrice.toLocaleString("vi-VN")}đ` : "0đ"}
                  </span>
                </div>
                <div className="price-row">
                  <span className="row-label">Đèn chiếu sáng ban đêm:</span>
                  <span className="row-val text-green">Miễn phí</span>
                </div>
                {appliedVoucher && (
                  <div className="price-row price-row--discount">
                    <span className="row-label text-green" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>confirmation_number</span>
                      Giảm giá voucher ({appliedVoucher.code}):
                    </span>
                    <span className="row-val text-green font-bold">
                      -{discountAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                )}
              </div>

              {/* Ô nhập Voucher trên chỗ tổng thanh toán */}
              <div className="widget-voucher-block">
                <div className="voucher-block-header">
                  <div className="voucher-block-title">
                    <span className="material-symbols-outlined icon">confirmation_number</span>
                    <span>Mã ưu đãi / Voucher</span>
                  </div>
                  {myVouchers.length > 0 && !appliedVoucher && (
                    <button
                      type="button"
                      className="btn-open-wallet"
                      onClick={() => setShowVoucherModal(true)}
                    >
                      Ví voucher ({myVouchers.length})
                    </button>
                  )}
                </div>

                {!appliedVoucher ? (
                  <div className="voucher-input-group">
                    <input
                      type="text"
                      className="voucher-input"
                      placeholder="Nhập mã voucher (VD: FB-XXXXXX)"
                      value={voucherCode}
                      onChange={(e) => {
                        setVoucherCode(e.target.value.toUpperCase());
                        setVoucherError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyVoucher();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn-apply-voucher"
                      onClick={() => handleApplyVoucher()}
                      disabled={validatingVoucher || !voucherCode.trim()}
                    >
                      {validatingVoucher ? "..." : "Áp dụng"}
                    </button>
                  </div>
                ) : (
                  <div className="voucher-applied-card">
                    <div className="applied-left">
                      <span className="material-symbols-outlined check-icon">check_circle</span>
                      <div>
                        <div className="applied-code">Đã áp dụng: <strong>{appliedVoucher.code}</strong></div>
                        <div className="applied-saving">Tiết kiệm {discountAmount.toLocaleString("vi-VN")}đ</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-voucher"
                      onClick={handleRemoveVoucher}
                      title="Bỏ áp dụng mã"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                )}

                {voucherError && (
                  <div className="voucher-error-msg">
                    <span className="material-symbols-outlined">error</span>
                    <span>{voucherError}</span>
                  </div>
                )}
              </div>

              {/* Tổng thanh toán */}
              <div className="widget-total-block">
                <div className="total-label-wrap">
                  <div className="total-label">Tổng thanh toán:</div>
                  <div className="total-sub">Đã bao gồm VAT & tiện ích</div>
                </div>
                <div className="total-price">{totalPrice.toLocaleString("vi-VN")}đ</div>
              </div>

              {/* Nút hành động chính */}
              <button
                type="button"
                className="btn-proceed-booking"
                onClick={handleProceedBooking}
              >
                <span>TIẾP TỤC ĐẶT SÂN & THANH TOÁN</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>

              {/* Cam kết */}
              <div className="widget-guarantees">
                <div className="guarantee-item">
                  <span className="material-symbols-outlined check-icon">check_circle</span>
                  <span>Giữ sân ngay lập tức sau khi xác nhận</span>
                </div>
                <div className="guarantee-item">
                  <span className="material-symbols-outlined check-icon">check_circle</span>
                  <span>Miễn phí hủy trước 4 tiếng</span>
                </div>
              </div>

              {/* Hotline */}
              <div className="widget-hotline-footer">
                <span>Cần hỗ trợ đặt sân nhanh?</span>
                <a href={`tel:${field.phone || "0905123778"}`}>
                  <span className="material-symbols-outlined">call</span>
                  {field.phone || "0905.123.778"}
                </a>
              </div>
            </div>

            {/* 3. CARD: CHÍNH SÁCH HỦY SÂN */}
            <div className="fd-policy-card">
              <div className="policy-badge">BẢO LƯU 100% TIỀN CỌC</div>
              <div className="policy-title">Chính sách hủy sân:</div>
              <div className="policy-desc">
                Hoàn tiền hoặc dời lịch miễn phí nếu thời tiết mưa bão không thể diễn ra trận đấu.
              </div>
            </div>

            {/* 4. CARD: VỊ TRÍ & CHỈ ĐƯỜNG */}
            <div id="map-section" className="fd-map-widget-card">
              <div className="map-widget-header">
                <h4 className="map-widget-title">Vị trí & Chỉ đường</h4>
                <span className="material-symbols-outlined icon-map">map</span>
              </div>
              <div className="map-widget-body">
                <FieldMap
                  lat={field.latitude}
                  lng={field.longitude}
                  address={field.address}
                  location={field.location}
                  fieldName={field.field_name}
                  compact={true}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>

      {/* Modal ví voucher của tôi */}
      {showVoucherModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowVoucherModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 480,
              width: "100%",
              padding: "20px 24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: "#16a34a" }}>confirmation_number</span>
                Ví Voucher của bạn
              </h3>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem", display: "flex" }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 14px 0" }}>
              Chọn voucher còn hạn dùng để áp dụng trực tiếp cho đơn đặt sân này:
            </p>

            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
              {myVouchers.length > 0 ? (
                myVouchers.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      border: "1.5px dashed #86efac",
                      borderRadius: 10,
                      padding: "12px 14px",
                      background: "#f0fdf4",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, color: "#15803d", fontSize: "0.95rem", letterSpacing: "0.5px" }}>
                          {v.code}
                        </span>
                        <span style={{ fontSize: "0.7rem", padding: "2px 6px", background: "#dcfce7", color: "#166534", borderRadius: 4, fontWeight: 700 }}>
                          {v.discount_type === "percent" ? `-${v.discount_value}%` : `-${Number(v.discount_value).toLocaleString("vi-VN")}đ`}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>{v.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 2 }}>
                        Đơn tối thiểu: {Number(v.min_booking_price || 0).toLocaleString("vi-VN")}đ • HSD: {new Date(v.valid_until).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyVoucher(v.code)}
                      style={{
                        padding: "6px 14px",
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Dùng mã
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af", fontSize: "0.85rem" }}>
                  Bạn chưa có voucher nào khả dụng trong ví.
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                style={{
                  padding: "8px 18px",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: "0.82rem",
                  color: "#475569",
                  cursor: "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldDetail;
