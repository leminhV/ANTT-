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
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

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

    // -----------------------------------------------------------------------
    // 🛡️ BẢO MẬT: KIỂM TRA reCAPTCHA
    // -----------------------------------------------------------------------
    const recaptchaToken = (loginDto as any).recaptchaToken;
    if (recaptchaToken) {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Google Test Secret Key
      try {
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;
        const recaptchaRes = await fetch(verifyUrl, { method: 'POST' });
        const data = await recaptchaRes.json();
        if (!data.success || data.score < 0.5) {
          throw new ForbiddenException('Hành vi đáng ngờ. Vui lòng thử lại!');
        }
      } catch (err) {
        throw new ForbiddenException('Không thể xác thực reCAPTCHA');
      }
    }

    // -----------------------------------------------------------------------
    // 🛡️ BẢO MẬT: KIỂM TRA ACCOUNT LOCKOUT
    // -----------------------------------------------------------------------
    if (user.locked_until && user.locked_until > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.locked_until.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Tài khoản đã bị khóa do đăng nhập sai quá nhiều lần. Vui lòng thử lại sau ${remainingMinutes} phút.`,
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      await this.usersService.incrementFailedLogin(user.id);
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Reset attempts if successful
    if (user.failed_login_attempts > 0) {
      await this.usersService.resetFailedLogin(user.id);
    }

    // -----------------------------------------------------------------------
    // 🛡️ BẢO MẬT: KIỂM TRA XÁC THỰC 2 BƯỚC (MFA)
    // -----------------------------------------------------------------------
    if ((user as any).is_mfa_enabled) {
      return {
        requires_mfa: true,
        user_id: user.id, // Trả về ID tạm để Frontend dùng gọi API verify
      };
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
      // 🛡️ BẢO MẬT: PHÁT HIỆN TÁI SỬ DỤNG TOKEN (REUSE DETECTION)
      // Kẻ gian có thể đã dùng một token cũ đã hết hạn hoặc không khớp. Xóa toàn bộ token của người dùng này!
      await this.usersService.updateRefreshToken(userId, null);
      throw new ForbiddenException('Cảnh báo bảo mật: Phát hiện sử dụng lại Token cũ. Phiên đăng nhập đã bị vô hiệu hóa.');
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
        is_mfa_enabled: (user as any).is_mfa_enabled,
      },
    };
  }

  // -----------------------------------------------------------------------
  // 🛡️ MÔ ĐUN XÁC THỰC 2 BƯỚC (2FA / MFA)
  // -----------------------------------------------------------------------
  async generateMfaSecret(userId: number, email: string) {
    const user = await this.usersService.findById(userId);
    if (user?.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Chỉ Quản trị viên mới được phép sử dụng tính năng 2FA',
      );
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(email, 'LabBook System', secret);

    // Lưu tạm secret vào database (chưa enable)
    await this.usersService.updateMfaSecret(userId, secret);

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return {
      qrCodeDataUrl,
      secret,
    };
  }

  async verifyMfa(userId: number, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Người dùng không tồn tại');

    const secret = (user as any).mfa_secret;
    if (!secret) throw new BadRequestException('MFA chưa được thiết lập');

    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new UnauthorizedException('Mã xác thực 6 số không chính xác');
    }

    // Nếu chưa enable thì giờ enable
    if (!(user as any).is_mfa_enabled) {
      await this.usersService.enableMfa(userId);
    }

    // Đăng nhập thành công, trả về JWT Token
    return this.generateAuthResponse(user);
  }

  async disableMfa(userId: number) {
    return this.usersService.disableMfa(userId);
  }
}
