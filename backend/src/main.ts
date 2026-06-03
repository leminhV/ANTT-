import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ThrottlerExceptionFilter } from './common/filters/throttler-exception.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { HttpAdapterHost } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefix cho toàn bộ API
  app.setGlobalPrefix('api');

  // 2. Helmet: Kích hoạt các HTTP Security Headers (CSP, HSTS, X-Frame-Options...)
  // Giải thích: Ngăn chặn XSS (CSP), buộc dùng HTTPS (HSTS), chặn Clickjacking (X-Frame-Options)
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
        action: 'deny', // Chống Clickjacking triệt để
      },
    }),
  );

  // 3. CORS: Giới hạn danh sách trắng (Whitelist) chỉ cho Frontend truy cập
  // Giải thích: Không cho phép các Domain lạ nhúng URL của API này vào
  app.enableCors({
    origin: 'http://localhost:5173', // Chỉ cho phép domain frontend này truy cập
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // Cho phép truyền cookie nếu cần thiết
  });

  // 4. ValidationPipe: Ngăn chặn BOPLA và Mass Assignment
  // Giải thích: Lọc bỏ các thuộc tính rác, chặn ngay nếu có dữ liệu thừa
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ các field không có trong DTO
      forbidNonWhitelisted: true, // Ném lỗi 400 Bad Request nếu có field lạ
      transform: true, // Tự động ép kiểu dữ liệu (vd: param id dạng chuỗi thành số)
    }),
  );

  // 5. Global Exception Filter: Chuẩn hóa lỗi
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
