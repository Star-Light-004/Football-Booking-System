import axios from 'axios';
import { BASE_URL } from '../config';
export const login = async (credentials) => {
  return await axios.post(`${BASE_URL}/users/login/`, credentials);
};

export const register = async (userData) => {
  return await axios.post(`${BASE_URL}/users/register/`, userData);
};

export const socialAuth = async (socialData) => {
  return await axios.post(`${BASE_URL}/users/social-auth/`, socialData);
};

export const checkUserExists = async (params) => {
  return await axios.get(`${BASE_URL}/users/check-exists/`, { params });
};
