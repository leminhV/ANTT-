import { Role } from '@prisma/client';

export interface UserPayload {
  userId: number;
  email: string;
  role: Role;
}
