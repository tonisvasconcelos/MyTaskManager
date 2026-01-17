import jwt from 'jsonwebtoken';
import { InternalError } from './errors.js';

export type JwtRole = 'Admin' | 'Manager' | 'Contributor' | 'SuperAdmin';

export type UserJwtPayload = {
  sub: string; // userId (or 'super-admin')
  tenantId?: string;
  role: JwtRole;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new InternalError('JWT_SECRET is not configured');
  }
  return secret;
}

export function signJwt(payload: UserJwtPayload, expiresIn: string = '8h'): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyJwt(token: string): UserJwtPayload {
  const decoded = jwt.verify(token, getJwtSecret());
  return decoded as UserJwtPayload;
}

