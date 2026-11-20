/**
 * Tiện ích xử lý ngày và khung giờ đặt sân bóng
 */

export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Kiểm tra xem khung giờ có phải là khung giờ hiện tại hoặc đã qua không.
 * Quy tắc:
 * - Nếu ngày được chọn nhỏ hơn hôm nay: Đã qua (true).
 * - Nếu ngày được chọn lớn hơn hôm nay: Chưa qua, có thể chọn (false).
 * - Nếu ngày được chọn là hôm nay:
 *   + Khung giờ hiện tại (giờ bắt đầu <= giờ hiện tại) và các khung giờ trước đó sẽ không chọn được (true).
 *   + Ví dụ: Hiện tại đang là 15h (15:00 - 15:59):
 *     Khung 15:00 - 16:00 và các khung từ 14:00 trở về trước (06:00 -> 15:00) => true (không chọn được).
 *     Khung từ 16:00 - 17:00 trở đi => false (chọn được bình thường).
 *
 * @param {string} slotDateStr - Định dạng YYYY-MM-DD hoặc DD/MM/YYYY
 * @param {string} startTimeStr - Định dạng HH:mm hoặc HH:mm:ss
 * @returns {boolean} true nếu không thể chọn (đã qua hoặc đang diễn ra)
 */
export const isSlotExpired = (slotDateStr, startTimeStr) => {
  if (!slotDateStr || !startTimeStr) return false;

  const now = new Date();
  const todayStr = getLocalDateString(now);

  // Chuẩn hóa định dạng ngày về YYYY-MM-DD
  let dateFormatted = String(slotDateStr).split("T")[0].trim();
  if (dateFormatted.includes("/")) {
    const parts = dateFormatted.split("/");
    if (parts.length === 3) {
      // Giả sử DD/MM/YYYY
      dateFormatted = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }
  }

  if (dateFormatted < todayStr) return true;
  if (dateFormatted > todayStr) return false;

  // Ngày là ngày hôm nay
  const [slotH] = startTimeStr.split(":").map(Number);
  const currentH = now.getHours();

  // Khung giờ hiện tại và các khung giờ trước đó không chọn được
  return slotH <= currentH;
};

