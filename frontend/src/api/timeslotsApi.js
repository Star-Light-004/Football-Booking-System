import axios from 'axios';
import { process.env.REACT_APP_API_URL } from '../config';


const timeslotsApi = {
  getAll: () => {
    return axios.get(`${process.env.REACT_APP_API_URL}/timeslots/`);
  },
  getByField: (fieldId, date) => {
    return axios.get(`${process.env.REACT_APP_API_URL}/timeslots/get-by-field/?field_id=${fieldId}&date=${date}`);
  },
  create: (data) => {
    return axios.post(`${process.env.REACT_APP_API_URL}/timeslots/`, data);
  },
  update: (id, data) => {
    return axios.put(`${process.env.REACT_APP_API_URL}/timeslots/${id}/`, data);
  },
  delete: (id) => {
    return axios.delete(`${process.env.REACT_APP_API_URL}/timeslots/${id}/`);
  },
  generateSlots: (days = 30) => {
    return axios.post(`${process.env.REACT_APP_API_URL}/timeslots/generate-slots/`, { days });
  },
  deleteAll: () => {
    return axios.delete(`${process.env.REACT_APP_API_URL}/timeslots/delete-all/`);
  },
};

export default timeslotsApi;
