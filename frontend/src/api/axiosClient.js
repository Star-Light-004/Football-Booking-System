import axios from 'axios';
import { BASE_URL } from '../config';
import apiCache from '../utils/apiCache';

const axiosClient = axios.create({
    baseURL: `${BASE_URL}`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Các endpoint được lưu cache trong bộ nhớ RAM để chuyển trang tức thì (0ms)
const CACHEABLE_ENDPOINTS = [
    '/football-fields/',
    '/bookings/',
    '/services/',
    '/vouchers/',
    '/users/',
    '/tournament-requests/',
    '/cleaning/',
    '/maintenance/',
];

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

        // 3. SWR Cache cho các request GET
        const method = (config.method || 'get').toLowerCase();
        const isSkipCache = Boolean(config.skipCache || config.headers?.['X-Skip-Cache']);

        if (method === 'get' && !isSkipCache) {
            const url = config.url || '';
            const isCacheable = CACHEABLE_ENDPOINTS.some(ep => url.includes(ep)) || config.useCache;
            if (isCacheable) {
                const cacheKey = apiCache.generateKey(url, config.params);
                const cached = apiCache.get(cacheKey);
                if (cached && !cached.isStale) {
                    config.adapter = () => Promise.resolve({
                        data: cached.data,
                        status: 200,
                        statusText: 'OK',
                        headers: {},
                        config,
                        request: {},
                        fromCache: true,
                    });
                }
            }
        }
    } catch (e) {
        // bỏ qua nếu parse lỗi
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Xử lý lưu cache và tự động dọn sạch token không hợp lệ khi server trả lỗi xác thực
axiosClient.interceptors.response.use(
    (response) => {
        try {
            const method = (response.config?.method || 'get').toLowerCase();
            const url = response.config?.url || '';

            if (method === 'get' && response.status === 200 && !response.fromCache) {
                const isCacheable = CACHEABLE_ENDPOINTS.some(ep => url.includes(ep)) || response.config?.useCache;
                if (isCacheable) {
                    const cacheKey = apiCache.generateKey(url, response.config?.params);
                    apiCache.set(cacheKey, response.data);
                }
            } else if (['post', 'put', 'patch', 'delete'].includes(method)) {
                // Tự động xóa cache khi có thay đổi dữ liệu
                if (url.includes('/bookings')) {
                    apiCache.invalidate('/bookings');
                    apiCache.invalidate('/tournament');
                } else if (url.includes('/football-fields')) {
                    apiCache.invalidate('/football-fields');
                } else if (url.includes('/services')) {
                    apiCache.invalidate('/services');
                } else {
                    apiCache.clear();
                }
            }
        } catch (e) {
            // bỏ qua
        }
        return response;
    },
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
