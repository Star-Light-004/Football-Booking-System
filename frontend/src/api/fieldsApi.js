import axios from 'axios';
import { process.env.REACT_APP_API_URL } from '../config';


export const getFields = async (config = {}) => {
  return await axios.get(`${process.env.REACT_APP_API_URL}/football-fields/`, config);
};

export const getFieldDetail = async (id) => {
  return await axios.get(`${process.env.REACT_APP_API_URL}/football-fields/${id}/`);
};

export const createField = async (formData) => {
  return await axios.post(`${process.env.REACT_APP_API_URL}/football-fields/create/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
};

export const updateField = async (id, data) => {
  return await axios.put(`${process.env.REACT_APP_API_URL}/football-fields/${id}/update/`, data);
};

export const deleteField = async (id) => {
  return await axios.delete(`${process.env.REACT_APP_API_URL}/football-fields/${id}/delete/`);
};
