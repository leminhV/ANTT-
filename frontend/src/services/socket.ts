import { io, Socket } from 'socket.io-client';
import { apiClient } from './apiClient'; // for interceptors if needed
import { authService } from './auth.service';

let socket: Socket | null = null;

export const socketService = {
  connect: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    if (!socket) {
      // Connect to backend port (usually 3000 in NestJS)
      socket = io('http://localhost:3000', {
        auth: { token: `Bearer ${token}` },
        reconnection: true,
      });

      socket.on('connect_error', (err) => {
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error('Lỗi kết nối thời gian thực: ' + err.message);
        });
      });
    }
    return socket;
  },

  getSocket: () => socket,

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }
};
