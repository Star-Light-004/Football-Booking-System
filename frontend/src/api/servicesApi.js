import axios from "axios";
import { BASE_URL } from '../config';

export const getServices = (params = {}) => {
    return axios.get(`${BASE_URL}/services/list/`, { params });
};

export const createBookingService = (data) => {
    return axios.post(`${BASE_URL}/services/booking-services/add/`, data);
};

export const getBookingServices = (bookingId) => {
    return axios.get(`${BASE_URL}/services/booking-services/${bookingId}/`);
};
