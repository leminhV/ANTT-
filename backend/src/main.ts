import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { XssSanitizerPipe } from './common/pipes/xss-sanitizer.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 1. Prefix cho toàn bộ API
  app.setGlobalPrefix('api');

  // Khởi tạo cookie-parser để đọc HttpOnly cookies
  app.use(cookieParser());

  // -----------------------------------------------------------------------
  // 🛡️ BẢO MẬT: CHỐNG LỖ HỔNG XSS VÀ CLICKJACKING
  // -----------------------------------------------------------------------
  // Giải thích cho Đồ án: Sử dụng Helmet để gắn các HTTP Security Headers.
  // - Content-Security-Policy (CSP): Ngăn chặn mã độc XSS chạy ngầm.
  // - X-Frame-Options (DENY): Không cho phép trang web khác nhúng iframe hệ thống này
  // (Chống Clickjacking).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 năm
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
    }),
  );

  // 3. CORS: Giới hạn danh sách trắng (Whitelist) chỉ cho Frontend truy cập
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // -----------------------------------------------------------------------
  // 🛡️ BẢO MẬT: CHỐNG MASS ASSIGNMENT (BOPLA)
  // -----------------------------------------------------------------------
  // Giải thích cho Đồ án: ValidationPipe được thiết lập Global.
  // - whitelist: Tự động vứt bỏ các dữ liệu rác hacker cố ý nhét vào Body.
  // - forbidNonWhitelisted: Trả về lỗi 400 ngay lập tức nếu phát hiện trường lạ.
  // Giúp chặn đứng hành vi chèn thêm trường 'role: ADMIN' để chiếm quyền.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5. Global XSS Sanitizer Pipe: Lọc mã độc HTML ở tầng sâu nhất
  app.useGlobalPipes(new XssSanitizerPipe());

  // 6. Global Exception Filter: Chuẩn hóa lỗi
  // Giải thích: Ẩn Stack Trace hệ thống (như lỗi truy vấn DB) không cho Hacker thấy
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(
    new GlobalExceptionFilter(),
    new ThrottlerExceptionFilter(), // Thêm bộ lọc lỗi Rate Limit (Hiển thị tiếng Việt)
    new PrismaClientExceptionFilter(httpAdapter.httpAdapter),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((err) => console.error(err));
