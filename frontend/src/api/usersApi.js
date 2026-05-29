import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

export const getUserProfile = async (userId) => {
  return await axios.get(`${BASE_URL}/users/profile/?user_id=${userId}`);
};

export const getUsers = async () => {
  return await axios.get(`${BASE_URL}/users/`);
};

export const createUser = async (data) => {
  return await axios.post(`${BASE_URL}/users/register/`, data);
};

export const updateUser = async (id, data) => {
  return await axios.put(`${BASE_URL}/users/${id}/update/`, data);
};

export const deleteUser = async (id) => {
  return await axios.delete(`${BASE_URL}/users/${id}/delete/`);
};
