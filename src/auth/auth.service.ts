import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { UserRole } from './entities/user-role.entity';
import { Customer } from '../customers/entities/customer.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { hashPassword, verifyPassword } from './password.util';
import { JwtTokenService } from './jwt-token.service';

export interface AuthResult {
  token: string;
  user: {
    id: string;
    username: string | null;
    display_name: string | null;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(UserRole)
    private readonly rolesRepo: Repository<UserRole>,
    private readonly tokens: JwtTokenService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const username = dto.username.trim().toLowerCase();

    const existing = await this.rolesRepo.findOne({ where: { username } });
    if (existing) {
      throw new BadRequestException('Tên đăng nhập đã tồn tại.');
    }

    const passwordHash = await hashPassword(dto.password);
    // Bootstrap: the first account that can actually log in (has a password_hash)
    // becomes an admin. Legacy seed rows with a NULL password_hash don't count,
    // so a fresh install can always mint its first real admin.
    const loginableCount = await this.rolesRepo
      .createQueryBuilder('r')
      .where('r.password_hash IS NOT NULL')
      .getCount();
    const role = loginableCount === 0 ? 'admin' : 'user';

    const created = await this.dataSource.transaction(async (manager) => {
      const customer = await manager.save(
        manager.create(Customer, {
          facebook_name: dto.displayName.trim(),
          status: 'active',
        }),
      );
      const userRole = await manager.save(
        manager.create(UserRole, {
          user_id: customer.id,
          username,
          display_name: dto.displayName.trim(),
          password_hash: passwordHash,
          role,
          is_active: true,
        }),
      );
      return { id: customer.id, role: userRole.role };
    });

    const token = await this.tokens.sign({
      sub: created.id,
      username,
      role: created.role,
    });

    return {
      token,
      user: {
        id: created.id,
        username,
        display_name: dto.displayName.trim(),
        role: created.role,
      },
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const username = dto.username.trim().toLowerCase();
    const row = await this.rolesRepo.findOne({ where: { username } });
    if (!row || !row.is_active) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu.');
    }

    const ok = await verifyPassword(dto.password, row.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Sai tên đăng nhập hoặc mật khẩu.');
    }

    const token = await this.tokens.sign({
      sub: row.user_id,
      username: row.username,
      role: row.role,
    });

    return {
      token,
      user: {
        id: row.user_id,
        username: row.username,
        display_name: row.display_name,
        role: row.role,
      },
    };
  }

  /** Profile for the authenticated user (shape mirrors the old getCurrentProfile). */
  async me(userId: string) {
    const row = await this.rolesRepo.findOne({ where: { user_id: userId } });
    if (!row) throw new NotFoundException('Không tìm thấy tài khoản.');
    return {
      id: row.user_id,
      user_id: row.user_id,
      username: row.username,
      display_name: row.display_name,
      role: row.role,
      is_active: row.is_active,
    };
  }
}
