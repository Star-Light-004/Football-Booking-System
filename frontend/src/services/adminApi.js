import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api";

export const getFootballFields = async () => {
    return axios.get(`${API_URL}/football-fields/`);
};