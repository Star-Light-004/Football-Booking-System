import axios from 'axios';
import { BASE_URL } from '../config';

export const createTournamentRequest = async (data) => {
  return await axios.post(`${BASE_URL}/bookings/tournaments/request/`, data);
};

export const getTournamentRequests = async (params = {}) => {
  return await axios.get(`${BASE_URL}/bookings/tournaments/requests/`, { params });
};

export const getTournamentRequestById = async (id) => {
  return await axios.get(`${BASE_URL}/bookings/tournaments/requests/${id}/`);
};

export const updateTournamentRequest = async (id, data) => {
  return await axios.put(`${BASE_URL}/bookings/tournaments/requests/${id}/`, data);
};

export const cancelTournamentRequest = async (id, reason = "") => {
  return await axios.post(`${BASE_URL}/bookings/tournaments/requests/${id}/cancel/`, { reason });
};

export const deleteTournamentRequest = async (id) => {
  return await axios.delete(`${BASE_URL}/bookings/tournaments/requests/${id}/delete/`);
};
