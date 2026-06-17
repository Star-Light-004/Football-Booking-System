import axios from 'axios';
import { process.env.REACT_APP_API_URL } from '../config';
export const getUserProfile = async (userId) => {
  return await axios.get(`${process.env.REACT_APP_API_URL}/users/profile/?user_id=${userId}`);
};

export const getUsers = async () => {
  return await axios.get(`${process.env.REACT_APP_API_URL}/users/`);
};

export const createUser = async (data) => {
  return await axios.post(`${process.env.REACT_APP_API_URL}/users/register/`, data);
};

export const updateUser = async (id, data) => {
  return await axios.put(`${process.env.REACT_APP_API_URL}/users/${id}/update/`, data);
};

export const deleteUser = async (id) => {
  return await axios.delete(`${process.env.REACT_APP_API_URL}/users/${id}/delete/`);
};
