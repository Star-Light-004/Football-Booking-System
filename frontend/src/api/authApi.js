import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

export const login = async (credentials) => {
  return await axios.post(`${BASE_URL}/users/login/`, credentials);
};

export const register = async (userData) => {
  return await axios.post(`${BASE_URL}/users/register/`, userData);
};
