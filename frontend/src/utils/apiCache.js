/**
 * In-memory & Persistent (sessionStorage) API Cache with SWR (Stale-While-Revalidate).
 * - Lưu tạm dữ liệu trong RAM và sessionStorage: Ngay cả khi F5 (Reload trang),
 *   dữ liệu vẫn hiển thị NGAY LẬP TỨC (0ms) mà không bị vòng xoay "Đang tải dữ liệu...".
 * - Tự động dọn dẹp cache khi có thao tác Thêm / Sửa / Xóa.
 */

class ApiCache {
  constructor(defaultTTL = 60000) { // 1 phút
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  generateKey(url, params = {}) {
    const cleanUrl = (url || '').split('?')[0];
    const queryParams = { ...(params || {}) };
    
    if ((url || '').includes('?')) {
      const qs = url.split('?')[1];
      const searchParams = new URLSearchParams(qs);
      for (const [key, val] of searchParams.entries()) {
        queryParams[key] = val;
      }
    }

    const sortedKeys = Object.keys(queryParams).sort();
    const sortedObj = {};
    for (const k of sortedKeys) {
      sortedObj[k] = queryParams[k];
    }
    return `${cleanUrl}:${JSON.stringify(sortedObj)}`;
  }

  get(key) {
    // 1. Lấy từ RAM
    let entry = this.cache.get(key);

    // 2. Nếu RAM chưa có (ví dụ vừa F5 tải lại trang), lấy từ sessionStorage
    if (!entry && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const raw = sessionStorage.getItem(`fb_cache_${key}`);
        if (raw) {
          entry = JSON.parse(raw);
          this.cache.set(key, entry);
        }
      } catch (e) {}
    }

    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    return {
      data: entry.data,
      isStale: isExpired,
      timestamp: entry.timestamp,
    };
  }

  set(key, data, ttl = this.defaultTTL) {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    this.cache.set(key, entry);

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        sessionStorage.setItem(`fb_cache_${key}`, JSON.stringify(entry));
      } catch (e) {}
    }
  }

  invalidate(pattern) {
    if (!pattern) {
      this.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try { sessionStorage.removeItem(`fb_cache_${key}`); } catch (e) {}
        }
      }
    }
  }

  clear() {
    this.cache.clear();
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('fb_cache_')) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (e) {}
    }
  }
}

export const apiCache = new ApiCache(60000);
export default apiCache;
