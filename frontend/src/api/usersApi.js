import axios from 'axios';
import { BASE_URL } from '../config';
export const getUserProfile = async (userId) => {
  return await axios.get(`${BASE_URL}/users/profile/?user_id=${userId}`);
};

export const getUsers = async () => {
  return await axios.get(`${BASE_URL}/users/`);
};

export const createUser = async (data) => {
  return await axios.post(`${BASE_URL}/users/register/`, data);
};

export const createGuestCustomer = async (data) => {
  return await axios.post(`${BASE_URL}/users/create-guest/`, data);
};

export const updateUser = async (id, data) => {
  return await axios.put(`${BASE_URL}/users/${id}/update/`, data);
};

export const toggleUserStatus = async (id) => {
  return await axios.patch(`${BASE_URL}/users/${id}/toggle-status/`);
};

export const deleteUser = async (id) => {
  return await axios.delete(`${BASE_URL}/users/${id}/delete/`);
};

export const getRolePermissions = async () => {
  return await axios.get(`${BASE_URL}/users/roles/permissions/`);
};

export const updateRolePermissions = async (data) => {
  return await axios.put(`${BASE_URL}/users/roles/permissions/`, data);
};

export const resetRolePermissions = async () => {
  return await axios.post(`${BASE_URL}/users/roles/permissions/reset/`);
};

