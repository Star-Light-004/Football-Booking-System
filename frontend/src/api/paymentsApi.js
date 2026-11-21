import axios from './axiosClient';
import { BASE_URL } from '../config';

export const createQrPayment = async (paymentData) => {
  return await axios.post(`${BASE_URL}/payments/qr/create/`, paymentData);
};

export const checkPaymentStatus = async (bookingId) => {
  return await axios.get(`${BASE_URL}/payments/status/${bookingId}/`);
};

export const simulatePaymentTest = async (bookingId) => {
  return await axios.post(`${BASE_URL}/payments/simulate/`, { booking_id: bookingId });
};

export const getRevenueAnalytics = async (params = {}) => {
  return await axios.get(`${BASE_URL}/payments/revenue-analytics/`, { params });
};

