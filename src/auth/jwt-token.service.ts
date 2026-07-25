import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';

export interface AppTokenClaims {
  sub: string;
  username: string | null;
  role: string;
}

/** Issues and verifies our own HS256 JWTs (no Supabase Auth involved). */
@Injectable()
export class JwtTokenService {
  private readonly secret: Uint8Array;
  private readonly expiresIn: string;

  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    this.secret = new TextEncoder().encode(secret);
    this.expiresIn = config.get<string>('JWT_EXPIRES_IN', '7d');
  }

  async sign(claims: AppTokenClaims): Promise<string> {
    return new SignJWT({ username: claims.username, role: claims.role })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(claims.sub)
      .setIssuedAt()
      .setExpirationTime(this.expiresIn)
      .sign(this.secret);
  }

  async verify(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, this.secret, {
      algorithms: ['HS256'],
    });
    return payload;
  }
}
