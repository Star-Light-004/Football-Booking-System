import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:8000/api';

const timeslotsApi = {
  getAll: () => {
    return axios.get(`${BASE_URL}/timeslots/`);
  },
  getByField: (fieldId, date) => {
    return axios.get(`${BASE_URL}/timeslots/get-by-field/?field_id=${fieldId}&date=${date}`);
  },
  create: (data) => {
    return axios.post(`${BASE_URL}/timeslots/`, data);
  },
  update: (id, data) => {
    return axios.put(`${BASE_URL}/timeslots/${id}/`, data);
  },
  delete: (id) => {
    return axios.delete(`${BASE_URL}/timeslots/${id}/`);
  },
  generateSlots: (days = 30) => {
    return axios.post(`${BASE_URL}/timeslots/generate-slots/`, { days });
  },
  deleteAll: () => {
    return axios.delete(`${BASE_URL}/timeslots/delete-all/`);
  },
};

export default timeslotsApi;
