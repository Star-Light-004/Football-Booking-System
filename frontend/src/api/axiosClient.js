import axios from 'axios';
import { BASE_URL } from '../config';

const axiosClient = axios.create({
    baseURL: `${BASE_URL}`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tự động gắn role của user hiện tại vào request headers để backend kiểm soát quyền
axiosClient.interceptors.request.use((config) => {
    try {
        const adminRaw = localStorage.getItem('admin_user');
        const userRaw = localStorage.getItem('user');
        const userObj = adminRaw ? JSON.parse(adminRaw) : (userRaw ? JSON.parse(userRaw) : null);

        if (userObj?.role) {
            config.headers['X-User-Role'] = userObj.role;
        }
        if (userObj?.id) {
            config.headers['X-User-Id'] = userObj.id;
        }
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
    } catch (e) {
        // bỏ qua nếu parse lỗi
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default axiosClient;
