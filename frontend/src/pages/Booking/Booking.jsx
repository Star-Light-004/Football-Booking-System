import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getUserProfile } from "../../api/usersApi";
import { createBooking, updateBooking, getCustomerBookingLimits } from "../../api/bookingsApi";
import { getServices, createBookingService } from "../../api/servicesApi";
import { getFieldDetail, getFields } from "../../api/fieldsApi";
import timeslotsApi from "../../api/timeslotsApi";
import { validateVoucher, getMyVouchers } from "../../api/vouchersApi";
import { createQrPayment, checkPaymentStatus, simulatePaymentTest } from "../../api/paymentsApi";
import PageHero from "../../components/PageHero/PageHero";
import { useToast, ToastContainer } from "../../components/Toast/Toast";
import ConfirmModal from "../../components/ConfirmModal/ConfirmModal";
import { broadcastSyncEvent, onSyncEvent } from "../../utils/realtimeSync";
import { isSlotExpired, getLocalDateString } from "../../utils/timeslotUtils";
import { getFullImageUrl } from "../../config";
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
  const { toasts, removeToast, toast } = useToast();

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

  // Khởi tạo danh sách khung giờ đã chọn (tối đa 3 khung giờ)
  const [selectedSlots, setSelectedSlots] = useState(() => {
    if (rawLocationData?.slots && Array.isArray(rawLocationData.slots) && rawLocationData.slots.length > 0) {
      return rawLocationData.slots;
    }
    if (bookingInfo?.slots && Array.isArray(bookingInfo.slots) && bookingInfo.slots.length > 0) {
      return bookingInfo.slots;
    }
    const initTime = rawLocationData?.selectedTimeSlot || bookingInfo?.selectedTimeSlot;
    if (initTime) {
      const parts = String(initTime).split(", ");
      return parts.map((p) => {
        const [st, et] = p.split("-").map((x) => x.trim());
        return { start_time: st, end_time: et, price: rawLocationData?.price || bookingInfo?.price || 350000 };
      });
    }
    return [];
  });

  const [customerLimits, setCustomerLimits] = useState({
    same_field_booked_count: 0,
    same_field_slots: [],
    other_field_slots: [],
    max_slots_per_day: 3,
  });

  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Xác nhận",
    cancelText: "Hủy bỏ",
    type: "danger",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Kiểm tra tài khoản thành viên hiện tại
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  // Form states - tự động lấy thông tin người dùng đã đăng nhập nếu có
  const [customerName, setCustomerName] = useState(() => currentUser?.fullname || currentUser?.username || "");
  const [phoneNumber, setPhoneNumber] = useState(() => currentUser?.phone || "");
  const [email, setEmail] = useState(() => currentUser?.email || "");
  const [teamName, setTeamName] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("qr");

  // ─── QR Payment States (VietQR / SePay) ──────────────────────────────
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [qrCountdown, setQrCountdown] = useState(600);
  const [qrPaymentSuccess, setQrPaymentSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState("");
  const [simulating, setSimulating] = useState(false);
  const qrPollRef = useRef(null);
  const qrTimerRef = useRef(null);
  const pendingSuccessStateRef = useRef(null);
  const showQrModalRef = useRef(false);
  const createdBookingSlotsRef = useRef([]);
  const isSubmittingBookingRef = useRef(false);

  useEffect(() => {
    showQrModalRef.current = showQrModal;
  }, [showQrModal]);

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

    const activeBookingId = qrData?.booking_id;
    if (activeBookingId && !qrPaymentSuccess) {
      setConfirmConfig({
        isOpen: true,
        title: "Đơn đặt sân đang chờ thanh toán",
        message:
          "Đơn đặt sân của bạn đang ở trạng thái Chờ thanh toán.\n\n" +
          "• [Hủy đơn]: Hủy đơn đặt sân này và giải phóng khung giờ trống cho người khác.\n" +
          "• [Giữ đơn & Xem vé]: Giữ nguyên đơn đặt sân và chuyển đến trang thông tin vé.",
        confirmText: "Hủy đơn & Trả giờ",
        cancelText: "Giữ đơn (Xem vé)",
        type: "danger",
        onConfirm: async () => {
          try {
            await updateBooking(activeBookingId, { status: "Cancelled" });
            broadcastSyncEvent("booking_cancelled", { bookingId: activeBookingId });
            toast.info("Đã hủy đơn đặt sân và giải phóng khung giờ.");
            fetchSlots(false);
          } catch (err) {
            console.error("Lỗi khi hủy đơn:", err);
          }
          createdBookingSlotsRef.current = [];
          isSubmittingBookingRef.current = false;
          setShowQrModal(false);
          setQrData(null);
        },
        onCancel: () => {
          setShowQrModal(false);
          broadcastSyncEvent("booking_created", { bookingId: activeBookingId });
          navigate("/booking/success", { state: pendingSuccessStateRef.current });
        },
      });
      return;
    }

    setShowQrModal(false);
  };

  const handleSimulatePayment = async () => {
    if (!qrData?.booking_id || simulating) return;
    setSimulating(true);
    try {
      await simulatePaymentTest(qrData.booking_id);
    } catch (err) {
      console.error("Lỗi giả lập thanh toán:", err);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
      if (qrTimerRef.current) clearInterval(qrTimerRef.current);
    };
  }, []);

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
        const fieldPrice = bookingInfo?.price || 0;
        const servicePrice = selectedServicesList.reduce((acc, s) => acc + s.price * s.quantity, 0);
        const rawPrice = fieldPrice + servicePrice;
        validateVoucher({
          code: passedCode,
          customer_id: currentUser?.id || null,
          total_price: rawPrice > 0 ? rawPrice : 350000,
          field_price: fieldPrice > 0 ? fieldPrice : 350000,
          service_price: servicePrice,
        })
          .then((res) => {
            if (res.data?.valid) {
              setAppliedVoucher(res.data);
            }
          })
          .catch(() => {});
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

  // ─── Tải giới hạn đặt sân của khách hàng ────────────────────────────
  useEffect(() => {
    const fieldId = bookingInfo?.fieldId;
    const date = bookingInfo?.selectedDate || new Date().toISOString().split("T")[0];
    if (fieldId && date) {
      getCustomerBookingLimits({
        fieldId,
        date,
        customerId: currentUser?.id || null,
        phone: phoneNumber || currentUser?.phone || null,
      })
        .then((res) => {
          if (res.data) setCustomerLimits(res.data);
        })
        .catch(() => {});
    }
  }, [bookingInfo?.fieldId, bookingInfo?.selectedDate, currentUser?.id, phoneNumber]);

  // ─── Ref đồng bộ selectedSlots cho polling và event ──────────────
  const selectedSlotsRef = useRef(selectedSlots);
  useEffect(() => {
    selectedSlotsRef.current = selectedSlots;
  }, [selectedSlots]);

  // ─── Tải Timeslots theo sân và ngày (hỗ trợ silent refresh cho realtime) ──
  const fetchSlots = useCallback(async (isSilent = false) => {
    if (!bookingInfo?.fieldId) return;
    const date = bookingInfo.selectedDate || new Date().toISOString().split("T")[0];
    if (!isSilent) setLoadingSlots(true);
    try {
      const res = await timeslotsApi.getByField(bookingInfo.fieldId, date);
      const slots = (res.data || [])
        .filter((slot) => getSlotDurationMinutes(slot) === 60)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      setAvailableSlots(slots);

      // Kiểm tra nếu slot người dùng đang chọn bị người khác đặt hoặc khóa trong thời gian thực
      // Nếu đang mở cổng thanh toán QR hoặc đang gửi đơn đặt, không kiểm tra xung đột
      if (showQrModalRef.current || isSubmittingBookingRef.current) {
        return;
      }

      const currentSelected = selectedSlotsRef.current || [];
      if (currentSelected.length > 0 && slots.length > 0) {
        // Loại trừ các slot thuộc đơn vừa được tạo của chính khách hàng này
        const createdSlots = createdBookingSlotsRef.current || [];
        const slotsToCheck = currentSelected.filter(
          (sel) => !createdSlots.some((cs) => cs.start_time === sel.start_time && cs.end_time === sel.end_time)
        );

        if (slotsToCheck.length === 0) {
          return;
        }

        const invalidSlots = slotsToCheck.filter((sel) => {
          const match = slots.find((s) => s.start_time === sel.start_time && s.end_time === sel.end_time);
          return match && match.status !== "available";
        });

        if (invalidSlots.length > 0) {
          const invalidLabels = invalidSlots.map((s) => `${s.start_time} - ${s.end_time}`).join(", ");
          toast.warning(`Khung giờ (${invalidLabels}) vừa có người khác đặt hoặc bị khóa! Đã tự động cập nhật.`);
          const remainingSlots = currentSelected.filter(
            (sel) => !invalidSlots.some((inv) => inv.start_time === sel.start_time && inv.end_time === sel.end_time)
          );
          setSelectedSlots(remainingSlots);
          setBookingInfo((prev) => {
            const timeSlotStr = remainingSlots.map((s) => `${s.start_time} - ${s.end_time}`).join(", ");
            const updated = {
              ...prev,
              slots: remainingSlots,
              selectedTimeSlots: remainingSlots.map((s) => `${s.start_time} - ${s.end_time}`),
              selectedTimeSlot: timeSlotStr,
            };
            try {
              sessionStorage.setItem("booking_draft", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      }

      // Nếu chưa có khung giờ nào được chọn, tự động chọn slot đầu tiên khả dụng (lần tải đầu)
      if (!isSilent && (!selectedSlotsRef.current || selectedSlotsRef.current.length === 0) && slots.length > 0) {
        const firstAvail = slots.find((s) => s.status === "available" && !isSlotExpired(date, s.start_time));
        if (firstAvail) {
          const tr = `${firstAvail.start_time} - ${firstAvail.end_time}`;
          const initSlotObj = {
            start_time: firstAvail.start_time,
            end_time: firstAvail.end_time,
            price: Number(firstAvail.price) || bookingInfo?.price || 350000,
          };
          setSelectedSlots([initSlotObj]);
          setBookingInfo((prev) => {
            const updated = {
              ...prev,
              slots: [initSlotObj],
              selectedTimeSlots: [tr],
              selectedTimeSlot: tr,
              price: initSlotObj.price,
            };
            try {
              sessionStorage.setItem("booking_draft", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }
      }
    } catch (err) {
      if (!isSilent) {
        console.error("Lỗi lấy khung giờ:", err);
        setAvailableSlots([]);
      }
    } finally {
      if (!isSilent) setLoadingSlots(false);
    }
  }, [bookingInfo?.fieldId, bookingInfo?.selectedDate, toast]);

  // Lần đầu hoặc khi đổi sân/ngày
  useEffect(() => {
    fetchSlots(false);
  }, [fetchSlots]);

  // Lắng nghe Realtime Cross-tab Sync & Smart Polling (3.5s)
  useEffect(() => {
    const unsub = onSyncEvent((event) => {
      if (event?.type?.startsWith("booking_") || event?.type?.startsWith("timeslot_")) {
        fetchSlots(true);
      }
    });

    const pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSlots(true);
      }
    }, 3500);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchSlots(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsub();
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchSlots]);

  // ─── Đổi sân nếu người dùng chọn sân khác ───────────────────────────
  const handleFieldChange = (fieldId) => {
    setLoadingField(true);
    getFieldDetail(fieldId)
      .then((res) => {
        const f = res.data;
        if (f) {
          const todayStr =
            bookingInfo?.selectedDate || new Date().toISOString().split("T")[0];
          setSelectedSlots([]);
          const updated = {
            ...bookingInfo,
            fieldId: f.id,
            fieldName: f.field_name,
            fieldType: f.field_type,
            fieldAddress: f.location,
            fieldImage: f.image_url,
            price: f.price_per_hour || 350000,
            selectedTimeSlot: "",
            slots: [],
            selectedTimeSlots: [],
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
    setSelectedSlots([]);
    setBookingInfo((prev) => {
      const updated = {
        ...prev,
        selectedDate: newDate,
        selectedTimeSlot: "",
        slots: [],
        selectedTimeSlots: [],
        bookingCode: `FB-${newDate.replace(/-/g, "")}-${String(prev?.fieldId || 1).padStart(2, "0")}`,
      };
      try {
        sessionStorage.setItem("booking_draft", JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  };

  // ─── Chọn khung giờ (Tối đa 3 khung giờ / ngày / sân & Chặn trùng sân khác) ──
  const handleSlotSelect = (slot) => {
    if (slot.status !== "available" || isSlotExpired(bookingInfo?.selectedDate, slot.start_time)) return;
    const tr = `${slot.start_time} - ${slot.end_time}`;

    // 🔹 Kiểm tra quy tắc 2: Đã đặt khung giờ nào ở sân khác thì không được đặt ở sân này
    const otherConflict = customerLimits.other_field_slots?.find(
      (o) => o.start_time === slot.start_time || o.time === tr
    );
    if (otherConflict) {
      toast.warning(`Bạn đã đặt khung giờ ${tr} tại ${otherConflict.field_name} trong ngày này. Bạn không thể đặt tiếp khung giờ đó ở sân khác.`);
      return;
    }

    const existingIndex = selectedSlots.findIndex(
      (s) => (s.id && s.id === slot.id) || `${s.start_time} - ${s.end_time}` === tr
    );

    let nextSlots = [];
    if (existingIndex !== -1) {
      if (selectedSlots.length === 1) {
        toast.warning("Đơn đặt phải có ít nhất một khung giờ!");
        return;
      }
      nextSlots = selectedSlots.filter((_, idx) => idx !== existingIndex);
    } else {
      // 🔹 Kiểm tra quy tắc 1: Chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân
      const bookedAtThisField = customerLimits.same_field_booked_count || 0;
      if (selectedSlots.length + bookedAtThisField >= 3) {
        toast.warning(
          bookedAtThisField > 0
            ? `Bạn chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân (đã đặt ${bookedAtThisField} khung giờ trước đó).`
            : "Chỉ được đặt tối đa 3 khung giờ khác nhau của 1 ngày của 1 sân!"
        );
        return;
      }
      nextSlots = [...selectedSlots, slot].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }

    setSelectedSlots(nextSlots);
    const combinedStr = nextSlots.map((s) => `${s.start_time} - ${s.end_time}`).join(", ");
    const nextPrice = nextSlots.reduce(
      (sum, s) => sum + (Number(s.price) || (bookingInfo?.price || 350000)),
      0
    );

    setBookingInfo((prev) => {
      const updated = {
        ...prev,
        slots: nextSlots,
        selectedTimeSlots: nextSlots.map((s) => `${s.start_time} - ${s.end_time}`),
        selectedTimeSlot: combinedStr,
        price: nextPrice,
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
        const list = Array.isArray(res?.data) ? res.data : (res?.data?.services || []);
        setAllServices(list);
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
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user) return;
      if (user.fullname) setCustomerName((prev) => prev || user.fullname);
      if (user.phone) setPhoneNumber((prev) => prev || user.phone);
      if (user.email) setEmail((prev) => prev || user.email);
      try {
        const res = await getUserProfile(user.id);
        if (res.data) {
          if (res.data.fullname) setCustomerName(res.data.fullname);
          if (res.data.phone) setPhoneNumber(res.data.phone);
          if (res.data.email) setEmail(res.data.email);
        }
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
      const fieldPrice = bookingInfo?.price || 0;
      const servicePrice = selectedServicesList.reduce((acc, s) => acc + s.price * s.quantity, 0);
      const rawPrice = fieldPrice + servicePrice;
      const res = await validateVoucher({
        code,
        customer_id: currentUser?.id,
        total_price: rawPrice,
        field_price: fieldPrice,
        service_price: servicePrice,
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
      toast.warning("Vui lòng nhập họ và tên người đặt sân!");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.warning("Vui lòng nhập số điện thoại để nhận thông tin đặt sân!");
      return;
    }
    if (!bookingInfo?.fieldId) {
      toast.warning("Vui lòng chọn sân bóng trước khi tiếp tục!");
      return;
    }
    if (!bookingInfo?.selectedTimeSlot) {
      toast.warning("Vui lòng chọn khung giờ thi đấu trước khi tiếp tục!");
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
      toast.warning("Vui lòng nhập họ và tên người đặt sân");
      setShowModal(false);
      return;
    }
    if (!phoneNumber.trim()) {
      toast.warning("Vui lòng nhập số điện thoại để nhận thông tin đặt sân");
      setShowModal(false);
      return;
    }
    if (!bookingInfo?.fieldId) {
      toast.warning("Vui lòng chọn sân bóng trước khi xác nhận đặt sân");
      setShowModal(false);
      return;
    }
    const effectiveSlots = selectedSlots.length > 0 ? selectedSlots : (
      bookingInfo?.selectedTimeSlot ? [{
        start_time: bookingInfo.selectedTimeSlot.split("-")[0].trim(),
        end_time: bookingInfo.selectedTimeSlot.split("-")[1].trim(),
        price: fieldPrice
      }] : []
    );

    if (effectiveSlots.length === 0) {
      toast.warning("Vui lòng chọn khung giờ thi đấu trước khi xác nhận đặt sân");
      setShowModal(false);
      return;
    }

    // 🔹 Kiểm tra số lượng dịch vụ so với tồn kho
    for (const item of selectedServicesList) {
      const stock = item.stock !== undefined ? Number(item.stock) : 999;
      if (item.quantity > stock) {
        toast.warning(
          stock <= 0
            ? `Dịch vụ "${item.name}" hiện đã hết hàng trong kho.`
            : `Dịch vụ "${item.name}" chỉ còn ${stock} sản phẩm trong kho. Bạn đã chọn ${item.quantity}.`
        );
        setShowModal(false);
        return;
      }
    }

    setSubmitting(true);
    isSubmittingBookingRef.current = true;

    const booking = {
      customer_id: currentUser?.id || null,
      guest_name: customerName.trim(),
      guest_phone: phoneNumber.trim(),
      guest_email: email.trim(),
      notes: [teamName ? `Đội bóng: ${teamName}` : "", note].filter(Boolean).join(" | "),
      field_id: bookingInfo.fieldId,
      booking_date: bookingInfo.selectedDate || new Date().toISOString().split("T")[0],
      start_time: effectiveSlots[0].start_time,
      end_time: effectiveSlots[0].end_time,
      slots: effectiveSlots.map((s) => ({
        start_time: s.start_time,
        end_time: s.end_time,
        price: Number(s.price) || (fieldPrice / effectiveSlots.length),
      })),
      total_price: totalPrice,
      voucher_code: appliedVoucher?.code || null,
      discount_amount: discountAmount,
      payment_method: paymentMethod,
    };

    try {
      const res = await createBooking(booking);
      const { booking_id, booking_id_short } = res.data;
      createdBookingSlotsRef.current = effectiveSlots;

      for (const item of selectedServicesList) {
        await createBookingService({
          booking_id,
          service_id: item.id,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          shoe_size: item.shoeSize || null,
        });
      }
      const successState = {
        bookingCode: booking_id_short || bookingInfo.bookingCode,
        fullId: booking_id,
        bookingDetails: {
          fieldName: bookingInfo.fieldName,
          fieldType: typeLabel,
          fieldAddress: bookingInfo.fieldAddress,
          fieldImage: bookingInfo.fieldImage,
          bookingDate: booking.booking_date,
          timeSlot: effectiveSlots.map((s) => `${s.start_time} - ${s.end_time}`).join(", "),
          durationMinutes: effectiveSlots.length * 60,
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
      };

      try {
        sessionStorage.removeItem("booking_draft");
      } catch (e) {}

      // ─── Nếu chọn thanh toán trực tuyến qua VietQR ───────────────────────
      if (paymentMethod === "qr" || paymentMethod === "deposit") {
        const payAmount = paymentMethod === "deposit" ? Math.round(totalPrice * 0.5) : totalPrice;
        const qrRes = await createQrPayment({
          booking_id,
          amount: payAmount,
        });

        if (qrRes.data?.success) {
          pendingSuccessStateRef.current = successState;
          setQrData(qrRes.data);
          setQrCountdown(600);
          setQrPaymentSuccess(false);
          setShowModal(false);
          setSubmitting(false);
          setShowQrModal(true);

          // Bắt đầu đếm ngược 10 phút
          if (qrTimerRef.current) clearInterval(qrTimerRef.current);
          qrTimerRef.current = setInterval(() => {
            setQrCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(qrTimerRef.current);
                if (booking_id) {
                  updateBooking(booking_id, { status: "Cancelled" }).catch(() => {});
                  broadcastSyncEvent("booking_cancelled", { bookingId: booking_id });
                }
                setShowQrModal(false);
                createdBookingSlotsRef.current = [];
                isSubmittingBookingRef.current = false;
                toast.error("Hết thời gian thanh toán QR (10 phút). Đơn đặt sân đã tự động hủy.");
                fetchSlots(false);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          // Bắt đầu Polling kiểm tra trạng thái mỗi 2 giây
          if (qrPollRef.current) clearInterval(qrPollRef.current);
          qrPollRef.current = setInterval(async () => {
            try {
              const statusRes = await checkPaymentStatus(booking_id);
              if (statusRes.data?.is_paid) {
                clearInterval(qrPollRef.current);
                clearInterval(qrTimerRef.current);
                setQrPaymentSuccess(true);
                setTimeout(() => {
                  setShowQrModal(false);
                  broadcastSyncEvent("booking_created", { bookingId: booking_id });
                  navigate("/booking/success", { state: pendingSuccessStateRef.current });
                }, 1600);
              }
            } catch (pollErr) {
              console.log("Lỗi polling payment status:", pollErr);
            }
          }, 2000);

          return;
        }
      }

      // Thanh toán tiền mặt tại sân
      broadcastSyncEvent("booking_created", { bookingId: booking_id });
      navigate("/booking/success", { state: successState });
    } catch (err) {
      console.log("Lỗi đặt sân:", err);
      isSubmittingBookingRef.current = false;
      createdBookingSlotsRef.current = [];
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Có lỗi xảy ra khi đặt sân. Vui lòng kiểm tra lại!";
      toast.error(msg);
      setSubmitting(false);
      setShowModal(false);
    }
  };

  // Modal countdown ring
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = (modalCountdown / 15) * circumference;
  const isLow = modalCountdown <= 5;

  const PAYMENT_OPTIONS = [
    {
      value: "qr",
      name: "Chuyển khoản QR Napas 24/7 (SePay)",
      desc: "Quét mã VietQR bằng app ngân hàng bất kỳ, hệ thống tự động nhận diện thanh toán ngay.",
      badge: { label: "TỰ ĐỘNG DUYỆT 24/7", cls: "recommended" },
      badgeRight: { label: "Khuyên dùng", cls: "free" },
      disabled: false,
    },
    {
      value: "cash",
      name: "Thanh toán tại sân",
      desc: "Trả tiền mặt hoặc chuyển khoản tại quầy khi đến nhận sân thi đấu.",
      badge: { label: "TRẢ SAU", cls: "partial" },
      disabled: false,
    },
    {
      value: "deposit",
      name: "Đặt cọc 50% trước (SePay)",
      desc: "Chuyển khoản cọc 50% qua QR để chắc chắn giữ sân giờ cao điểm, 50% còn lại thanh toán tại sân.",
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
                    Email{" "}
                    {currentUser?.email ? (
                      <span className="bk-label-badge">Đã liên kết</span>
                    ) : (
                      <span className="bk-label-badge orange">Tùy chọn</span>
                    )}
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
                      src={getFullImageUrl(bookingInfo.fieldImage)}
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
                    Thời lượng: {selectedSlots.length > 0 ? selectedSlots.length * 60 : 60} phút thi đấu
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
                  <div className="bk-summary-time-item__label">
                    Khung giờ:
                  </div>
                  <div className="bk-summary-time-item__value" style={{ color: "#16a34a", fontSize: selectedSlots.length > 1 ? "0.85rem" : "0.95rem" }}>
                    {selectedSlots.length > 0
                      ? selectedSlots.map((s) => `${s.start_time} - ${s.end_time}`).join(", ")
                      : (loadingSlots ? "Đang tải giờ..." : "Chưa chọn giờ")}
                  </div>
                  <div className="bk-summary-time-item__sub">
                    Mặt cỏ nhân tạo: FIFA Pro tiêu chuẩn
                  </div>
                </div>
              </div>

              {/* Slot selector chips (nếu người dùng muốn chọn hoặc đổi khung giờ) */}
              <div className="bk-summary-slots-box">
                <div className="bk-summary-slots-title">
                  <span>Khung giờ ngày {formatDateDisplay(bookingInfo?.selectedDate)}:</span>
                </div>

                {availableSlots.length > 0 ? (
                  <div className="bk-slots-chips">
                    {availableSlots.map((slot) => {
                      const isPast = isSlotExpired(bookingInfo?.selectedDate, slot.start_time);
                      const isBooked = slot.status !== "available";
                      const timeRange = `${slot.start_time} - ${slot.end_time}`;
                      const otherConflict = customerLimits.other_field_slots?.find(
                        (o) => o.start_time === slot.start_time || o.time === timeRange
                      );
                      const isDisabled = isBooked || isPast || Boolean(otherConflict);
                      const isSelected = selectedSlots.some(
                        (s) => (s.id && s.id === slot.id) || `${s.start_time} - ${s.end_time}` === timeRange
                      );
                      const selIndex = selectedSlots.findIndex(
                        (s) => (s.id && s.id === slot.id) || `${s.start_time} - ${s.end_time}` === timeRange
                      );

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isDisabled}
                          className={`bk-slot-chip ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""} ${isPast ? "past-dimmed" : ""} ${otherConflict ? "booked-other" : ""}`}
                          onClick={() => handleSlotSelect(slot)}
                          title={
                            isPast
                              ? "Khung giờ này đã qua hôm nay"
                              : otherConflict
                              ? `Bạn đã đặt khung giờ này tại ${otherConflict.field_name}`
                              : isBooked
                              ? "Đã có người đặt"
                              : `${slot.price?.toLocaleString()}đ - Bấm để chọn/bỏ chọn (tối đa 3)`
                          }
                        >
                          {timeRange}
                          {isPast ? null : isBooked ? (
                            <span className="bk-slot-chip__status">Đã đặt</span>
                          ) : otherConflict ? (
                            <span className="bk-slot-chip__status" style={{ fontSize: "0.58rem" }}>Đã đặt ở {otherConflict.field_name}</span>
                          ) : isSelected ? (
                            <span className="bk-slot-chip__status">✓ Đang chọn</span>
                          ) : null}
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

      {/* ═══ COUNTDOWN CONFIRMATION MODAL ═══ */}
      {showModal && (
        <div className="cd-overlay" onClick={handleCancel}>
          <div
            className={`cd-modal${isLow ? " cd-modal--urgent" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Gradient Banner with Sports Icon & Close Button */}
            <div className="cd-modal__header">
              <div className="cd-modal__header-left">
                <div className="cd-modal__badge-icon">
                  <span className="material-symbols-outlined">sports_soccer</span>
                </div>
                <div>
                  <h3 className="cd-modal__title">Xác nhận đặt sân</h3>
                  <p className="cd-modal__subtitle">Vui lòng kiểm tra và xác nhận trong thời gian giữ chỗ</p>
                </div>
              </div>
              <button
                type="button"
                className="cd-modal__close-btn"
                onClick={handleCancel}
                title="Đóng"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="cd-modal__body">
              {/* Ticket Information Card */}
              <div className="cd-info-card">
                <div className="cd-info-row">
                  <div className="cd-info-label-group">
                    <span className="material-symbols-outlined cd-info-icon">stadium</span>
                    <span className="cd-info-label">Sân bóng</span>
                  </div>
                  <div className="cd-info-value-group">
                    <span className="cd-info-value">{bookingInfo?.fieldName || "—"}</span>
                    {typeLabel && <span className="cd-badge-type">{typeLabel}</span>}
                  </div>
                </div>

                <div className="cd-info-row">
                  <div className="cd-info-label-group">
                    <span className="material-symbols-outlined cd-info-icon">calendar_month</span>
                    <span className="cd-info-label">Ngày thi đấu</span>
                  </div>
                  <span className="cd-info-value">{formattedDate}</span>
                </div>

                <div className="cd-info-row">
                  <div className="cd-info-label-group">
                    <span className="material-symbols-outlined cd-info-icon">schedule</span>
                    <span className="cd-info-label">Khung giờ</span>
                  </div>
                  <div className="cd-time-pill">
                    <span className="material-symbols-outlined cd-time-icon">timer</span>
                    <span>{bookingInfo?.selectedTimeSlot || "—"}</span>
                  </div>
                </div>

                {/* Dịch vụ đi kèm đã chọn */}
                {selectedServicesList.length > 0 && (
                  <div className="cd-services-section">
                    <div className="cd-services-heading">
                      <div className="cd-info-label-group">
                        <span className="material-symbols-outlined cd-info-icon">sports</span>
                        <span className="cd-info-label">Dịch vụ đi kèm</span>
                      </div>
                      <span className="cd-services-count">{selectedServicesList.length} dịch vụ</span>
                    </div>
                    <div className="cd-services-list">
                      {selectedServicesList.map((srv) => (
                        <div key={srv.id} className="cd-service-item">
                          <div className="cd-service-info">
                            <span className="cd-service-dot" />
                            <span className="cd-service-name">
                              {srv.name} {srv.shoeSize ? `(Size ${srv.shoeSize})` : ""}
                            </span>
                            <span className="cd-service-qty">×{srv.quantity}</span>
                          </div>
                          <span className="cd-service-price">
                            {srv.price === 0 ? "Miễn phí" : `${(srv.price * srv.quantity).toLocaleString("vi-VN")}đ`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ưu đãi Voucher nếu có */}
                {discountAmount > 0 && (
                  <div className="cd-info-row cd-info-row--discount">
                    <div className="cd-info-label-group">
                      <span className="material-symbols-outlined cd-info-icon cd-info-icon--voucher">confirmation_number</span>
                      <span className="cd-info-label">Voucher ưu đãi</span>
                    </div>
                    <div className="cd-voucher-badge">
                      <span className="cd-voucher-code">{appliedVoucher?.code || voucherCode}</span>
                      <span className="cd-discount-price">-{discountAmount.toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>
                )}

                {/* Hình thức thanh toán */}
                <div className="cd-info-row">
                  <div className="cd-info-label-group">
                    <span className="material-symbols-outlined cd-info-icon">credit_card</span>
                    <span className="cd-info-label">Thanh toán</span>
                  </div>
                  <span className="cd-payment-badge">
                    {paymentMethod === "qr"
                      ? "Chuyển khoản QR Napas 24/7"
                      : paymentMethod === "deposit"
                      ? "Đặt cọc 50% (QR)"
                      : "Thanh toán tại sân"}
                  </span>
                </div>

                <div className="cd-info-row cd-info-row--total">
                  <div className="cd-info-label-group">
                    <span className="material-symbols-outlined cd-info-icon cd-info-icon--total">payments</span>
                    <span className="cd-info-label cd-info-label--total">Tổng thanh toán</span>
                  </div>
                  <span className="cd-info-price">
                    {totalPrice.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>

              {/* Countdown Radar Circle */}
              <div className={`cd-timer-section${isLow ? " cd-timer-section--urgent" : ""}`}>
                <div className="cd-timer-circle-wrap">
                  <svg className="cd-ring" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="cdGradNormal" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="cdGradUrgent" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f87171" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={isLow ? "url(#cdGradUrgent)" : "url(#cdGradNormal)"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - progress}
                      className="cd-ring__progress"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="cd-timer-center">
                    <span className={`cd-timer-digits${isLow ? " cd-timer-digits--urgent" : ""}`}>
                      {String(modalCountdown).padStart(2, "0")}
                    </span>
                    <span className="cd-timer-unit">GIÂY</span>
                  </div>
                </div>

                <div className="cd-timer-status-box">
                  <div className="cd-timer-status-pill">
                    <span className={`cd-status-dot${isLow ? " cd-status-dot--urgent" : ""}`} />
                    <span className="cd-status-text">
                      {isLow ? "Sắp hết thời gian giữ chỗ!" : "Đang tạm giữ chỗ cho bạn"}
                    </span>
                  </div>
                  <p className="cd-timer-desc">
                    {isLow ? "Nhấn xác nhận ngay để hoàn tất đơn đặt sân" : "Hệ thống đang khóa slot này để chờ bạn xác nhận"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="cd-actions">
                <button
                  type="button"
                  className="cd-btn cd-btn--cancel"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  <span className="material-symbols-outlined">close</span>
                  <span>Hủy bỏ</span>
                </button>
                <button
                  type="button"
                  className={`cd-btn cd-btn--confirm${isLow ? " cd-btn--confirm-urgent" : ""}`}
                  onClick={handleConfirm}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="cd-spinner" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">check_circle</span>
                      <span>Xác nhận đặt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Bottom Security Note */}
              <div className="cd-security-note">
                <span className="material-symbols-outlined">lock_clock</span>
                <span>Nếu không xác nhận trong 15s, yêu cầu sẽ tự động hủy để trả lại slot trống.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VIETQR PAYMENT MODAL (AUTO-DETECT VIA SEPAY) ═══ */}
      {showQrModal && qrData && (
        <div className="qr-overlay" onClick={handleCloseQrModal}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            {qrPaymentSuccess ? (
              <div className="qr-modal--success">
                <div className="qr-success-icon-wrap">
                  <span className="material-symbols-outlined" style={{ fontSize: 44 }}>check_circle</span>
                </div>
                <h3 className="qr-success-title">Thanh toán thành công!</h3>
                <p className="qr-success-desc">
                  Hệ thống đã nhận diện giao dịch thành công. Đang tạo vé điện tử...
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
                      <h3 className="qr-modal__title">Quét mã QR thanh toán</h3>
                      <p className="qr-modal__subtitle">Tự động xác nhận giao dịch qua SePay Napas 24/7</p>
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
                        alt="Mã QR SePay thanh toán"
                        className="qr-img"
                      />
                    </div>
                    <div className="qr-code-box__label">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#16a34a" }}>verified</span>
                      <span>Mã QR Napas 24/7 hợp lệ</span>
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
                        <span className="qr-detail-label">Số tiền thanh toán</span>
                        <div className="qr-detail-value qr-detail-value--amount">
                          {Number(qrData.amount || 0).toLocaleString("vi-VN")}đ
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
                      <div className="qr-status-sub">Trang sẽ tự động chuyển khi nhận được tiền</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="qr-simulate-btn"
                    onClick={handleSimulatePayment}
                    disabled={simulating}
                    title="Bấm để kích hoạt thanh toán ngay mà không cần chuyển tiền thật (Dành cho Test / Báo cáo)"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#f59e0b" }}>bolt</span>
                    {simulating ? "Đang xử lý..." : "Mô phỏng Test"}
                  </button>
                </div>
              </>
            )}
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
        onClose={() => {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          if (confirmConfig.onCancel) confirmConfig.onCancel();
        }}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default Booking;
