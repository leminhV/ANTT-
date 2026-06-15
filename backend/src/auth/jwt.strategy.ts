import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: number; email: string; role: Role }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa');
    }

    if (!user.is_active) {
      throw new UnauthorizedException(
        `Tài khoản của bạn đã bị khóa. Lý do: ${user.blacklist_reason || 'Không xác định'}`,
      );
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
