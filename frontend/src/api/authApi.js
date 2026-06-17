import axios from 'axios';
import { BASE_URL } from '../config';
export const login = async (credentials) => {
  return await axios.post(`${BASE_URL}/users/login/`, credentials);
};

export const register = async (userData) => {
  return await axios.post(`${BASE_URL}/users/register/`, userData);
};
