import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthUser } from './current-user.decorator';
import { JwtTokenService } from './jwt-token.service';

/**
 * Verifies our self-issued HS256 JWT and attaches req.user. Routes marked
 * @Public() skip verification.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: JwtTokenService,
  ) {}

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
      const payload = await this.tokens.verify(token);
      request.user = {
        id: String(payload.sub),
        role: payload.role as string | undefined,
        claims: payload as Record<string, unknown>,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
