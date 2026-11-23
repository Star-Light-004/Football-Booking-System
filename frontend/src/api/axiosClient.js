import axios from 'axios';
import { BASE_URL } from '../config';

const axiosClient = axios.create({
    baseURL: `${BASE_URL}`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Tự động gắn JWT Token và role của user hiện tại vào request headers để backend kiểm soát quyền
axiosClient.interceptors.request.use((config) => {
    try {
        const adminRaw = localStorage.getItem('admin_user');
        const userRaw = localStorage.getItem('user');
        const userObj = adminRaw ? JSON.parse(adminRaw) : (userRaw ? JSON.parse(userRaw) : null);

        // 1. Gắn JWT Token chuẩn Authorization: Bearer <token>
        const token =
            userObj?.token ||
            (adminRaw ? localStorage.getItem('admin_access_token') : null) ||
            localStorage.getItem('access_token');

        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }

        // 2. Gắn kèm role & id để tương thích ngược 100%
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

// Xử lý tự động dọn sạch token không hợp lệ khi server trả lỗi xác thực
axiosClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (
            error.response &&
            (error.response.status === 401 ||
                (error.response.status === 403 &&
                    typeof error.response.data?.detail === 'string' &&
                    error.response.data.detail.toLowerCase().includes('token')))
        ) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('admin_access_token');
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
