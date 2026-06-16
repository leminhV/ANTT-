import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const socketService = {
  connect: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;

    if (!socket) {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      socket = io(socketUrl, {
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
