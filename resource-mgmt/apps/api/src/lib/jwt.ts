import { sign, verify, type Secret, type SignOptions } from 'jsonwebtoken';
import { InternalError } from './errors.js';

export type JwtRole = 'Admin' | 'Manager' | 'Contributor' | 'SuperAdmin';

export type UserJwtPayload = {
  sub: string; // userId (or 'super-admin')
  tenantId?: string;
  role: JwtRole;
};

function getJwtSecret(): Secret {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new InternalError('JWT_SECRET is not configured');
  }
  return secret;
}

export function signJwt(payload: UserJwtPayload, expiresIn: SignOptions['expiresIn'] = '8h'): string {
  return sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyJwt(token: string): UserJwtPayload {
  const decoded = verify(token, getJwtSecret());
  return decoded as UserJwtPayload;
}

