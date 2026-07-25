import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from './entities/user-role.entity';

const ADMIN_ROLES = new Set(['admin', 'reviewer']);

/** Resolves the app-level role for a Supabase auth user_id (customers.id === auth uid). */
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(UserRole)
    private readonly repo: Repository<UserRole>,
  ) {}

  async getRole(userId: string): Promise<string | null> {
    const row = await this.repo.findOne({
      where: { user_id: userId, is_active: true },
    });
    return row?.role ?? null;
  }

  async isAdmin(userId: string): Promise<boolean> {
    return ADMIN_ROLES.has((await this.getRole(userId)) ?? '');
  }
}
