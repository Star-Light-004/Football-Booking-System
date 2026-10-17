import axios from 'axios';
import { BASE_URL } from '../config';

/**
 * Lấy danh sách voucher trong ví của khách hàng
 * @param {string} customerId
 * @param {'all' | 'active' | 'used' | 'expired'} filter
 */
export const getMyVouchers = async (customerId, filter = 'all') => {
  return await axios.get(`${BASE_URL}/vouchers/my-vouchers/`, {
    params: { customer_id: customerId, filter }
  });
};

/**
 * Kiểm tra tính hợp lệ của voucher và tính toán mức giảm giá
 * @param {{ code: string, customer_id?: string, total_price: number }} payload
 */
export const validateVoucher = async (payload) => {
  return await axios.post(`${BASE_URL}/vouchers/validate/`, payload);
};

/**
 * Lấy danh sách voucher công khai
 */
export const getPublicVouchers = async () => {
  return await axios.get(`${BASE_URL}/vouchers/`);
};

// ─── ADMIN VOUCHER CRUD ───────────────────────────────────────────────────────

/**
 * Lấy toàn bộ voucher cho trang quản trị Admin
 */
export const adminGetVouchers = async () => {
  return await axios.get(`${BASE_URL}/vouchers/admin/`);
};

/**
 * Tạo mới voucher
 */
export const adminCreateVoucher = async (voucherData) => {
  return await axios.post(`${BASE_URL}/vouchers/admin/create/`, voucherData);
};

/**
 * Cập nhật voucher
 */
export const adminUpdateVoucher = async (voucherId, voucherData) => {
  return await axios.put(`${BASE_URL}/vouchers/admin/${voucherId}/update/`, voucherData);
};

/**
 * Xóa hoặc ngưng hoạt động voucher
 */
export const adminDeleteVoucher = async (voucherId) => {
  return await axios.delete(`${BASE_URL}/vouchers/admin/${voucherId}/delete/`);
};

/**
 * Lấy lịch sử tất cả các mã voucher đã phát cho khách hàng
 */
export const adminGetCustomerVouchersHistory = async (params = {}) => {
  return await axios.get(`${BASE_URL}/vouchers/admin/issued-history/`, { params });
};

