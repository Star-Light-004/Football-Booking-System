import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BASE_URL } from "../../config";
import PageHero from "../../components/PageHero/PageHero";
import "./Contact.css";

const SUPPORT_PHONE = "1900 88 99 22";
const SUPPORT_EMAIL = "hotro@footballbooking.vn";

const supportTopics = [
  "Mưa bão & đổi lịch",
  "Khiếu nại & cọc",
  "Chất lượng sân cỏ",
  "Hợp tác & khác",
];

const getBookingStatusLabel = (status) => {
  if (String(status || "").toLowerCase() === "completed") return "Đã hoàn thành";
  if (String(status || "").toLowerCase() === "cancelled") return "Đã hủy";
  return "Đang xử lý";
};

const Contact = () => {
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [topic, setTopic] = useState(supportTopics[0]);
  const [selectedBooking, setSelectedBooking] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [mailNotice, setMailNotice] = useState("");

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      setUser(storedUser);
      setName(storedUser?.full_name || storedUser?.fullname || "");
      setPhone(storedUser?.phone || "");
      setEmail(storedUser?.email || "");

      if (storedUser?.id) {
        fetch(`${BASE_URL}/bookings/user/${storedUser.id}/`)
          .then((response) => (response.ok ? response.json() : []))
          .then((data) => setBookings(Array.isArray(data) ? data : []))
          .catch((error) => console.error("Lỗi tải lịch sử đặt sân:", error));
      }
    } catch (error) {
      console.error("Lỗi đọc thông tin tài khoản:", error);
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    const relatedBooking = bookings.find((booking) => booking.id === selectedBooking);
    const emailBody = [
      `Chủ đề: ${topic}`,
      `Họ tên: ${name}`,
      `Số điện thoại: ${phone}`,
      `Email: ${email}`,
      relatedBooking ? `Đơn đặt sân: #FB-${relatedBooking.id.substring(0, 8).toUpperCase()} · ${relatedBooking.fieldName}` : "",
      `Chi tiết: ${details}`,
      attachment ? `Tệp cần gửi kèm: ${attachment.name} (vui lòng đính kèm tệp sau khi email được mở)` : "",
    ].filter(Boolean).join("\n");

    setMailNotice("Đang mở ứng dụng email để gửi yêu cầu hỗ trợ.");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Yêu cầu hỗ trợ: ${topic}`)}&body=${encodeURIComponent(emailBody)}`;
  };

  const recentBookings = bookings.slice(0, 2);
  const mapUrl = "https://maps.google.com/?q=" + encodeURIComponent("Hòa Xuân, Cẩm Lệ, Đà Nẵng");

  return (
    <main className="contact-page">
      <div className="contact-container">
        <PageHero
          breadcrumb={[{ label: "Trang chủ", to: "/" }, { label: "Liên hệ hỗ trợ" }]}
          eyebrow="HỖ TRỢ 24/7 · PHẢN HỒI NHANH TRONG 15 PHÚT"
          title="Trung tâm hỗ trợ & liên hệ"
          description="Bạn gặp khó khăn về đơn đặt sân, cần đổi lịch thi đấu do mưa bão hay giải quyết khiếu nại? Đội ngũ hỗ trợ Football Booking luôn sẵn sàng đồng hành cùng bạn."
        />

        <section className="contact-channels" aria-label="Các kênh liên hệ">
          <article className="contact-channel-card">
            <span className="contact-channel-icon contact-channel-icon--green material-symbols-outlined">call</span>
            <div><span className="contact-eyebrow">TỔNG ĐÀI HOTLINE</span><h2>{SUPPORT_PHONE}</h2><p>Miễn cước · Phục vụ từ 06:00 đến 23:00 hằng ngày</p></div>
            <a href="tel:1900889922" className="contact-channel-button contact-channel-button--green"><span className="material-symbols-outlined">call</span>Gọi ngay tức thì</a>
          </article>
          <article className="contact-channel-card">
            <span className="contact-channel-icon contact-channel-icon--blue material-symbols-outlined">forum</span>
            <div><span className="contact-eyebrow">ZALO &amp; MESSENGER</span><h2>Chat CSKH trực tuyến</h2><p>Phản hồi từ đội ngũ trong 5 phút · Tiếp nhận nhanh/chụp</p></div>
            <a href="https://zalo.me/" target="_blank" rel="noreferrer" className="contact-channel-button contact-channel-button--blue"><span className="material-symbols-outlined">chat</span>Mở Zalo</a>
          </article>
          <article className="contact-channel-card">
            <span className="contact-channel-icon contact-channel-icon--purple material-symbols-outlined">mail</span>
            <div><span className="contact-eyebrow">HÒM THƯ ĐIỆN TỬ</span><h2>{SUPPORT_EMAIL}</h2><p>Hợp tác: hop tac@footballbooking.vn</p></div>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="contact-channel-button contact-channel-button--purple"><span className="material-symbols-outlined">send</span>Gửi email thư từ</a>
          </article>
          <article className="contact-channel-card">
            <span className="contact-channel-icon contact-channel-icon--green material-symbols-outlined">location_on</span>
            <div><span className="contact-eyebrow">VĂN PHÒNG TRỰC TIẾP</span><h2>Đà Nẵng &amp; Hà Nội</h2><p>Tòa nhà SVC Hòa Xuân, Cẩm Lệ &amp; Duy Tân, Cầu Giấy</p></div>
            <a href={mapUrl} target="_blank" rel="noreferrer" className="contact-channel-button contact-channel-button--blue"><span className="material-symbols-outlined">map</span>Xem chỉ đường</a>
          </article>
        </section>

        <div className="contact-main-grid">
          <section className="contact-form-panel">
            <div className="contact-section-heading">
              <div><h2>Gửi Yêu Cầu Hỗ Trợ Trực Tuyến</h2><p>Liên kết trực tiếp tới đội ngũ hỗ trợ để xử lý nhanh nhất</p></div>
              <span className="contact-priority"><span className="material-symbols-outlined">schedule</span>ƯU TIÊN THEO DÕI</span>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
              <fieldset className="contact-topic-group">
                <legend>Phân loại nhu cầu cần hỗ trợ</legend>
                <div className="contact-topic-tabs">
                  {supportTopics.map((item) => (
                    <button key={item} type="button" className={topic === item ? "active" : ""} onClick={() => setTopic(item)}>{item}</button>
                  ))}
                </div>
              </fieldset>

              <label className="contact-form-label" htmlFor="contact-booking">Đơn đặt sân liên quan <span>(Không bắt buộc)</span><Link to="/my-bookings">Mở lịch sử đặt sân</Link></label>
              <select id="contact-booking" className="contact-control" value={selectedBooking} onChange={(event) => setSelectedBooking(event.target.value)}>
                <option value="">{user ? "Chọn một đơn đặt sân" : "Đăng nhập để chọn đơn đặt sân"}</option>
                {bookings.map((booking) => (
                  <option value={booking.id} key={booking.id}>
                    #FB-{booking.id.substring(0, 8).toUpperCase()} · {booking.fieldName} · {booking.timeSlot} · {getBookingStatusLabel(booking.status)}
                  </option>
                ))}
              </select>

              <div className="contact-input-grid">
                <div><label className="contact-form-label" htmlFor="contact-name">Họ và tên người đặt</label><input id="contact-name" className="contact-control" required value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập họ và tên" /></div>
                <div><label className="contact-form-label" htmlFor="contact-phone">Số điện thoại liên hệ</label><input id="contact-phone" className="contact-control" type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập số điện thoại" /></div>
              </div>

              <div><label className="contact-form-label" htmlFor="contact-email">Địa chỉ email nhận biên bản</label><input id="contact-email" className="contact-control" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="example@email.com" /></div>

              <div><label className="contact-form-label" htmlFor="contact-details">Chi tiết vấn đề phát sinh <span>Tối đa 1000 ký tự</span></label><textarea id="contact-details" className="contact-control contact-textarea" maxLength={1000} required value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Vui lòng nêu rõ lý do (Ví dụ: Thời tiết mưa to tại khu vực Ngũ Hành Sơn, sân bị đọng nước, ...)." /><span className="contact-character-count">{details.length}/1000</span></div>

              <div><label className="contact-form-label" htmlFor="contact-attachment">Đính kèm ảnh hiện trường / Sao kê chuyển khoản (nếu có)</label><label className="contact-upload" htmlFor="contact-attachment"><span className="material-symbols-outlined">cloud_upload</span><strong>{attachment ? attachment.name : "Kéo thả ảnh hoặc chọn tệp đính kèm"}</strong><small>Hỗ trợ JPG, PNG, PDF · Tệp sẽ được đính kèm thủ công trong email sau khi mở</small><input id="contact-attachment" type="file" accept="image/*,.pdf" onChange={(event) => setAttachment(event.target.files?.[0] || null)} /></label></div>

              <p className="contact-response-note"><span className="material-symbols-outlined">verified_user</span>Cam kết phản hồi xác nhận qua SMS/Email trong vòng 15–30 phút theo giờ làm việc.</p>
              <button className="contact-submit-button" type="submit"><span className="material-symbols-outlined">send</span>GỬI YÊU CẦU HỖ TRỢ NGAY</button>
              {mailNotice && <p className="contact-mail-notice" role="status">{mailNotice}</p>}
            </form>
          </section>

          <aside className="contact-side-column">
            <section className="contact-side-card">
              <div className="contact-side-heading"><h2><span className="material-symbols-outlined">history</span>Lịch sử đặt sân gần đây</h2><Link to="/my-bookings">{bookings.length} lượt</Link></div>
              {recentBookings.length > 0 ? recentBookings.map((booking) => (
                <Link to={`/my-bookings/${booking.id}`} state={{ booking }} className="contact-recent-booking" key={booking.id}>
                  <div><strong>#FB-{booking.id.substring(0, 8).toUpperCase()}</strong><span>{booking.fieldName}</span><small>{booking.timeSlot} · {new Date(booking.bookingDate).toLocaleDateString("vi-VN")}</small></div>
                  <span className="contact-booking-status">{getBookingStatusLabel(booking.status)}</span>
                </Link>
              )) : <p className="contact-side-empty">{user ? "Chưa có đơn đặt sân gần đây." : "Đăng nhập để xem lịch sử đặt sân liên quan."}</p>}
            </section>

            <section className="contact-side-card contact-policy-card">
              <h2><span className="material-symbols-outlined">gavel</span>Chính sách hỗ trợ đội bóng</h2>
              <p><span className="material-symbols-outlined">schedule</span><span><strong>Đổi lịch miễn phí:</strong> Áp dụng khi báo trước giờ bóng lăn tối thiểu 4 tiếng.</span></p>
              <p><span className="material-symbols-outlined">umbrella</span><span><strong>Thời tiết ngập lụt:</strong> Tự động hoàn tiền hoặc bảo lưu suất đặt sân khi không thể thi đấu.</span></p>
              <p><span className="material-symbols-outlined">verified_user</span><span><strong>Bảo mật thông tin:</strong> Thông tin đặt sân chỉ được dùng để hỗ trợ xử lý yêu cầu.</span></p>
              <Link to="/lookup">Tra cứu quyền lợi <span className="material-symbols-outlined">arrow_forward</span></Link>
            </section>

            <div className="contact-shortcuts">
              <Link to="/my-bookings"><span className="material-symbols-outlined">event_note</span><strong>Lịch sử đặt sân</strong><small>Xem lại các lượt đặt</small></Link>
              <Link to="/lookup"><span className="material-symbols-outlined">qr_code_scanner</span><strong>Xem vé QR</strong><small>Tra cứu mã nhận sân</small></Link>
            </div>

            <section className="contact-hotline-banner">
              <span className="material-symbols-outlined">support_agent</span>
              <div><strong>CẦN GẤP? HỖ TRỢ TRỰC TIẾP</strong><p>Tra cứu số Hotline từng sân bóng tại vé QR</p></div>
              <a href="tel:1900889922">Tra cứu</a>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
};

export default Contact;