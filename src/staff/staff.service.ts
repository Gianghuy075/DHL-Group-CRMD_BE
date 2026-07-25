import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '../auth/entities/user-role.entity';
import { RolesService } from '../auth/roles.service';
import { hashPassword } from '../auth/password.util';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetActiveDto } from './dto/set-active.dto';

// Self-managed replacement for the old Supabase `manage-staff` edge function.
// Admins create/edit/lock reviewer accounts; reviewers log in with the same
// username+password JWT flow as everyone else (no Supabase Auth, no email).
@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(UserRole)
    private readonly rolesRepo: Repository<UserRole>,
    private readonly roles: RolesService,
  ) {}

  async list(actorId: string) {
    await this.assertAdmin(actorId);
    const rows = await this.rolesRepo.find({
      where: [{ role: 'admin' }, { role: 'reviewer' }],
      order: { created_at: 'ASC' },
    });
    const staff = rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      isActive: row.is_active,
    }));
    return { staff };
  }

  async create(actorId: string, dto: CreateStaffDto) {
    await this.assertAdmin(actorId);
    const username = dto.username.trim().toLowerCase();
    if (await this.rolesRepo.findOne({ where: { username } })) {
      throw new BadRequestException('Username đã được sử dụng.');
    }

    const passwordHash = await hashPassword(dto.password);
    const row = await this.rolesRepo.save(
      this.rolesRepo.create({
        user_id: randomUUID(),
        username,
        display_name: dto.displayName.trim(),
        password_hash: passwordHash,
        role: 'reviewer',
        is_active: true,
      }),
    );
    return { userId: row.user_id };
  }

  async update(actorId: string, userId: string, dto: UpdateStaffDto) {
    await this.assertAdmin(actorId);
    const row = await this.getReviewer(userId);
    const username = dto.username.trim().toLowerCase();
    const duplicate = await this.rolesRepo.findOne({ where: { username } });
    if (duplicate && duplicate.user_id !== userId) {
      throw new BadRequestException('Username đã được sử dụng.');
    }

    row.username = username;
    row.display_name = dto.displayName.trim();
    await this.rolesRepo.save(row);
    return { ok: true };
  }

  async resetPassword(actorId: string, userId: string, dto: ResetPasswordDto) {
    await this.assertAdmin(actorId);
    const row = await this.getReviewer(userId);
    row.password_hash = await hashPassword(dto.password);
    await this.rolesRepo.save(row);
    return { ok: true };
  }

  async setActive(actorId: string, userId: string, dto: SetActiveDto) {
    await this.assertAdmin(actorId);
    const row = await this.getReviewer(userId);
    row.is_active = dto.isActive;
    await this.rolesRepo.save(row);
    return { ok: true };
  }

  async remove(actorId: string, userId: string) {
    await this.assertAdmin(actorId);
    await this.getReviewer(userId);
    await this.rolesRepo.delete({ user_id: userId });
    return { ok: true };
  }

  private async assertAdmin(actorId: string) {
    if ((await this.roles.getRole(actorId)) !== 'admin') {
      throw new ForbiddenException('Chỉ admin được quản lý nhân viên.');
    }
  }

  /** Loads a row and guards that these endpoints only touch reviewer accounts. */
  private async getReviewer(userId: string): Promise<UserRole> {
    const row = await this.rolesRepo.findOne({ where: { user_id: userId } });
    if (!row || row.role !== 'reviewer') {
      throw new BadRequestException(
        'Chỉ có thể thao tác trên tài khoản nhân viên kiểm duyệt.',
      );
    }
    return row;
  }
}
