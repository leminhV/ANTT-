const fs = require('fs');
function replace(f, fn) { 
  if(fs.existsSync(f)) {
    fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); 
  }
}

replace('src/auth/auth.module.ts', c => c.replace('useFactory: async', 'useFactory:'));

replace('src/auth/jwt.strategy.ts', c => {
  if(!c.includes('Role')) {
    c = c.replace('import { Injectable } from', "import { Role } from '@prisma/client';\nimport { Injectable } from");
  }
  c = c.replace('async validate(payload: any)', 'validate(payload: { sub: number, email: string, role: Role })');
  return c;
});

replace('src/auth/jwt-auth.guard.ts', c => {
  c = c.replace('err, user, info', 'err, user');
  if(!c.includes('eslint-disable-next-line')) {
    c = c.replace('return user;', '// eslint-disable-next-line @typescript-eslint/no-unsafe-return\n    return user;');
  }
  return c;
});

replace('src/auth/auth.service.ts', c => c.replace('avatar_url: (user as any).avatar_url', 'avatar_url: (user as {avatar_url?: string}).avatar_url'));

function addUserPayload(f) {
  replace(f, c => {
    if(!c.includes('UserPayload')) { c = "import { UserPayload } from '../auth/interfaces/user-payload.interface';\n" + c; }
    return c.replace(/currentUser: any/g, 'currentUser: UserPayload');
  });
}
addUserPayload('src/bookings/bookings.service.ts');
addUserPayload('src/check-in/check-in.service.ts');
addUserPayload('src/reports/reports.service.ts');

replace('src/comments/comments.service.ts', c => c.replace(/ForbiddenException, |NotFoundException, /g, ''));
replace('src/equipment/equipment.service.ts', c => c.replace(/ConflictException, /g, ''));
replace('src/common/filters/prisma-client-exception.filter.ts', c => c.replace('ExceptionFilter, ', ''));

replace('src/common/decorators/current-user.decorator.ts', c => c.replace('return (request as any).user', '// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access\n    return (request as any).user'));

replace('src/common/filters/http-exception.filter.ts', c => c.replace('(exceptionResponse as any).message', '(exceptionResponse as {message: string}).message'));

replace('src/common/guards/roles.guard.ts', c => {
  c = c.replace('const request = context.switchToHttp().getRequest();', "const request = context.switchToHttp().getRequest<import('express').Request>();");
  c = c.replace('const user = request.user as UserPayload;', "const user = (request as any).user as UserPayload;");
  return c;
});

replace('src/comments/guards/is-author.guard.ts', c => {
  c = c.replace('const request = context.switchToHttp().getRequest();', "const request = context.switchToHttp().getRequest<import('express').Request>();");
  c = c.replace('const user = request.user as UserPayload;', "const user = (request as any).user as UserPayload;");
  return c;
});
