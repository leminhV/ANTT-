const fs = require('fs');

const controllers = [
  'src/auth/auth.controller.ts',
  'src/bookings/bookings.controller.ts',
  'src/check-in/check-in.controller.ts',
  'src/comments/comments.controller.ts',
  'src/reports/reports.controller.ts'
];

for(const file of controllers) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/import \{ UserPayload \} from/g, 'import type { UserPayload } from');
  fs.writeFileSync(file, c);
}

let isAuthor = fs.readFileSync('src/comments/guards/is-author.guard.ts', 'utf8');
isAuthor = isAuthor.replace('request.params.id', 'request.params.id as string');
fs.writeFileSync('src/comments/guards/is-author.guard.ts', isAuthor);

let own = fs.readFileSync('src/common/utils/ownership.util.ts', 'utf8');
if (!own.includes('import { Role }')) {
  own = "import { Role } from '@prisma/client';\n" + own;
}
own = own.replace("const privilegedRoles = ['ADMIN', 'TECHNICIAN', 'INSTRUCTOR'];", "const privilegedRoles: Role[] = [Role.ADMIN, Role.TECHNICIAN, Role.INSTRUCTOR];");
fs.writeFileSync('src/common/utils/ownership.util.ts', own);
