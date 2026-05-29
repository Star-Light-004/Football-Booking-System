import axiosClient from './axiosClient';

export const notificationsApi = {
  /**
   * Lấy thông báo của user
   * @param {string} customerId - ID của customer
   * @returns {Promise} Response với notifications và unread_count
   */
  getNotifications: (customerId) => {
    return axiosClient.get('/notifications/', {
      params: { customer_id: customerId },
    });
  },

  /**
   * Đánh dấu thông báo đã đọc
   * @param {string} notificationId - ID của notification
   * @returns {Promise}
   */
  markAsRead: (notificationId) => {
    return axiosClient.put(`/notifications/mark-as-read/${notificationId}/`);
  },

  /**
   * Đánh dấu tất cả thông báo đã đọc
   * @param {string} customerId - ID của customer
   * @returns {Promise}
   */
  markAllAsRead: (customerId) => {
    return axiosClient.put('/notifications/mark-all-as-read/', {
      customer_id: customerId,
    });
  },

  /**
   * Xóa thông báo
   * @param {string} notificationId - ID của notification
   * @returns {Promise}
   */
  deleteNotification: (notificationId) => {
    return axiosClient.delete(`/notifications/delete/${notificationId}/`);
  },
};

export default notificationsApi;
