import axios from "axios";
import { process.env.REACT_APP_API_URL } from '../config';
const API_URL = "${process.env.REACT_APP_API_URL}";

export const getFootballFields = async () => {
    return axios.get(`${API_URL}/football-fields/`);
};