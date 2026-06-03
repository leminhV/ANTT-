import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:5173', // Frontend URL
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth.token || client.handshake.headers.authorization;
      if (!auth) {
        throw new WsException('Unauthorized: No token provided');
      }

      const token = auth.replace('Bearer ', '');
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret });

      // Attach user payload to the socket
      client.data.user = payload;

      // Join a room specific to this user to allow targeted notifications
      client.join(`user_${payload.sub}`);
      
      this.logger.log(`Client connected successfully: ${client.id} (User ID: ${payload.sub})`);
    } catch (error) {
      this.logger.warn(`Connection rejected: ${client.id} - ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Public method for other services (like BookingsService) to call
  sendNotificationToUser(userId: number, title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    this.server.to(`user_${userId}`).emit('notification', {
      title,
      message,
      type,
      timestamp: new Date(),
    });
    this.logger.log(`Sent notification to user_${userId}: [${type}] ${title}`);
  }
}
