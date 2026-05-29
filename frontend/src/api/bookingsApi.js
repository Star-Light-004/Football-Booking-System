import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

export const createBooking = async (bookingData) => {
  return await axios.post(`${BASE_URL}/bookings/create/`, bookingData);
};

export const getBookings = async () => {
  return await axios.get(`${BASE_URL}/bookings/`);
};

export const updateBooking = async (id, data) => {
  return await axios.put(`${BASE_URL}/bookings/${id}/update/`, data);
};

export const deleteBooking = async (id) => {
  return await axios.delete(`${BASE_URL}/bookings/${id}/delete/`);
};
