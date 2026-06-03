import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Thêm Access Token vào mọi Request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: {resolve: (value: string | null) => void, reject: (reason?: unknown) => void}[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Xử lý lỗi toàn cục
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Lỗi mạng (Network error / Server Down)
    if (!error.response) {
      toast.error('Mất kết nối máy chủ. Vui lòng kiểm tra mạng!');
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Bắt lỗi 401 (Access Token hết hạn) và gọi API cấp lại Token
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      const userStr = localStorage.getItem('user');

      if (!refreshToken || !userStr) {
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const user = JSON.parse(userStr);
        // Gọi thẳng axios gốc để không dính vào vòng lặp của apiClient
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          userId: user.id,
          refreshToken: refreshToken,
        });

        const { access_token, refresh_token: new_refresh_token } = response.data;
        
        // Cập nhật Token mới
        localStorage.setItem('token', access_token);
        localStorage.setItem('refresh_token', new_refresh_token);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return apiClient(originalRequest); // Gửi lại Request ban đầu bị fail
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Xử lý các lỗi khác
    if (status === 403) {
      toast.error('Bạn không có quyền thực hiện hành động này.');
    } else if (status === 409) {
      const msg = data.message || data.error || 'Tài nguyên đã bị thay đổi bởi một người dùng khác. Vui lòng tải lại dữ liệu.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } else if (status === 400 || status === 404) {
      const msg = data.message || data.error || 'Yêu cầu không hợp lệ.';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    } else if (status >= 500) {
      toast.error('Lỗi hệ thống nội bộ. Vui lòng thử lại sau.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
