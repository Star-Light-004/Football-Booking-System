import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserProfile } from "../../api/usersApi";
import { createBooking } from "../../api/bookingsApi";
import { getServices, createBookingService } from "../../api/servicesApi";
import { getFieldDetail, getFields } from "../../api/fieldsApi";
import timeslotsApi from "../../api/timeslotsApi";
import { validateVoucher, getMyVouchers } from "../../api/vouchersApi";
import PageHero from "../../components/PageHero/PageHero";
import "./Booking.css";

const getSlotDurationMinutes = (slot) => {
  const [startHour, startMinute] = String(slot.start_time).split(":").map(Number);
  const [endHour, endMinute] = String(slot.end_time).split(":").map(Number);
  return endHour * 60 + endMinute - (startHour * 60 + startMinute);
};

const formatDateDisplay = (dateValue) => {
  if (!dateValue) return "Chưa chọn";
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
};

const formatDateWithWeekday = (dateValue) => {
  if (!dateValue) return "Chưa chọn";
  const [year, month, day] = dateValue.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).toLocaleDateString("vi-VN", { weekday: "long" });
  return `${weekday}, ${formatDateDisplay(dateValue)}`;
};

const COUNTDOWN_SECONDS = 15 * 60; // 15 phút = 900 giây

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const rawLocationData = location.state;

  // ─── Booking Draft / Field State ──────────────────────────────────────────
  const [bookingInfo, setBookingInfo] = useState(() => {
    if (rawLocationData && (rawLocationData.fieldId || rawLocationData.fieldName)) {
      try {
        sessionStorage.setItem("booking_draft", JSON.stringify(rawLocationData));
      } catch (e) {}
      return rawLocationData;
    }
    try {
      const saved = sessionStorage.getItem("booking_draft");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [loadingField, setLoadingField] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [allFieldsList, setAllFieldsList] = useState([]);

  // Kiểm tra tài khoản thành viên hiện tại
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [voucherCode, setVoucherCode] = useState(
    () => rawLocationData?.voucherCode || rawLocationData?.appliedVoucher?.code || bookingInfo?.voucherCode || ""
  );
  const [appliedVoucher, setAppliedVoucher] = useState(
    () => rawLocationData?.appliedVoucher || bookingInfo?.appliedVoucher || null
  );
  const [voucherError, setVoucherError] = useState("");
  const [myVouchers, setMyVouchers] = useState([]);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [validatingVoucher, setValidatingVoucher] = useState(false);

  // Nhận diện voucher chuyển tiếp từ trang chi tiết sân
  useEffect(() => {
    const passedVoucher = bookingInfo?.appliedVoucher || rawLocationData?.appliedVoucher;
    const passedCode = bookingInfo?.voucherCode || passedVoucher?.code || rawLocationData?.voucherCode;

    if (passedVoucher) {
      setAppliedVoucher(passedVoucher);
      setVoucherCode(passedVoucher.code || passedCode || "");
    } else if (passedCode) {
      setVoucherCode(passedCode);
      if (!appliedVoucher) {
        const rawPrice = (bookingInfo?.price || 0) + selectedServicesList.reduce((acc, s) => acc + s.price * s.quantity, 0);
        validateVoucher({
          code: passedCode,
          customer_id: currentUser?.id || null,
          total_price: rawPrice > 0 ? rawPrice : 350000,
        })
          .then((res) => {
            if (res.data?.valid) {
              setAppliedVoucher(res.data);
            }
          })
          .catch(() => {});
      }
    }
  }, [bookingInfo, rawLocationData]);

  // Services state
  const [allServices, setAllServices] = useState([]);
  const [selectedServicesList, setSelectedServicesList] = useState([]);

  // Countdown state (page-level: 15 minutes)
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_SECONDS);
  const pageTimerRef = useRef(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalCountdown, setModalCountdown] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const modalTimerRef = useRef(null);

  // ─── Start page-level countdown ───────────────────────────────────────
  useEffect(() => {
    pageTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(pageTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(pageTimerRef.current);
  }, []);

  const formatCountdown = (secs) => {
    const m = String(Math.floor(secs / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${m} : ${s}`;
  };

  // ─── Tải dữ liệu Sân bóng (từ location.state, URL param hoặc API) ──────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryFieldId = params.get("field");
    const effectiveFieldId =
      rawLocationData?.fieldId || queryFieldId || bookingInfo?.fieldId;

    if (effectiveFieldId) {
      // Nếu chưa có tên sân hoặc thông tin bị thiếu
      if (
        !bookingInfo?.fieldName ||
        String(bookingInfo?.fieldId) !== String(effectiveFieldId)
      ) {
        setLoadingField(true);
        getFieldDetail(effectiveFieldId)
          .then((res) => {
            const f = res.data;
            if (f) {
              setBookingInfo((prev) => {
                const todayStr = new Date().toISOString().split("T")[0];
                const updated = {
                  ...prev,
                  fieldId: f.id,
                  fieldName: f.field_name,
                  fieldType: f.field_type,
                  fieldAddress: f.location,
                  fieldImage: f.image_url,
                  price: prev?.price || f.price_per_hour || 350000,
                  selectedDate: prev?.selectedDate || todayStr,
                  selectedTimeSlot: prev?.selectedTimeSlot || "",
                  selectedServices: prev?.selectedServices || {},
                  selectedShoeSizes: prev?.selectedShoeSizes || {},
                  totalServicePrice: prev?.totalServicePrice || 0,
                  totalPrice: prev?.totalPrice || (f.price_per_hour || 350000),
                  bookingCode:
                    prev?.bookingCode ||
                    `FB-${(prev?.selectedDate || todayStr).replace(/-/g, "")}-${String(f.id).padStart(2, "0")}`,
                };
                try {
                  sessionStorage.setItem("booking_draft", JSON.stringify(updated));
                } catch (e) {}
                return updated;
              });
            }
          })
          .catch((err) => console.error("Lỗi lấy thông tin sân:", err))
          .finally(() => setLoadingField(false));
      }
    } else {
      // Trường hợp không có fieldId: lấy danh sách các sân để chọn mặc định
      setLoadingField(true);
      getFields()
        .then((res) => {
          const list =
            res.data?.fields || (Array.isArray(res.data) ? res.data : []);
          setAllFieldsList(list);
          if (list.length > 0 && !bookingInfo?.fieldId) {
            const f = list[0];
            const todayStr = new Date().toISOString().split("T")[0];
            const defaultBooking = {
              fieldId: f.id,
              fieldName: f.field_name,
              fieldType: f.field_type,
              fieldAddress: f.location,
              fieldImage: f.image_url,
              price: f.price_per_hour || 350000,
              selectedDate: todayStr,
              selectedTimeSlot: "",
              selectedServices: {},
              selectedShoeSizes: {},
              totalServicePrice: 0,
              totalPrice: f.price_per_hour || 350000,
              bookingCode: `FB-${todayStr.replace(/-/g, "")}-${String(f.id).padStart(2, "0")}`,
            };
            setBookingInfo(defaultBooking);
            try {
              sessionStorage.setItem("booking_draft", JSON.stringify(defaultBooking));
            } catch (e) {}
          }
        })
        .catch((err) => console.error("Lỗi lấy danh sách sân:", err))
        .finally(() => setLoadingField(false));
    }
  }, [location.search, rawLocationData]);

  // ─── Tải Timeslots theo sân và ngày ──────────────────────────────────
  useEffect(() => {
    if (!bookingInfo?.fieldId) return;
    const date =
      bookingInfo.selectedDate || new Date().toISOString().split("T")[0];
    setLoadingSlots(true);
    timeslotsApi
      .getByField(bookingInfo.fieldId, date)
      .then((res) => {
        const slots = (res.data || [])
          .filter((slot) => getSlotDurationMinutes(slot) === 60)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
        setAvailableSlots(slots);
        // Nếu chưa chọn slot, tự động chọn slot còn trống đầu tiên
        if (!bookingInfo.selectedTimeSlot && slots.length > 0) {
          const firstAvail = slots.find((s) => s.status === "available");
          if (firstAvail) {
            const tr = `${firstAvail.start_time} - ${firstAvail.end_time}`;
            setBookingInfo((prev) => {
              const updated = {
                ...prev,
                selectedTimeSlot: tr,
                price: firstAvail.price || prev?.price || 350000,
              };
              try {
                sessionStorage.setItem("booking_draft", JSON.stringify(updated));
              } catch (e) {}
              return updated;
            });
          }
        }
      })
      .catch((err) => {
        console.error("Lỗi lấy khung giờ:", err);
        setAvailableSlots([]);
      })
      .finally(() => setLoadingSlots(false));
  }, [bookingInfo?.fieldId, bookingInfo?.selectedDate]);

  // ─── Đổi sân nếu người dùng chọn sân khác ───────────────────────────
  const handleFieldChange = (fieldId) => {
    setLoadingField(true);
    getFieldDetail(fieldId)
      .then((res) => {
        const f = res.data;
        if (f) {
          const todayStr =
            bookingInfo?.selectedDate || new Date().toISOString().split("T")[0];
          const updated = {
            ...bookingInfo,
            fieldId: f.id,
            fieldName: f.field_name,
            fieldType: f.field_type,
            fieldAddress: f.location,
            fieldImage: f.image_url,
            price: f.price_per_hour || 350000,
            selectedTimeSlot: "",
            bookingCode: `FB-${todayStr.replace(/-/g, "")}-${String(f.id).padStart(2, "0")}`,
          };
          setBookingInfo(updated);
          try {
            sessionStorage.setItem("booking_draft", JSON.stringify(updated));
          } catch (e) {}
        }
      })
      .catch((err) => console.error("Lỗi đổi sân:", err))
      .finally(() => setLoadingField(false));
  };

  // ─── Đổi ngày thi đấu ────────────────────────────────────────────────
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setBookingInfo((prev) => {
      const updated = {
        ...prev,
        selectedDate: newDate,
        selectedTimeSlot: "",
        bookingCode: `FB-${newDate.replace(/-/g, "")}-${String(prev?.fieldId || 1).padStart(2, "0")}`,
      };
      try {
        sessionStorage.setItem("booking_draft", JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // ─── Chọn khung giờ ──────────────────────────────────────────────────
  const handleSlotSelect = (slot) => {
    const tr = `${slot.start_time} - ${slot.end_time}`;
    setBookingInfo((prev) => {
      const updated = {
        ...prev,
        selectedTimeSlot: tr,
        price: slot.price || prev?.price || 350000,
      };
      try {
        sessionStorage.setItem("booking_draft", JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // ─── Load services ───────────────────────────────────────────────────
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await getServices();
        setAllServices(res.data || []);
      } catch (err) {
        console.error("Lỗi lấy dịch vụ:", err);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (allServices.length > 0 && bookingInfo?.selectedServices) {
      const selected = [];
      Object.keys(bookingInfo.selectedServices).forEach((id) => {
        const qty = bookingInfo.selectedServices[id];
        if (qty > 0) {
          const service = allServices.find(
            (s) => String(s.id) === String(id)
          );
          if (service) {
            selected.push({
              ...service,
              quantity: qty,
              shoeSize: bookingInfo.selectedShoeSizes?.[id] || "",
            });
          }
        }
      });
      setSelectedServicesList(selected);
    }
  }, [allServices, bookingInfo?.selectedServices, bookingInfo?.selectedShoeSizes]);

  // ─── Load user ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) return;
      try {
        const res = await getUserProfile(user.id);
        setCustomerName(res.data.fullname || "");
        setPhoneNumber(res.data.phone || "");
      } catch (err) {
        console.log("Lỗi lấy user:", err);
      }
    };
    fetchUser();
  }, []);

  // ─── Fetch My Vouchers ────────────────────────────────────────────────
  useEffect(() => {
    if (currentUser?.id) {
      getMyVouchers(currentUser.id, "active")
        .then((res) => {
          if (res.data?.vouchers) setMyVouchers(res.data.vouchers);
        })
        .catch((err) => console.log("Lỗi tải voucher của tôi:", err));
    }
  }, [currentUser?.id]);

  // ─── Voucher apply ────────────────────────────────────────────────────
  const handleApplyVoucher = async (codeToUse) => {
    const code = (typeof codeToUse === "string" ? codeToUse : voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      return;
    }
    setValidatingVoucher(true);
    setVoucherError("");
    try {
      const rawPrice = (bookingInfo?.price || 0) + selectedServicesList.reduce((acc, s) => acc + s.price * s.quantity, 0);
      const res = await validateVoucher({
        code,
        customer_id: currentUser?.id,
        total_price: rawPrice,
      });

      if (res.data?.valid) {
        setAppliedVoucher({
          code: res.data.code,
          title: res.data.title,
          discount: res.data.discount_amount,
        });
        setVoucherCode(res.data.code);
        setVoucherError("");
        setShowVoucherModal(false);
      }
    } catch (err) {
      setAppliedVoucher(null);
      setVoucherError(err.response?.data?.error || "Mã giảm giá không hợp lệ hoặc đã hết hạn");
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherError("");
  };

  // ─── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Vui lòng nhập họ và tên người đặt sân!");
      return;
    }
    if (!phoneNumber.trim()) {
      alert("Vui lòng nhập số điện thoại để nhận thông tin đặt sân!");
      return;
    }
    if (!bookingInfo?.fieldId) {
      alert("Vui lòng chọn sân bóng trước khi tiếp tục!");
      return;
    }
    if (!bookingInfo?.selectedTimeSlot) {
      alert("Vui lòng chọn khung giờ thi đấu trước khi tiếp tục!");
      return;
    }
    setShowModal(true);
  };

  // ─── Modal countdown ──────────────────────────────────────────────────
  useEffect(() => {
    if (!showModal) return;
    setModalCountdown(15);
    modalTimerRef.current = setInterval(() => {
      setModalCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(modalTimerRef.current);
          setShowModal(false);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(modalTimerRef.current);
  }, [showModal]);

  const handleCancel = () => {
    clearInterval(modalTimerRef.current);
    setShowModal(false);
    setModalCountdown(15);
  };

  // ─── Derived values ───────────────────────────────────────────────────
  const formattedDate = formatDateWithWeekday(bookingInfo?.selectedDate);

  const fieldPrice = bookingInfo?.price || 0;
  const servicePrice =
    bookingInfo?.totalServicePrice ||
    selectedServicesList.reduce((acc, s) => acc + s.price * s.quantity, 0);
  const discountAmount =
    appliedVoucher?.discount ||
    appliedVoucher?.discount_amount ||
    bookingInfo?.discountAmount ||
    rawLocationData?.discountAmount ||
    0;
  const totalPrice = Math.max(0, fieldPrice + servicePrice - discountAmount);
  const hasAppliedFromDetail = Boolean(
    bookingInfo?.fromDetailWithVoucher ||
    rawLocationData?.fromDetailWithVoucher ||
    appliedVoucher ||
    voucherCode ||
    bookingInfo?.voucherCode ||
    rawLocationData?.voucherCode
  );

  // Parse field type for display
  const rawType = String(bookingInfo?.fieldType || "").toLowerCase();
  let typeLabel = "SÂN 7 NGƯỜI (7 VS 7)";
  if (rawType.includes("5")) typeLabel = "SÂN 5 NGƯỜI (5 VS 5)";
  else if (rawType.includes("7")) typeLabel = "SÂN 7 NGƯỜI (7 VS 7)";
  else if (rawType.includes("11")) typeLabel = "SÂN 11 NGƯỜI (11 VS 11)";
  else if (bookingInfo?.fieldType) typeLabel = bookingInfo.fieldType.toUpperCase();

  // ─── Confirm booking ──────────────────────────────────────────────────
  const handleConfirm = async () => {
    clearInterval(modalTimerRef.current);
    if (!customerName.trim()) {
      alert("Vui lòng nhập họ và tên người đặt sân");
      setShowModal(false);
      return;
    }
    if (!phoneNumber.trim()) {
      alert("Vui lòng nhập số điện thoại để nhận thông tin đặt sân");
      setShowModal(false);
      return;
    }
    if (!bookingInfo?.fieldId) {
      alert("Vui lòng chọn sân bóng trước khi xác nhận đặt sân");
      setShowModal(false);
      return;
    }
    if (!bookingInfo?.selectedTimeSlot || !bookingInfo.selectedTimeSlot.includes("-")) {
      alert("Vui lòng chọn khung giờ thi đấu trước khi xác nhận đặt sân");
      setShowModal(false);
      return;
    }
    setSubmitting(true);

    const booking = {
      customer_id: currentUser?.id || null,
      guest_name: customerName.trim(),
      guest_phone: phoneNumber.trim(),
      guest_email: email.trim(),
      notes: [teamName ? `Đội bóng: ${teamName}` : "", note].filter(Boolean).join(" | "),
      field_id: bookingInfo.fieldId,
      booking_date: bookingInfo.selectedDate || new Date().toISOString().split("T")[0],
      start_time: bookingInfo.selectedTimeSlot.split("-")[0].trim(),
      end_time: bookingInfo.selectedTimeSlot.split("-")[1].trim(),
      total_price: totalPrice,
      voucher_code: appliedVoucher?.code || null,
      discount_amount: discountAmount,
    };

    try {
      const res = await createBooking(booking);
      const { booking_id, booking_id_short } = res.data;
      for (const item of selectedServicesList) {
        await createBookingService({
          booking_id,
          service_id: item.id,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          shoe_size: item.shoeSize || null,
        });
      }
      try {
        sessionStorage.removeItem("booking_draft");
      } catch (e) {}
      navigate("/booking/success", {
        state: {
          bookingCode: booking_id_short || bookingInfo.bookingCode,
          fullId: booking_id,
          bookingDetails: {
            fieldName: bookingInfo.fieldName,
            fieldType: typeLabel,
            fieldAddress: bookingInfo.fieldAddress,
            fieldImage: bookingInfo.fieldImage,
            bookingDate: booking.booking_date,
            timeSlot: bookingInfo.selectedTimeSlot,
            durationMinutes: getSlotDurationMinutes({
              start_time: booking.start_time,
              end_time: booking.end_time,
            }),
            includedAmenities: ["1 Quả bóng số 5", "2 Bộ áo bib phân đội", "Dàn đèn LED cao áp"],
            fieldPrice,
            services: selectedServicesList.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              shoeSize: item.shoeSize,
              totalPrice: item.price * item.quantity,
            })),
            discountCode: appliedVoucher?.code || "",
            discountAmount,
            totalPrice,
            paymentMethod: PAYMENT_OPTIONS.find((option) => option.value === paymentMethod)?.name || "Chưa chọn",
          },
        },
      });
    } catch (err) {
      console.log("Lỗi đặt sân:", err);
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Có lỗi xảy ra khi đặt sân. Vui lòng kiểm tra lại!"
      );
      setSubmitting(false);
      setShowModal(false);
    }
  };

  // Modal countdown ring
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = (modalCountdown / 15) * circumference;
  const isLow = modalCountdown <= 5;

  const PAYMENT_OPTIONS = [
    {
      value: "cash",
      name: "Thanh toán tại sân",
      desc: "Trả tiền mặt hoặc chuyển khoản tại quầy khi đến nhận sân thi đấu.",
      badge: { label: "ĐƯỢC CHỌN", cls: "recommended" },
      disabled: false,
    },
    {
      value: "qr",
      name: "Chuyển khoản QR Napas 24/7 (VietQR)",
      desc: "Quét mã QR Napas bằng bất kỳ ứng dụng ngân hàng nào, giữ sân ngay sau 3 giây.",
      badge: { label: "Tự động duyệt", cls: "partial" },
      badgeRight: { label: "Miễn phí giao dịch", cls: "free" },
      disabled: false,
    },
    {
      value: "ewallet",
      name: "Ví điện tử MoMo / ZaloPay",
      desc: "Thanh toán qua ví điện tử liên kết tiện lợi và nhận hoàn xu.",
      badgeRight: { label: "Sắp ra mắt", cls: "coming" },
      disabled: true,
    },
    {
      value: "deposit",
      name: "Đặt cọc 50% trước (200.000đ)",
      desc: "Lựa chọn tối ưu để chắc chắn giữ sân trong các khung giờ cao điểm ban đêm.",
      badgeRight: { label: "Còn lại thanh toán tại sân", cls: "partial" },
      disabled: false,
    },
  ];

  return (
    <div className="bk-page">
      <PageHero
        breadcrumb={[{ label: "Trang chủ", to: "/" }, { label: "Đặt sân" }]}
        eyebrow="GIỮ CHỖ TRỰC TUYẾN ƯU TIÊN"
        title="Xác nhận đặt sân"
        description="Kiểm tra lại thông tin lịch thi đấu, dịch vụ đi kèm và hoàn tất biểu mẫu đặt sân."
        action={(
          <div className="bk-countdown-badge">
            <span className="material-symbols-outlined bk-countdown-badge__icon">schedule</span>
            <div>
              <div className="bk-countdown-badge__label">Thời gian giữ chỗ còn lại:</div>
              <div className="bk-countdown-badge__time">{formatCountdown(timeLeft)}</div>
            </div>
          </div>
        )}
      />
      {/* ── STEPPER ── */}
      <div className="bk-stepper">
        <div className="bk-stepper__inner">
          {[
            { label: "1. Chọn sân & giờ", done: true, active: false },
            { label: "2. Thông tin & Thanh toán", done: false, active: true },
            { label: "3. Nhận mã QR sân", done: false, active: false },
          ].map((step, idx) => (
            <div
              key={idx}
              className={`bk-step${step.done ? " bk-step--done" : ""}${step.active ? " bk-step--active" : ""}`}
            >
              <div className="bk-step__circle">
                {step.done ? (
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    check
                  </span>
                ) : (
                  idx + 1
                )}
              </div>
              <span className="bk-step__label">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bk-inner">
        {/* ── TWO COLUMNS ── */}
        <form onSubmit={handleSubmit} className="bk-layout">
          {/* ═══ LEFT ═══ */}
          <div className="bk-left">
            {/* Card: Thông tin khách hàng */}
            <div className="bk-card">
              {!currentUser && (
                <div style={{
                  background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)",
                  border: "1px solid #6ee7b7",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  boxShadow: "0 2px 8px rgba(5,150,105,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="material-symbols-outlined" style={{ color: "#059669", fontSize: "1.6rem" }}>
                      bolt
                    </span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "#065f46" }}>
                        Đặt sân nhanh (Khách vãng lai)
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "0.775rem", color: "#047857" }}>
                        Không bắt buộc tạo tài khoản! Chỉ cần nhập Tên & Số điện thoại để nhận vé QR sân.
                      </p>
                    </div>
                  </div>
                  <a
                    href="/login"
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      color: "#059669",
                      textDecoration: "underline",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Đăng nhập tích điểm
                  </a>
                </div>
              )}

              <h3 className="bk-card-title">
                <span className="bk-card-icon">👤</span>
                Thông tin người đặt sân
                <span className="bk-card-sub">
                  {currentUser
                    ? "Đang sử dụng thông tin tài khoản thành viên của bạn"
                    : "Thông tin dùng để đối soát và kích hoạt quyền vào sân"}
                </span>
              </h3>

              <div className="bk-form-group bk-full">
                <label className="bk-label">Họ và tên *</label>
                <div className="bk-input-wrap">
                  <span className="material-symbols-outlined bk-input-icon">
                    person
                  </span>
                  <input
                    className="bk-input has-icon"
                    type="text"
                    placeholder="Nhập họ và tên..."
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              <div className="bk-form-row">
                <div className="bk-form-group">
                  <label className="bk-label">
                    Số điện thoại *
                    <span className={`bk-label-badge ${currentUser ? "" : "orange"}`}>
                      {currentUser ? "Thành viên" : "Dùng nhận vé & tra cứu"}
                    </span>
                  </label>
                  <div className="bk-input-wrap">
                    <span className="material-symbols-outlined bk-input-icon">
                      call
                    </span>
                    <input
                      className="bk-input has-icon"
                      type="tel"
                      placeholder="04858758475"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bk-form-group">
                  <label className="bk-label">
                    Email <span className="bk-label-badge orange">Tùy chọn</span>
                  </label>
                  <div className="bk-input-wrap">
                    <span className="material-symbols-outlined bk-input-icon">
                      mail
                    </span>
                    <input
                      className="bk-input has-icon"
                      type="email"
                      placeholder="example@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bk-form-group bk-full">
                <label className="bk-label">
                  Tên Câu lạc bộ / Đội bóng
                  <span className="bk-label-badge orange">Tùy chọn</span>
                </label>
                <div className="bk-input-wrap">
                  <span className="material-symbols-outlined bk-input-icon">
                    groups
                  </span>
                  <input
                    className="bk-input has-icon"
                    type="text"
                    placeholder="Ví dụ: FC Brotherhood, Tân Bình Club..."
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </div>
              </div>

              <div className="bk-form-group bk-full">
                <label className="bk-label">Ghi chú thêm</label>
                <textarea
                  className="bk-input bk-textarea"
                  placeholder="Yêu cầu thêm về dụng cụ hoặc nước uống... (ví dụ: mượn bóng số 5, 2 bộ áo bib tập luyện, 1 thùng nước suối ướp lạnh)"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            {/* Card: Phương thức thanh toán */}
            <div className="bk-card">
              <div className="bk-payment-header">
                <div>
                  <h3 className="bk-card-title" style={{ border: "none", padding: 0, margin: 0 }}>
                    <span className="bk-card-icon">💵</span>
                    Phương thức thanh toán
                  </h3>
                  <span className="bk-card-sub" style={{ marginTop: 2 }}>
                    Mã hóa bảo mật 256-bit theo chuẩn ngân hàng
                  </span>
                </div>
                <div className="bk-safe-badge">
                  <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>
                    lock
                  </span>
                  An toàn & Tiện lợi
                </div>
              </div>

              <div className="bk-payment-options" style={{ marginTop: 12 }}>
                {PAYMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`bk-payment-option${paymentMethod === opt.value ? " selected" : ""}${opt.disabled ? " bk-payment-disabled" : ""}`}
                  >
                    <div className="bk-radio-wrap">
                      <input
                        type="radio"
                        name="payment"
                        value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={() => !opt.disabled && setPaymentMethod(opt.value)}
                        disabled={opt.disabled}
                        className="bk-radio"
                      />
                    </div>
                    <div className="bk-payment-body">
                      <div className="bk-payment-info">
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="bk-payment-name">{opt.name}</span>
                          {opt.badge && (
                            <span className={`bk-payment-badge ${opt.badge.cls}`}>
                              {opt.badge.label}
                            </span>
                          )}
                        </div>
                        <span className="bk-payment-desc">{opt.desc}</span>
                      </div>
                      {opt.badgeRight && (
                        <span className={`bk-payment-badge ${opt.badgeRight.cls}`}>
                          {opt.badgeRight.label}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Policy note */}
              <div className="bk-policy-note">
                <span className="material-symbols-outlined">info</span>
                <span>
                  <strong>Chính sách hủy sân:</strong> Miễn phí hủy trước 4 tiếng so với giờ bắt đầu. Trong trường hợp thời tiết mưa bão không thể diễn ra trận đấu, quý khách được dời lịch hoặc hoàn lại 100% chi phí.
                </span>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT: Chi tiết đặt sân ═══ */}
          <div className="bk-right">
            <div className="bk-summary-card">
              {/* Header */}
              <div className="bk-summary-header">
                <div className="bk-summary-header-left">
                  <h3>Chi tiết đặt sân</h3>
                  <div className="bk-summary-code">
                    Mã tham chiếu: #{bookingInfo?.bookingCode || "FB-20261012-88"}
                  </div>
                </div>
                <span className="bk-summary-header-badge">ĐANG GIỮ CA</span>
              </div>

              {/* Loading indicator */}
              {loadingField && (
                <div style={{ padding: "16px 20px", color: "#16a34a", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ animation: "spin 1s infinite linear" }}>
                    sync
                  </span>
                  Đang tải thông tin sân bóng...
                </div>
              )}

              {/* Field Switcher nếu vào trực tiếp chưa có sân hoặc muốn đổi sân */}
              {allFieldsList.length > 0 && !bookingInfo?.fieldId && (
                <div style={{ padding: "12px 18px", borderBottom: "1px solid #f3f4f6" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                    Chọn sân bóng:
                  </label>
                  <select
                    className="bk-input"
                    value={bookingInfo?.fieldId || ""}
                    onChange={(e) => handleFieldChange(e.target.value)}
                  >
                    <option value="" disabled>-- Vui lòng chọn sân --</option>
                    {allFieldsList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.field_name} ({f.field_type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field info */}
              <div className="bk-summary-field">
                <div className="bk-summary-field__icon">
                  {bookingInfo?.fieldImage ? (
                    <img
                      src={bookingInfo.fieldImage}
                      alt={bookingInfo.fieldName}
                      className="bk-summary-field__thumb"
                    />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: "1.4rem" }}>
                      stadium
                    </span>
                  )}
                </div>
                <div className="bk-summary-field__info">
                  <div className="bk-summary-field__type">{typeLabel}</div>
                  <div className="bk-summary-field__name">
                    {bookingInfo?.fieldName || "Đang tải thông tin sân..."}
                  </div>
                  <div className="bk-summary-field__addr">
                    <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>
                      location_on
                    </span>
                    {bookingInfo?.fieldAddress || "Khu đô thị thể thao, TP. Đà Nẵng"}
                  </div>
                </div>
              </div>

              {/* Time block */}
              <div className="bk-summary-time">
                <div className="bk-summary-time-item">
                  <div className="bk-summary-time-item__label">Ngày thi đấu:</div>
                  <div className="bk-summary-time-item__value">
                    {formattedDate}
                  </div>
                  <div className="bk-summary-time-item__sub">
                    Thời lượng: 60 phút thi đấu
                  </div>
                  {/* Cho phép chọn đổi ngày */}
                  <div className="bk-date-change-wrap">
                    <input
                      type="date"
                      className="bk-date-input"
                      lang="vi"
                      value={bookingInfo?.selectedDate || new Date().toISOString().split("T")[0]}
                      onChange={handleDateChange}
                      min={new Date().toISOString().split("T")[0]}
                      title="Bấm để đổi ngày thi đấu"
                    />
                  </div>
                </div>

                <div className="bk-summary-time-item">
                  <div className="bk-summary-time-item__label">Khung giờ:</div>
                  <div className="bk-summary-time-item__value" style={{ color: "#16a34a" }}>
                    {bookingInfo?.selectedTimeSlot || (loadingSlots ? "Đang tải giờ..." : "Chưa chọn giờ")}
                  </div>
                  <div className="bk-summary-time-item__sub">
                    Mặt cỏ nhân tạo: FIFA Pro tiêu chuẩn
                  </div>
                </div>
              </div>

              {/* Slot selector chips (nếu người dùng muốn chọn hoặc đổi khung giờ) */}
              <div className="bk-summary-slots-box">
                <div className="bk-summary-slots-title">
                  <span>Khung giờ khả dụng ngày {formatDateDisplay(bookingInfo?.selectedDate)}:</span>
                  {loadingSlots && <span style={{ fontSize: "0.7rem", color: "#16a34a" }}>Đang làm mới...</span>}
                </div>
                {availableSlots.length > 0 ? (
                  <div className="bk-slots-chips">
                    {availableSlots.map((slot) => {
                      const isBooked = slot.status !== "available";
                      const timeRange = `${slot.start_time} - ${slot.end_time}`;
                      const isSelected = bookingInfo?.selectedTimeSlot === timeRange;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isBooked}
                          className={`bk-slot-chip ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""}`}
                          onClick={() => handleSlotSelect(slot)}
                          title={isBooked ? "Đã có người đặt" : `${slot.price?.toLocaleString()}đ`}
                        >
                          {timeRange}
                          {isBooked && <span className="bk-slot-chip__status">Đã đặt</span>}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bk-slots-empty">
                    {loadingSlots ? "Đang tải khung giờ..." : "Ngày này chưa có khung giờ 60 phút."}
                  </div>
                )}
              </div>

              {/* Free services */}
              <div className="bk-summary-freebies">
                <div className="bk-summary-freebies__title">
                  Tiện ích đi kèm miễn phí:
                </div>
                <div className="bk-freebie-list">
                  <div className="bk-freebie">
                    <span className="material-symbols-outlined">check_circle</span>
                    1 Quả bóng số 5
                  </div>
                  <div className="bk-freebie">
                    <span className="material-symbols-outlined">check_circle</span>
                    2 Bộ áo bib phân đội
                  </div>
                  <div className="bk-freebie">
                    <span className="material-symbols-outlined">check_circle</span>
                    Dàn đèn LED cao áp
                  </div>
                </div>
              </div>

              {/* Voucher */}
              <div className="bk-summary-voucher">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#9ca3af" }}>
                    MÃ GIẢM GIÁ / VOUCHER
                  </span>
                  {!hasAppliedFromDetail && currentUser && myVouchers.length > 0 && !appliedVoucher && (
                    <button
                      type="button"
                      onClick={() => setShowVoucherModal(true)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#16a34a",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "0.95rem" }}>confirmation_number</span>
                      Ví voucher ({myVouchers.length})
                    </button>
                  )}
                </div>

                {/* Nếu chuyển tiếp từ trang chi tiết sân (hoặc đã có mã voucher): chỉ hiển thị lại voucher đã nhập */}
                {hasAppliedFromDetail ? (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1.5px solid #86efac",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: "#16a34a", fontSize: "1.35rem" }}>
                        verified
                      </span>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 800, color: "#15803d", fontSize: "0.95rem", letterSpacing: "0.5px" }}>
                            {appliedVoucher?.code || voucherCode || bookingInfo?.voucherCode || rawLocationData?.voucherCode}
                          </span>
                          <span style={{ fontSize: "0.68rem", padding: "2px 6px", background: "#dcfce7", color: "#166534", borderRadius: 4, fontWeight: 700 }}>
                            ĐÃ ÁP DỤNG
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#166534", marginTop: 2, fontWeight: 600 }}>
                          {discountAmount > 0
                            ? `Giảm ${discountAmount.toLocaleString("vi-VN")}đ vào tổng thanh toán`
                            : "Voucher ưu đãi từ chi tiết sân"}
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined" style={{ color: "#86efac", fontSize: "1.1rem" }} title="Voucher đã nhập từ trang chi tiết sân">
                      lock
                    </span>
                  </div>
                ) : (
                  /* Trường hợp đặt trực tiếp không qua chi tiết: cho phép nhập mã */
                  <div>
                    <div className="bk-voucher-input-wrap">
                      <input
                        className="bk-voucher-input"
                        type="text"
                        placeholder="Nhập mã voucher (VD: FB-XXXX)"
                        value={voucherCode}
                        onChange={(e) => {
                          setVoucherCode(e.target.value.toUpperCase());
                          setVoucherError("");
                        }}
                        disabled={appliedVoucher !== null}
                      />
                      {appliedVoucher ? (
                        <button
                          type="button"
                          onClick={handleRemoveVoucher}
                          style={{
                            padding: "8px 12px",
                            background: "#fee2e2",
                            color: "#ef4444",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Hủy mã
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="bk-voucher-btn"
                          onClick={() => handleApplyVoucher()}
                          disabled={validatingVoucher}
                        >
                          {validatingVoucher ? "..." : "Áp dụng"}
                        </button>
                      )}
                    </div>

                    {voucherError && (
                      <div style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>error</span>
                        {voucherError}
                      </div>
                    )}

                    {appliedVoucher && (
                      <div style={{ fontSize: "0.78rem", color: "#16a34a", marginTop: 8, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, background: "#f0fdf4", padding: "6px 10px", borderRadius: 6, border: "1px solid #bbf7d0" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>check_circle</span>
                        <div>
                          <div>Đã áp dụng mã <strong>{appliedVoucher.code}</strong></div>
                          <small style={{ fontWeight: 500, color: "#15803d" }}>Giảm {discountAmount.toLocaleString("vi-VN")}đ</small>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Price breakdown */}
              <div className="bk-summary-breakdown">
                <div className="bk-price-row">
                  <span className="bk-price-row__label">
                    Giá thuê sân (1 ca / 60p):
                  </span>
                  <span className="bk-price-row__value">
                    {fieldPrice.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="bk-price-row">
                  <span className="bk-price-row__label">
                    Phí đèn chiếu sáng ban đêm:
                  </span>
                  <span className="bk-price-row__value free-value">Miễn phí</span>
                </div>

                {selectedServicesList.length > 0 &&
                  selectedServicesList.map((item) => (
                    <div key={item.id} className="bk-price-row">
                      <span className="bk-price-row__label">
                        {item.name}
                        {item.shoeSize ? ` (size ${item.shoeSize})` : ""} ×{item.quantity}
                      </span>
                      <span className="bk-price-row__value">
                        {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  ))}

                {(appliedVoucher || discountAmount > 0) && (
                  <div className="bk-price-row">
                    <span className="bk-price-row__label">
                      Mã giảm giá ({appliedVoucher?.code || voucherCode || bookingInfo?.voucherCode || rawLocationData?.voucherCode}):
                    </span>
                    <span className="bk-price-row__value discount-value">
                      -{discountAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bk-summary-total">
                <div className="bk-total-row">
                  <span className="bk-total-label">Tổng tiền thanh toán:</span>
                  <span className="bk-total-price">
                    {totalPrice.toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="bk-total-sub">
                  Đã bao gồm VAT & tiện ích
                </div>
              </div>

              {/* Submit Button */}
              <div className="bk-submit-wrap">
                <button type="submit" className="bk-submit-btn">
                  <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>
                    check
                  </span>
                  XÁC NHẬN ĐẶT SÂN
                </button>
              </div>

              <p className="bk-terms">
                Bằng cách nhấn nút này, bạn đồng ý với{" "}
                <a href="#" className="bk-terms-link">
                  Điều khoản & Chính sách
                </a>{" "}
                của chúng tôi.
              </p>
            </div>

            {/* Info note */}
            <div className="bk-info-note">
              <span className="material-symbols-outlined">schedule</span>
              <p>
                <strong>Thông báo giữ chỗ:</strong> Chúng tôi sẽ gửi tin nhắn xác nhận đến số điện thoại và email của bạn ngay sau khi bạn đặt sân thành công kèm theo mã QR nhận sân.
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* ═══ VOUCHER PICKER MODAL ═══ */}
      {showVoucherModal && (
        <div className="cd-overlay" onClick={() => setShowVoucherModal(false)}>
          <div
            className="cd-modal"
            style={{ maxWidth: 460, textAlign: "left" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined" style={{ color: "#16a34a", fontSize: "1.5rem" }}>confirmation_number</span>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>Ví Voucher của bạn</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0 0 12px 0" }}>
              Chọn voucher còn hiệu lực để áp dụng giảm giá trực tiếp cho đơn đặt sân này:
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
                      gap: 12
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
                        whiteSpace: "nowrap"
                      }}
                    >
                      Dùng mã
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: "0.85rem" }}>
                  Bạn chưa có voucher nào khả dụng trong ví.
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                type="button"
                className="cd-btn cd-btn--cancel"
                onClick={() => setShowVoucherModal(false)}
                style={{ width: "auto", padding: "6px 16px" }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ COUNTDOWN MODAL ═══ */}
      {showModal && (
        <div className="cd-overlay" onClick={handleCancel}>
          <div
            className={`cd-modal${isLow ? " cd-modal--urgent" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cd-header">
              <span className="cd-header-icon">⚽</span>
              <h2 className="cd-title">Xác nhận đặt sân</h2>
              <p className="cd-subtitle">Vui lòng xác nhận trong thời gian quy định</p>
            </div>

            <div className="cd-info-box">
              <div className="cd-info-row">
                <span className="cd-info-label">🏟️ Sân</span>
                <span className="cd-info-value">{bookingInfo?.fieldName || "—"}</span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">📅 Ngày</span>
                <span className="cd-info-value">{formattedDate}</span>
              </div>
              <div className="cd-info-row">
                <span className="cd-info-label">🕐 Giờ</span>
                <span className="cd-info-value">{bookingInfo?.selectedTimeSlot || "—"}</span>
              </div>
              <div className="cd-info-row cd-info-row--total">
                <span className="cd-info-label">💰 Tổng</span>
                <span className="cd-info-value cd-info-price">
                  {totalPrice.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <div className="cd-timer-wrap">
              <svg className="cd-ring" viewBox="0 0 88 88">
                <circle cx="44" cy="44" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="7" />
                <circle
                  cx="44"
                  cy="44"
                  r={radius}
                  fill="none"
                  stroke={isLow ? "#ef4444" : "#16a34a"}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  style={{ transition: "stroke-dashoffset 0.9s linear, stroke 0.3s" }}
                  transform="rotate(-90 44 44)"
                />
              </svg>
              <div className={`cd-timer-num${isLow ? " cd-timer-num--low" : ""}`}>
                {modalCountdown}
              </div>
              <p className="cd-timer-label">giây còn lại</p>
            </div>

            {isLow && <p className="cd-warning">⚠️ Sắp hết thời gian! Nhấn xác nhận ngay.</p>}

            <div className="cd-actions">
              <button className="cd-btn cd-btn--cancel" onClick={handleCancel} disabled={submitting}>
                ✕ Hủy bỏ
              </button>
              <button className="cd-btn cd-btn--confirm" onClick={handleConfirm} disabled={submitting}>
                {submitting ? <span className="cd-spinner" /> : "✔ Xác nhận"}
              </button>
            </div>

            <p className="cd-note">
              Nếu không xác nhận trong 15s, yêu cầu sẽ tự động hủy
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
