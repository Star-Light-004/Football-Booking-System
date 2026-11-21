import axios from './axiosClient';
import { BASE_URL } from '../config';

const FACILITY_URL = `${BASE_URL}/facility`;

/* ── 1. VỆ SINH SÂN (Cleaning Logs & Status) ── */
export const getCleaningLogs = async (params = {}) => {
  return await axios.get(`${FACILITY_URL}/cleaning/`, { params });
};

export const createCleaningLog = async (data) => {
  return await axios.post(`${FACILITY_URL}/cleaning/`, data);
};

export const updateCleaningLog = async (id, data) => {
  return await axios.patch(`${FACILITY_URL}/cleaning/${id}/`, data);
};

export const deleteCleaningLog = async (id) => {
  return await axios.delete(`${FACILITY_URL}/cleaning/${id}/`);
};


/* ── 2. BẢO TRÌ SÂN & THIẾT BỊ (Maintenance Issues) ── */
export const getMaintenanceIssues = async (params = {}) => {
  return await axios.get(`${FACILITY_URL}/maintenance/`, { params });
};

export const createMaintenanceIssue = async (data) => {
  return await axios.post(`${FACILITY_URL}/maintenance/`, data);
};

export const updateMaintenanceIssue = async (id, data) => {
  return await axios.patch(`${FACILITY_URL}/maintenance/${id}/`, data);
};

export const updateMaintenanceStatus = async (id, status, cost = null, estimatedCost = null) => {
  return await axios.patch(`${FACILITY_URL}/maintenance/${id}/update_status/`, { 
    status, 
    cost, 
    estimated_cost: estimatedCost,
    estimatedCost 
  });
};

export const deleteMaintenanceIssue = async (id) => {
  return await axios.delete(`${FACILITY_URL}/maintenance/${id}/`);
};

export const getMaintenanceSummary = async (params = {}) => {
  return await axios.get(`${FACILITY_URL}/maintenance/summary/`, { params });
};


/* ── 3. ĐỒ KHÁCH BỎ QUÊN (Lost & Found) ── */
export const getLostFoundItems = async (params = {}) => {
  return await axios.get(`${FACILITY_URL}/lost-found/`, { params });
};

export const createLostFoundItem = async (data) => {
  return await axios.post(`${FACILITY_URL}/lost-found/`, data);
};

export const updateLostFoundItem = async (id, data) => {
  return await axios.patch(`${FACILITY_URL}/lost-found/${id}/`, data);
};

export const deleteLostFoundItem = async (id) => {
  return await axios.delete(`${FACILITY_URL}/lost-found/${id}/`);
};

export const toggleLostFoundStatus = async (id, status = null, returnNote = '') => {
  return await axios.post(`${FACILITY_URL}/lost-found/${id}/toggle_status/`, { status, returnNote });
};

