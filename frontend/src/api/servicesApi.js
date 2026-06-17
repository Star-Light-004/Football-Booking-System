import axiosClient from "./axiosClient";
import { BASE_URL } from '../config'; 

export const getServices = (params = {}) => {
    return axiosClient.get("/services/list/", { params });
};

export const createBookingService = (data) => {
    return axiosClient.post("/services/booking-services/add/", data);
};

export const getBookingServices = (bookingId) => {
    return axiosClient.get(`/services/booking-services/${bookingId}/`);
};
