import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { AuthUser } from './current-user.decorator';

/**
 * Route guard that allows only admin/reviewer accounts. Runs after the global
 * SupabaseJwtGuard, so req.user is already populated.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly roles: RolesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUser }>();
    const userId = request.user?.id;
    if (!userId || !(await this.roles.isAdmin(userId))) {
      throw new ForbiddenException('Chỉ quản trị viên mới được thực hiện thao tác này.');
    }
    return true;
  }
}
