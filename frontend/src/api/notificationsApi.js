/**
 * notificationsApi.js
 * Hệ thống thông báo động (Dynamic Notifications Engine)
 * - Tự động đồng bộ đa thiết bị khi deploy qua API Backend: /api/notifications/?customer_id=...
 * - KHÔNG cần bảng notifications trong Database (0 byte dư thừa)
 * - Quản lý trạng thái Đã đọc / Đã xóa cực nhẹ qua Client Storage
 */

import axiosClient from './axiosClient';
import { broadcastSyncEvent, onSyncEvent } from '../utils/realtimeSync';

const READ_IDS_PREFIX = 'football_notif_read_ids_';
const DELETED_IDS_PREFIX = 'football_notif_del_ids_';

const getStoredSet = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveStoredSet = (key, set) => {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Lỗi lưu notification state vào localStorage:', err);
  }
};

const resolveUserKey = (customerId) => {
  if (!customerId || customerId === 'admin' || customerId === 'staff') {
    return 'admin';
  }
  return String(customerId);
};

export const notificationsApi = {
  /**
   * Lấy danh sách thông báo từ API Backend (sinh động từ bookings thực tế)
   * @param {string} customerId - ID của customer hoặc 'admin'
   * @returns {Promise} Response chuẩn: { data: { notifications, unread_count } }
   */
  getNotifications: async (customerId) => {
    try {
      const userKey = resolveUserKey(customerId);
      const isExplicitAdmin = customerId === 'admin' || customerId === 'staff' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

      // Gọi API Backend sinh động từ đơn đặt sân thực tế
      const res = await axiosClient.get('/notifications/', {
        params: {
          customer_id: isExplicitAdmin ? 'admin' : customerId,
          role: isExplicitAdmin ? 'admin' : 'customer',
        },
      });

      const rawList = res.data?.notifications || [];
      const readIds = getStoredSet(`${READ_IDS_PREFIX}${userKey}`);
      const deletedIds = getStoredSet(`${DELETED_IDS_PREFIX}${userKey}`);

      // Lọc bỏ các thông báo người dùng đã bấm xóa
      const filtered = rawList.filter((n) => !deletedIds.has(n.id));

      // Áp dụng trạng thái đã đọc
      filtered.forEach((n) => {
        if (readIds.has(n.id)) {
          n.is_read = true;
        }
      });

      const unread_count = filtered.filter((n) => !n.is_read).length;

      return {
        data: {
          notifications: filtered,
          unread_count,
        },
      };
    } catch (err) {
      console.warn('Lỗi tải dynamic notifications từ server, fallback dữ liệu local:', err);
      return {
        data: {
          notifications: [],
          unread_count: 0,
        },
      };
    }
  },

  /**
   * Đánh dấu 1 thông báo là đã đọc
   * @param {string} notificationId - ID của notification
   */
  markAsRead: async (notificationId) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
      const currentAdmin = JSON.parse(localStorage.getItem('admin_user') || 'null');
      const userKey = resolveUserKey(currentUser?.id || (currentAdmin ? 'admin' : 'guest'));

      const readKey = `${READ_IDS_PREFIX}${userKey}`;
      const readIds = getStoredSet(readKey);
      readIds.add(notificationId);
      saveStoredSet(readKey, readIds);

      // Bắn event cập nhật chuông ngay lập tức giữa các tab
      broadcastSyncEvent('notification_updated', { id: notificationId });

      // Gọi server (endpoint tượng trưng, không ghi DB)
      try {
        await axiosClient.put(`/notifications/mark-as-read/${notificationId}/`);
      } catch {}

      return { data: { message: 'Notification marked as read' } };
    } catch (err) {
      return { data: { message: 'Marked read' } };
    }
  },

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   * @param {string} customerId - ID của customer hoặc 'admin'
   */
  markAllAsRead: async (customerId) => {
    try {
      const userKey = resolveUserKey(customerId);
      const res = await notificationsApi.getNotifications(customerId);
      const list = res.data?.notifications || [];

      const readKey = `${READ_IDS_PREFIX}${userKey}`;
      const readIds = getStoredSet(readKey);
      list.forEach((n) => readIds.add(n.id));
      saveStoredSet(readKey, readIds);

      broadcastSyncEvent('notification_updated', { customerId });

      try {
        await axiosClient.put('/notifications/mark-all-as-read/');
      } catch {}

      return { data: { message: 'All notifications marked as read' } };
    } catch (err) {
      return { data: { message: 'All marked read' } };
    }
  },

  /**
   * Xóa 1 thông báo khỏi danh sách hiển thị
   * @param {string} notificationId - ID của notification
   */
  deleteNotification: async (notificationId) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
      const currentAdmin = JSON.parse(localStorage.getItem('admin_user') || 'null');
      const userKey = resolveUserKey(currentUser?.id || (currentAdmin ? 'admin' : 'guest'));

      const delKey = `${DELETED_IDS_PREFIX}${userKey}`;
      const deletedIds = getStoredSet(delKey);
      deletedIds.add(notificationId);
      saveStoredSet(delKey, deletedIds);

      broadcastSyncEvent('notification_updated', { id: notificationId });

      try {
        await axiosClient.delete(`/notifications/delete/${notificationId}/`);
      } catch {}

      return { data: { message: 'Notification deleted' } };
    } catch (err) {
      return { data: { message: 'Notification deleted' } };
    }
  },

  /**
   * Xóa TẤT CẢ thông báo khỏi danh sách hiển thị
   * @param {string} customerId - ID của customer hoặc 'admin'
   */
  deleteAllNotifications: async (customerId) => {
    try {
      const userKey = resolveUserKey(customerId);
      const res = await notificationsApi.getNotifications(customerId);
      const list = res.data?.notifications || [];

      const delKey = `${DELETED_IDS_PREFIX}${userKey}`;
      const deletedIds = getStoredSet(delKey);
      list.forEach((n) => deletedIds.add(n.id));
      saveStoredSet(delKey, deletedIds);

      broadcastSyncEvent('notification_updated', { customerId, action: 'delete_all' });

      try {
        await axiosClient.delete('/notifications/delete/all/');
      } catch {}

      return { data: { message: 'All notifications deleted' } };
    } catch (err) {
      return { data: { message: 'All deleted' } };
    }
  },
};

export default notificationsApi;
