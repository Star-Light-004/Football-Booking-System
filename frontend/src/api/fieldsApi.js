import axios from './axiosClient';
import { BASE_URL } from '../config';


export const getFields = async (config = {}) => {
  return await axios.get(`${BASE_URL}/football-fields/`, config);
};

export const getFieldDetail = async (id) => {
  return await axios.get(`${BASE_URL}/football-fields/${id}/`);
};

export const createField = async (formData) => {
  return await axios.post(`${BASE_URL}/football-fields/create/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

export const updateField = async (id, data) => {
  if (data instanceof FormData) {
    return await axios.put(`${BASE_URL}/football-fields/${id}/update/`, data, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
  }
  return await axios.put(`${BASE_URL}/football-fields/${id}/update/`, data);
};

export const deleteField = async (id) => {
  return await axios.delete(`${BASE_URL}/football-fields/${id}/delete/`);
};
