import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Role, User } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, name, role } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email đã tồn tại trong hệ thống');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
      role: role || Role.STUDENT,
    });

    return this.generateAuthResponse(user);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (!user.is_active) {
      const reason = user.blacklist_reason || 'Vi phạm nội quy hệ thống';
      throw new ForbiddenException(
        I18nContext.current()?.t('messages.errors.BLACKLISTED', {
          args: { reason },
        }) || `Tài khoản của bạn đã bị khóa. Lý do: ${reason}`,
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    return this.generateAuthResponse(user);
  }

  async logout(userId: number) {
    // Xóa refresh_token trong DB (Blacklist)
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Đăng xuất thành công' };
  }

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.refresh_token) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }

    // Kiểm tra Hash của Refresh Token
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refresh_token,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    }

    return this.generateAuthResponse(user);
  }

  private async generateAuthResponse(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // 1. Tạo Access Token (sống 15 phút do cấu hình ở AuthModule)
    const accessToken = this.jwtService.sign(payload);

    // 2. Tạo Refresh Token ngẫu nhiên (Opaque Token)
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // 3. Hash Refresh Token để lưu vào Database bảo mật
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      message: 'Thành công',
      access_token: accessToken,
      refresh_token: refreshToken, // Token này có hạn 7 ngày trên Frontend
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: (user as { avatar_url?: string }).avatar_url,
      },
    };
  }
}
