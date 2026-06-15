import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: any;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...result } = (await this.authService.register(
      registerDto,
    )) as AuthResponse;
    this.setRefreshTokenCookie(res, refresh_token);
    return result;
  }

  // -----------------------------------------------------------------------
  // 🛡️ BẢO MẬT: CHỐNG BRUTE-FORCE ATTACK
  // -----------------------------------------------------------------------
  // Giải thích cho Đồ án: Sử dụng @Throttle để giới hạn số lần gọi API đăng nhập.
  // Nếu hacker dùng tool dò mật khẩu, hệ thống sẽ tự động khóa IP sau 5 lần sai
  // trong vòng 1 phút, giúp bảo vệ tài khoản người dùng an toàn tuyệt đối.
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...result } = (await this.authService.login(
      loginDto,
    )) as AuthResponse;
    this.setRefreshTokenCookie(res, refresh_token);
    return result;
  }

  // -----------------------------------------------------------------------
  // 🛡️ BẢO MẬT: KIẾN TRÚC DUAL JWT (Access Token & Refresh Token)
  // -----------------------------------------------------------------------
  // Giải thích cho Đồ án: Thay vì dùng 1 token sống mãi mãi (rất rủi ro nếu bị lộ),
  // hệ thống tách làm 2 loại:
  // 1. Access Token: Thời gian sống rất ngắn (vd 15 phút) dùng để xác thực API.
  // 2. Refresh Token: Thời gian sống dài (vd 7 ngày), dùng để xin lại Access Token mới.
  // Nhờ cơ chế này, kể cả khi hacker trộm được Access Token, chúng chỉ có thể
  // lợi dụng được trong tối đa 15 phút.
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @Body() body: { userId: number },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'] as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Không tìm thấy Refresh Token trong Cookie',
      );
    }
    const { refresh_token, ...result } = (await this.authService.refreshTokens(
      body.userId,
      refreshToken,
    )) as AuthResponse;
    this.setRefreshTokenCookie(res, refresh_token);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @CurrentUser() user: UserPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.clearCookie('refresh_token');
    return this.authService.logout(user.userId);
  }

  // -----------------------------------------------------------------------
  // 🛡️ API XÁC THỰC 2 BƯỚC (MFA)
  // -----------------------------------------------------------------------
  @UseGuards(JwtAuthGuard)
  @Post('mfa/generate')
  async generateMfaSecret(@CurrentUser() user: UserPayload) {
    return this.authService.generateMfaSecret(user.userId, user.email);
  }

  // API này dùng để Verify (Lúc login) và Kích hoạt (Lúc setup)
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(
    @Body() body: { userId: number; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result: any = await this.authService.verifyMfa(
      body.userId,
      body.code,
    );
    if (result.refresh_token) {
      this.setRefreshTokenCookie(res, result.refresh_token);
      delete result.refresh_token; // don't send back in body
    }
    return result;
  }

  // Hàm tiện ích để cài đặt HttpOnly Cookie
  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  async disableMfa(@CurrentUser() user: UserPayload) {
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException(
        'Chỉ Quản trị viên mới được phép tác động đến 2FA',
      );
    }
    await this.authService.disableMfa(user.userId);
    return { message: 'Đã tắt xác thực 2 bước thành công' };
  }
}
