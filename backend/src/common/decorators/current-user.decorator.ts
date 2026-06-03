import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../../auth/interfaces/user-payload.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserPayload => {
    const request = ctx.switchToHttp().getRequest<import('express').Request>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (request as any).user as UserPayload;
  },
);
