import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Nếu lỗi là do HttpException ném ra (VD: BadRequest, Unauthorized...)
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : 'Lỗi máy chủ nội bộ (Internal Server Error)';

    // Ghi log lỗi vào file hoặc console (không gửi về client để giấu stack trace)
    if (!isHttpException) {
      console.error(
        `[CRITICAL ERROR] ${request.method} ${request.url}`,
        exception,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      // Ép kiểu message để trả về đúng định dạng, ẩn hoàn toàn stack trace nếu là lỗi 500
      message:
        typeof message === 'string'
          ? message
          : (message as Record<string, unknown>).message || message,
    });
  }
}
