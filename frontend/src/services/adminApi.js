import axios from "axios";
import { BASE_URL } from '../config';
const API_URL = "${BASE_URL}";

export const getFootballFields = async () => {
    return axios.get(`${API_URL}/football-fields/`);
};