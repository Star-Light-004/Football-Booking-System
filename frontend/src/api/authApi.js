import axios from 'axios';
import { process.env.REACT_APP_API_URL } from '../config';
export const login = async (credentials) => {
  return await axios.post(`${process.env.REACT_APP_API_URL}/users/login/`, credentials);
};

export const register = async (userData) => {
  return await axios.post(`${process.env.REACT_APP_API_URL}/users/register/`, userData);
};
