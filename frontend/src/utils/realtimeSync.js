/**
 * realtimeSync.js
 * Quản lý đồng bộ sự kiện tức thì (0ms) giữa các tab/cửa sổ (Cross-tab Event Sync)
 * Kết hợp cơ chế Smart Polling để đồng bộ đa thiết bị không cần F5.
 */

const SYNC_KEY = "football_booking_sync_event";

/**
 * Phát sự kiện đồng bộ đến tất cả các tab và cửa sổ khác
 * @param {string} eventType - Tên sự kiện: 'booking_created', 'booking_updated', 'booking_cancelled', 'tournament_updated', etc.
 * @param {object} payload - Dữ liệu kèm theo
 */
export const broadcastSyncEvent = (eventType, payload = {}) => {
  try {
    const data = {
      type: eventType,
      payload,
      timestamp: Date.now(),
    };
    localStorage.setItem(SYNC_KEY, JSON.stringify(data));
    // Phát custom event trên tab hiện tại nếu cần
    window.dispatchEvent(new CustomEvent("football_sync", { detail: data }));
  } catch (err) {
    console.warn("Lỗi broadcastSyncEvent:", err);
  }
};

/**
 * Lắng nghe sự kiện đồng bộ từ các tab khác
 * @param {function} callback - Hàm xử lý khi có sự kiện
 * @returns {function} - Hàm dọn dẹp listener khi unmount
 */
export const onSyncEvent = (callback) => {
  const handleStorage = (e) => {
    if (e.key === SYNC_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        callback(data);
      } catch {}
    }
  };

  const handleCustom = (e) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("football_sync", handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("football_sync", handleCustom);
  };
};
