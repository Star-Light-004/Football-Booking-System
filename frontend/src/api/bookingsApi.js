import axios from './axiosClient';
import { BASE_URL } from '../config';
export const createBooking = async (bookingData) => {
  return await axios.post(`${BASE_URL}/bookings/create/`, bookingData);
};

export const getBookings = async (config = {}) => {
  return await axios.get(`${BASE_URL}/bookings/`, config);
};

export const updateBooking = async (id, data) => {
  return await axios.put(`${BASE_URL}/bookings/${id}/update/`, data);
};

export const deleteBooking = async (id) => {
  return await axios.delete(`${BASE_URL}/bookings/${id}/delete/`);
};

export const getCustomerBookingLimits = async ({ fieldId, date, customerId, phone }) => {
  const params = new URLSearchParams();
  if (fieldId) params.append('field_id', fieldId);
  if (date) params.append('date', date);
  if (customerId) params.append('customer_id', customerId);
  if (phone) params.append('phone', phone);
  return await axios.get(`${BASE_URL}/bookings/customer-limits/?${params.toString()}`);
};


