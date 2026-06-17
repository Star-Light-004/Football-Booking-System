import axios from 'axios';
import { process.env.REACT_APP_API_URL } from '../config';
const axiosClient = axios.create({
    baseURL: '${process.env.REACT_APP_API_URL}',
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosClient;
