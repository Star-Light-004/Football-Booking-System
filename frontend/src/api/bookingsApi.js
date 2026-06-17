import axios from 'axios';
import { process.env.REACT_APP_API_URL } from '../config';
export const createBooking = async (bookingData) => {
  return await axios.post(`${process.env.REACT_APP_API_URL}/bookings/create/`, bookingData);
};

export const getBookings = async () => {
  return await axios.get(`${process.env.REACT_APP_API_URL}/bookings/`);
};

export const updateBooking = async (id, data) => {
  return await axios.put(`${process.env.REACT_APP_API_URL}/bookings/${id}/update/`, data);
};

export const deleteBooking = async (id) => {
  return await axios.delete(`${process.env.REACT_APP_API_URL}/bookings/${id}/delete/`);
};
