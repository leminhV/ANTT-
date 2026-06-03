import apiClient from './apiClient';

export const authService = {
  register: (data: { email: string; password: string; fullName: string; code?: string }) =>
    apiClient.post('/api/auth/register', { email: data.email, password: data.password, name: data.fullName }),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/api/auth/login', data),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  saveToken: (token: string) => {
    localStorage.setItem('token', token);
  },

  getToken: () => localStorage.getItem('token'),

  isAuthenticated: () => !!localStorage.getItem('token'),
};

export const userService = {
  create: (data: { email: string; password: string; fullName: string; code?: string; role?: string }) =>
    apiClient.post('/api/users', { email: data.email, password: data.password, name: data.fullName, role: data.role }),

  getAll: () => apiClient.get('/api/users'),

  getOne: (id: string) => apiClient.get(`/api/users/${id}`),

  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/api/users/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/users/${id}`),
};

export const roomService = {
  create: (data: { name: string; location: string; capacity: number; has_air_conditioner: boolean }) =>
    apiClient.post('/api/rooms', data),

  getAll: () => apiClient.get('/api/rooms'),

  getOne: (id: string) => apiClient.get(`/api/rooms/${id}`),

  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/api/rooms/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/rooms/${id}`),
};

export const equipmentService = {
  create: (data: { name: string; serial_number: string; status?: string; room_id: number }) =>
    apiClient.post('/api/equipment', data),

  getAll: () => apiClient.get('/api/equipment'),

  getByRoom: (roomId: string) => apiClient.get(`/api/equipment?roomId=${roomId}`),

  getOne: (id: string) => apiClient.get(`/api/equipment/${id}`),

  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/api/equipment/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/equipment/${id}`),
};

export const bookingService = {
  create: (data: { roomId: string | number; startTime: Date; endTime: Date; purpose: string }) =>
    apiClient.post('/api/bookings', {
      room_id: Number(data.roomId),
      start_time: data.startTime.toISOString(),
      end_time: data.endTime.toISOString(),
      purpose: data.purpose,
    }),

  getAll: () => apiClient.get('/api/bookings'),

  getOne: (id: string) => apiClient.get(`/api/bookings/${id}`),

  getMyBookings: () => apiClient.get('/api/bookings/user/my-bookings'),

  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/api/bookings/${id}`, data),

  cancel: (id: string) => apiClient.post(`/api/bookings/${id}/cancel`),

  delete: (id: string) => apiClient.delete(`/api/bookings/${id}`),
};

export const chemicalService = {
  create: (data: Record<string, unknown>) =>
    apiClient.post('/api/chemicals', data),

  getAll: () => apiClient.get('/api/chemicals'),

  getOne: (id: string) => apiClient.get(`/api/chemicals/${id}`),

  recordUsage: (data: { chemicalId: string; amountUsed: number; bookingId?: string }) =>
    apiClient.post('/api/chemicals/usage/record', data),

  getUsageHistory: (chemicalId?: string) =>
    apiClient.get(`/api/chemicals/history/usage${chemicalId ? `?chemicalId=${chemicalId}` : ''}`),

  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/api/chemicals/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/chemicals/${id}`),
};

export const reportService = {
  create: (data: { title: string; description: string; equipment_id?: number; room_id?: number }) =>
    apiClient.post('/api/reports', data),

  getAll: () => apiClient.get('/api/reports'),

  getOne: (id: string) => apiClient.get(`/api/reports/${id}`),

  getMyReports: () => apiClient.get('/api/reports/user/my-reports'),

  getStatistics: () => apiClient.get('/api/reports/statistics/overview'),

  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/api/reports/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/reports/${id}`),
};

export const commentService = {
  getAll: (reportId?: number, bookingId?: number, equipmentId?: number) => {
    const params = new URLSearchParams();
    if (reportId) params.append('reportId', reportId.toString());
    if (bookingId) params.append('bookingId', bookingId.toString());
    if (equipmentId) params.append('equipmentId', equipmentId.toString());
    return apiClient.get(`/api/comments?${params.toString()}`);
  },
  create: (data: { content: string; reportId?: number; bookingId?: number; equipmentId?: number; parentId?: number }) => 
    apiClient.post('/api/comments', data),
  delete: (id: number) => apiClient.delete(`/api/comments/${id}`)
};

export const courseService = {
  getAll: () => apiClient.get('/api/courses'),

  getOne: (id: string) => apiClient.get(`/api/courses/${id}`),

  create: (data: Record<string, unknown>) => apiClient.post('/api/courses', data),

  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/api/courses/${id}`, data),

  delete: (id: string) => apiClient.delete(`/api/courses/${id}`),
};

export const checkInService = {
  checkIn: (data: { equipmentId: string }) => apiClient.post('/api/check-in', { equipment_id: Number(data.equipmentId) }),

  checkOut: (recordId: string) => apiClient.post(`/api/check-in/${recordId}/check-out`),

  getActive: () => apiClient.get('/api/check-in/active/records'),

  getHistory: () => apiClient.get('/api/check-in/history/user'),

  getAll: () => apiClient.get('/api/check-in'),
};
