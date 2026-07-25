import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';

import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthUser } from './current-user.decorator';

/**
 * Verifies the Supabase-issued access token (ES256) locally against the
 * project's JWKS — no shared secret required. Attaches req.user on success.
 */
@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly jwks: JWTVerifyGetKey;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService,
  ) {
    const supabaseUrl = (config.get<string>('SUPABASE_URL') ?? '').replace(/\/$/, '');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is not configured');
    }
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.audience = config.get<string>('SUPABASE_JWT_AUDIENCE', 'authenticated');
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; user?: AuthUser }>();
    const header = request.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Thiếu bearer token');
    }

    const token = header.slice('Bearer '.length).trim();
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['ES256'],
      });
      request.user = {
        id: String(payload.sub),
        email: payload.email as string | undefined,
        role: payload.role as string | undefined,
        claims: payload as Record<string, unknown>,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
